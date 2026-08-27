import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth, requireRole } from "../middleware/auth";

export const serviceTypeRouter = Router();
serviceTypeRouter.use(requireAuth);

serviceTypeRouter.get("/", async (_req, res) => {
  const types = await prisma.serviceType.findMany({ orderBy: { name: "asc" } });
  res.json(types);
});

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultDurationMinutes: z.number().int().positive().default(60),
  defaultPrice: z.number().nonnegative().default(0),
});

serviceTypeRouter.post("/", requireRole("ADMIN", "MANAGER"), validate(schema), async (req, res) => {
  const type = await prisma.serviceType.create({ data: req.body });
  res.status(201).json(type);
});

serviceTypeRouter.put("/:id", requireRole("ADMIN", "MANAGER"), validate(schema.partial()), async (req, res) => {
  const type = await prisma.serviceType.update({ where: { id: req.params.id }, data: req.body });
  res.json(type);
});

serviceTypeRouter.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.serviceType.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
