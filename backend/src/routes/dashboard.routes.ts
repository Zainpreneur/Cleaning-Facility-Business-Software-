import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (_req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const [
    jobsToday,
    jobsThisWeek,
    activeClients,
    invoicesThisMonth,
    overdueInvoices,
    allInventory,
    upcomingJobs,
    jobStatusCounts,
  ] = await Promise.all([
    prisma.job.count({ where: { scheduledStart: { gte: startOfToday, lt: endOfToday }, status: { not: "CANCELLED" } } }),
    prisma.job.count({ where: { scheduledStart: { gte: startOfToday, lt: sevenDaysOut }, status: { not: "CANCELLED" } } }),
    prisma.client.count({ where: { active: true } }),
    prisma.invoice.aggregate({
      where: { issueDate: { gte: startOfMonth, lt: startOfNextMonth }, status: { not: "VOID" } },
      _sum: { total: true, amountPaid: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID"] }, dueDate: { lt: now } },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.inventoryItem.findMany(),
    prisma.job.findMany({
      where: { scheduledStart: { gte: now, lt: sevenDaysOut }, status: { not: "CANCELLED" } },
      include: {
        client: { select: { name: true } },
        property: { select: { name: true } },
        assignments: { include: { user: { select: { name: true } } } },
      },
      orderBy: { scheduledStart: "asc" },
      take: 10,
    }),
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const lowStockItems = allInventory.filter((i) => i.quantityOnHand <= i.reorderLevel);

  res.json({
    jobsToday,
    jobsThisWeek,
    activeClients,
    revenueThisMonth: invoicesThisMonth._sum.total ?? 0,
    collectedThisMonth: invoicesThisMonth._sum.amountPaid ?? 0,
    overdueInvoices,
    lowStockItems,
    upcomingJobs,
    jobStatusCounts: jobStatusCounts.map((g) => ({ status: g.status, count: g._count._all })),
  });
});
