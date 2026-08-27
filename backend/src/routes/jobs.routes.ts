import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../utils/errors";
import { generateRecurringOccurrences } from "../services/recurrence";

export const jobRouter = Router();
jobRouter.use(requireAuth);

const jobInclude = {
  client: { select: { id: true, name: true } },
  property: { select: { id: true, name: true, addressLine1: true, city: true } },
  serviceType: true,
  assignments: { include: { user: { select: { id: true, name: true } } } },
  checklistItems: { orderBy: { sortOrder: "asc" as const } },
  _count: { select: { timeEntries: true, inventoryUsages: true, inspections: true } },
};

jobRouter.get("/", async (req, res) => {
  const { status, clientId, propertyId, userId, from, to } = req.query as Record<string, string | undefined>;
  const jobs = await prisma.job.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(clientId ? { clientId } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(userId ? { assignments: { some: { userId } } } : {}),
      ...(from || to
        ? {
            scheduledStart: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: jobInclude,
    orderBy: { scheduledStart: "asc" },
  });
  res.json(jobs);
});

jobRouter.get("/:id", async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: {
      ...jobInclude,
      timeEntries: { include: { user: { select: { id: true, name: true } } }, orderBy: { clockIn: "desc" } },
      inventoryUsages: { include: { inventoryItem: true } },
      inspections: { include: { items: true, inspector: { select: { id: true, name: true } } } },
      childJobs: { select: { id: true, scheduledStart: true, status: true }, orderBy: { scheduledStart: "asc" } },
    },
  });
  if (!job) throw ApiError.notFound("Job not found");
  res.json(job);
});

const jobSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().min(1),
  propertyId: z.string().min(1),
  serviceTypeId: z.string().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("NONE"),
  recurrenceEndDate: z.string().datetime().optional(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  price: z.number().nonnegative().default(0),
  assignedUserIds: z.array(z.string()).optional(),
  checklist: z.array(z.string()).optional(),
});

jobRouter.post("/", requireRole("ADMIN", "MANAGER"), validate(jobSchema), async (req, res) => {
  const data = req.body as z.infer<typeof jobSchema>;
  if (new Date(data.scheduledEnd) <= new Date(data.scheduledStart)) {
    throw ApiError.badRequest("scheduledEnd must be after scheduledStart");
  }

  const job = await prisma.job.create({
    data: {
      title: data.title,
      description: data.description,
      clientId: data.clientId,
      propertyId: data.propertyId,
      serviceTypeId: data.serviceTypeId,
      status: data.status ?? "SCHEDULED",
      priority: data.priority,
      recurrence: data.recurrence,
      recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
      scheduledStart: new Date(data.scheduledStart),
      scheduledEnd: new Date(data.scheduledEnd),
      price: data.price,
      createdById: req.user!.id,
      assignments: data.assignedUserIds
        ? { create: data.assignedUserIds.map((userId, i) => ({ userId, isLead: i === 0 })) }
        : undefined,
      checklistItems: data.checklist
        ? { create: data.checklist.map((description, i) => ({ description, sortOrder: i })) }
        : undefined,
    },
    include: jobInclude,
  });

  const occurrencesCreated = await generateRecurringOccurrences(job);
  res.status(201).json({ ...job, occurrencesCreated });
});

jobRouter.put(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  validate(
    jobSchema.omit({ assignedUserIds: true, checklist: true }).partial()
  ),
  async (req, res) => {
    const data = req.body as Partial<z.infer<typeof jobSchema>>;
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        ...data,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : undefined,
      },
      include: jobInclude,
    });
    res.json(job);
  }
);

const statusSchema = z.object({ status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });

jobRouter.patch("/:id/status", validate(statusSchema), async (req, res) => {
  const { status } = req.body as z.infer<typeof statusSchema>;
  const now = new Date();
  const job = await prisma.job.update({
    where: { id: req.params.id },
    data: {
      status,
      actualStart: status === "IN_PROGRESS" ? now : undefined,
      actualEnd: status === "COMPLETED" ? now : undefined,
    },
    include: jobInclude,
  });
  res.json(job);
});

jobRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.job.update({ where: { id: req.params.id }, data: { status: "CANCELLED" } });
  res.status(204).send();
});

// ---- Assignments ----

const assignSchema = z.object({ userId: z.string().min(1), isLead: z.boolean().optional() });

jobRouter.post("/:id/assignments", requireRole("ADMIN", "MANAGER"), validate(assignSchema), async (req, res) => {
  const { userId, isLead } = req.body as z.infer<typeof assignSchema>;
  const assignment = await prisma.jobAssignment.create({
    data: { jobId: req.params.id, userId, isLead: isLead ?? false },
    include: { user: { select: { id: true, name: true } } },
  });
  res.status(201).json(assignment);
});

jobRouter.delete("/:id/assignments/:userId", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.jobAssignment.delete({
    where: { jobId_userId: { jobId: req.params.id, userId: req.params.userId } },
  });
  res.status(204).send();
});

// ---- Checklist ----

const checklistSchema = z.object({ description: z.string().min(1) });

jobRouter.post("/:id/checklist", validate(checklistSchema), async (req, res) => {
  const count = await prisma.jobChecklistItem.count({ where: { jobId: req.params.id } });
  const item = await prisma.jobChecklistItem.create({
    data: { jobId: req.params.id, description: req.body.description, sortOrder: count },
  });
  res.status(201).json(item);
});

jobRouter.patch("/checklist/:itemId", validate(z.object({ completed: z.boolean() })), async (req, res) => {
  const item = await prisma.jobChecklistItem.update({
    where: { id: req.params.itemId },
    data: { completed: req.body.completed, completedAt: req.body.completed ? new Date() : null },
  });
  res.json(item);
});

jobRouter.delete("/checklist/:itemId", async (req, res) => {
  await prisma.jobChecklistItem.delete({ where: { id: req.params.itemId } });
  res.status(204).send();
});

// ---- Time entries (clock in/out) ----

jobRouter.post("/:id/clock-in", async (req, res) => {
  const entry = await prisma.timeEntry.create({
    data: { jobId: req.params.id, userId: req.user!.id, clockIn: new Date() },
  });
  res.status(201).json(entry);
});

jobRouter.patch("/time-entries/:entryId/clock-out", validate(z.object({ notes: z.string().optional() })), async (req, res) => {
  const entry = await prisma.timeEntry.update({
    where: { id: req.params.entryId },
    data: { clockOut: new Date(), notes: req.body.notes },
  });
  res.json(entry);
});

// ---- Inventory usage ----

const usageSchema = z.object({ inventoryItemId: z.string().min(1), quantityUsed: z.number().positive() });

jobRouter.post("/:id/inventory-usage", validate(usageSchema), async (req, res) => {
  const { inventoryItemId, quantityUsed } = req.body as z.infer<typeof usageSchema>;
  const [usage] = await prisma.$transaction([
    prisma.inventoryUsage.create({ data: { jobId: req.params.id, inventoryItemId, quantityUsed } }),
    prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantityOnHand: { decrement: quantityUsed } },
    }),
  ]);
  res.status(201).json(usage);
});
