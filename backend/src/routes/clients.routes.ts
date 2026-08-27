import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../utils/errors";

export const clientRouter = Router();
clientRouter.use(requireAuth);

clientRouter.get("/", async (req, res) => {
  const { search, active } = req.query as { search?: string; active?: string };
  const clients = await prisma.client.findMany({
    where: {
      ...(active !== undefined ? { active: active === "true" } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { companyName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { properties: true, jobs: true, invoices: true } } },
    orderBy: { name: "asc" },
  });
  res.json(clients);
});

clientRouter.get("/:id", async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      properties: { orderBy: { name: "asc" } },
      invoices: { orderBy: { issueDate: "desc" }, take: 10 },
      jobs: { orderBy: { scheduledStart: "desc" }, take: 10, include: { property: true } },
    },
  });
  if (!client) throw ApiError.notFound("Client not found");
  res.json(client);
});

const clientSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
});

clientRouter.post("/", requireRole("ADMIN", "MANAGER"), validate(clientSchema), async (req, res) => {
  const client = await prisma.client.create({
    data: { ...req.body, createdById: req.user!.id },
  });
  res.status(201).json(client);
});

clientRouter.put("/:id", requireRole("ADMIN", "MANAGER"), validate(clientSchema.partial()), async (req, res) => {
  const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
  res.json(client);
});

clientRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  // Soft delete to preserve historical jobs/invoices tied to this client.
  const client = await prisma.client.update({ where: { id: req.params.id }, data: { active: false } });
  res.json(client);
});
