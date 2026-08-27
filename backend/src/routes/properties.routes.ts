import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../utils/errors";

export const propertyRouter = Router();
propertyRouter.use(requireAuth);

propertyRouter.get("/", async (req, res) => {
  const { clientId, active } = req.query as { clientId?: string; active?: string };
  const properties = await prisma.property.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  res.json(properties);
});

propertyRouter.get("/:id", async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      jobs: { orderBy: { scheduledStart: "desc" }, take: 20 },
    },
  });
  if (!property) throw ApiError.notFound("Property not found");
  res.json(property);
});

const propertySchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  type: z
    .enum(["OFFICE", "RESIDENTIAL", "RETAIL", "WAREHOUSE", "MEDICAL", "INDUSTRIAL", "EDUCATIONAL", "OTHER"])
    .default("OFFICE"),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  squareFootage: z.number().int().nonnegative().optional(),
  numberOfRooms: z.number().int().nonnegative().optional(),
  accessNotes: z.string().optional(),
  notes: z.string().optional(),
});

propertyRouter.post("/", requireRole("ADMIN", "MANAGER"), validate(propertySchema), async (req, res) => {
  const property = await prisma.property.create({ data: req.body });
  res.status(201).json(property);
});

propertyRouter.put(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  validate(propertySchema.partial()),
  async (req, res) => {
    const property = await prisma.property.update({ where: { id: req.params.id }, data: req.body });
    res.json(property);
  }
);

propertyRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const property = await prisma.property.update({ where: { id: req.params.id }, data: { active: false } });
  res.json(property);
});
