import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../utils/errors";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

inventoryRouter.get("/", async (req, res) => {
  const { lowStock } = req.query as { lowStock?: string };
  const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
  res.json(lowStock === "true" ? items.filter((i) => i.quantityOnHand <= i.reorderLevel) : items);
});

inventoryRouter.get("/:id", async (req, res) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: req.params.id },
    include: { usages: { orderBy: { createdAt: "desc" }, take: 20, include: { job: { select: { id: true, title: true } } } } },
  });
  if (!item) throw ApiError.notFound("Inventory item not found");
  res.json(item);
});

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  unit: z.string().default("unit"),
  quantityOnHand: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(0),
  unitCost: z.number().nonnegative().default(0),
});

inventoryRouter.post("/", requireRole("ADMIN", "MANAGER"), validate(schema), async (req, res) => {
  const item = await prisma.inventoryItem.create({ data: req.body });
  res.status(201).json(item);
});

inventoryRouter.put("/:id", requireRole("ADMIN", "MANAGER"), validate(schema.partial()), async (req, res) => {
  const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: req.body });
  res.json(item);
});

const restockSchema = z.object({ quantity: z.number().positive() });
inventoryRouter.post("/:id/restock", requireRole("ADMIN", "MANAGER"), validate(restockSchema), async (req, res) => {
  const item = await prisma.inventoryItem.update({
    where: { id: req.params.id },
    data: { quantityOnHand: { increment: req.body.quantity } },
  });
  res.json(item);
});

inventoryRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.inventoryItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
