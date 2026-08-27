import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../utils/password";
import { ApiError } from "../utils/errors";

export const userRouter = Router();
userRouter.use(requireAuth);

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  hourlyRate: true,
  createdAt: true,
} as const;

userRouter.get("/", async (req, res) => {
  const { role, active } = req.query as { role?: string; active?: string };
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role: role as any } : {}),
      ...(active !== undefined ? { active: active === "true" } : {}),
    },
    select: userSelect,
    orderBy: { name: "asc" },
  });
  res.json(users);
});

userRouter.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: userSelect });
  if (!user) throw ApiError.notFound("User not found");
  res.json(user);
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
  hourlyRate: z.number().nonnegative().optional(),
});

userRouter.post("/", requireRole("ADMIN"), validate(createSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createSchema>;
  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone,
      role: data.role,
      hourlyRate: data.hourlyRate,
    },
    select: userSelect,
  });
  res.status(201).json(user);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  active: z.boolean().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  password: z.string().min(8).optional(),
});

userRouter.put("/:id", requireRole("ADMIN"), validate(updateSchema), async (req, res) => {
  const data = req.body as z.infer<typeof updateSchema>;
  const { password, ...rest } = data;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    select: userSelect,
  });
  res.json(user);
});

userRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  if (req.params.id === req.user!.id) throw ApiError.badRequest("You cannot deactivate your own account");
  // Soft delete: deactivate rather than hard-delete, to preserve history on jobs/time entries.
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { active: false }, select: userSelect });
  res.json(user);
});
