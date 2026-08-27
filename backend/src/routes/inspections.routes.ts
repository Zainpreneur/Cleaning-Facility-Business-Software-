import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth } from "../middleware/auth";
import { ApiError } from "../utils/errors";

export const inspectionRouter = Router();
inspectionRouter.use(requireAuth);

inspectionRouter.get("/", async (req, res) => {
  const { jobId } = req.query as { jobId?: string };
  const inspections = await prisma.inspection.findMany({
    where: { ...(jobId ? { jobId } : {}) },
    include: {
      items: true,
      inspector: { select: { id: true, name: true } },
      job: { select: { id: true, title: true, propertyId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(inspections);
});

inspectionRouter.get("/:id", async (req, res) => {
  const inspection = await prisma.inspection.findUnique({
    where: { id: req.params.id },
    include: { items: true, inspector: { select: { id: true, name: true } }, job: true },
  });
  if (!inspection) throw ApiError.notFound("Inspection not found");
  res.json(inspection);
});

const itemSchema = z.object({ area: z.string().min(1), rating: z.number().int().min(1).max(5), notes: z.string().optional() });

const schema = z.object({
  jobId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

inspectionRouter.post("/", validate(schema), async (req, res) => {
  const data = req.body as z.infer<typeof schema>;
  const overallScore = data.items.reduce((sum, i) => sum + i.rating, 0) / data.items.length;

  const inspection = await prisma.inspection.create({
    data: {
      jobId: data.jobId,
      inspectorId: req.user!.id,
      notes: data.notes,
      overallScore,
      items: { create: data.items },
    },
    include: { items: true, inspector: { select: { id: true, name: true } } },
  });
  res.status(201).json(inspection);
});
