import { Job } from "@prisma/client";
import { prisma } from "../config/prisma";
import { Recurrence } from "../types/enums";

const MAX_OCCURRENCES = 104; // safety cap (~2 years of weekly jobs)

function addInterval(date: Date, recurrence: Recurrence): Date {
  const next = new Date(date);
  switch (recurrence) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      break;
  }
  return next;
}

/**
 * Given a freshly-created recurring job, generates the future occurrences as
 * separate Job rows (each linked back via parentJobId) up to recurrenceEndDate
 * or MAX_OCCURRENCES, whichever comes first.
 */
export async function generateRecurringOccurrences(job: Job): Promise<number> {
  const recurrence = job.recurrence as Recurrence;
  if (recurrence === "NONE") return 0;

  const durationMs = job.scheduledEnd.getTime() - job.scheduledStart.getTime();
  const occurrences: Array<{ start: Date; end: Date }> = [];

  let cursorStart = addInterval(job.scheduledStart, recurrence);
  let count = 0;
  while (count < MAX_OCCURRENCES) {
    if (job.recurrenceEndDate && cursorStart > job.recurrenceEndDate) break;
    occurrences.push({ start: cursorStart, end: new Date(cursorStart.getTime() + durationMs) });
    cursorStart = addInterval(cursorStart, recurrence);
    count++;
    // Without an end date, cap generation to a reasonable rolling horizon (1 year).
    if (!job.recurrenceEndDate) {
      const oneYearOut = new Date(job.scheduledStart);
      oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
      if (cursorStart > oneYearOut) break;
    }
  }

  if (occurrences.length === 0) return 0;

  await prisma.$transaction(
    occurrences.map(({ start, end }) =>
      prisma.job.create({
        data: {
          title: job.title,
          description: job.description,
          clientId: job.clientId,
          propertyId: job.propertyId,
          serviceTypeId: job.serviceTypeId,
          status: "SCHEDULED",
          priority: job.priority,
          recurrence: "NONE", // children are single occurrences; the parent owns the pattern
          parentJobId: job.id,
          scheduledStart: start,
          scheduledEnd: end,
          price: job.price,
          createdById: job.createdById,
        },
      })
    )
  );

  return occurrences.length;
}
