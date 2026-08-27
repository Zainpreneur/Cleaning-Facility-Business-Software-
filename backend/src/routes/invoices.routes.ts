import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { validate } from "../utils/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../utils/errors";
import { nextInvoiceNumber } from "../services/invoiceNumber";
import { renderInvoicePdf } from "../services/invoicePdf";

export const invoiceRouter = Router();
invoiceRouter.use(requireAuth);

const invoiceInclude = {
  client: { select: { id: true, name: true, email: true } },
  lineItems: true,
  payments: { orderBy: { paidAt: "desc" as const } },
};

function computeTotals(lineItems: { quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

invoiceRouter.get("/", async (req, res) => {
  const { status, clientId } = req.query as Record<string, string | undefined>;
  const invoices = await prisma.invoice.findMany({
    where: { ...(status ? { status: status as any } : {}), ...(clientId ? { clientId } : {}) },
    include: invoiceInclude,
    orderBy: { issueDate: "desc" },
  });
  res.json(invoices);
});

invoiceRouter.get("/:id", async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  res.json(invoice);
});

invoiceRouter.get("/:id/pdf", async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  renderInvoicePdf(invoice as any, res);
});

const lineItemSchema = z.object({
  jobId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative().default(0),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1),
  dueDate: z.string().datetime(),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
});

invoiceRouter.post("/", requireRole("ADMIN", "MANAGER"), validate(invoiceSchema), async (req, res) => {
  const data = req.body as z.infer<typeof invoiceSchema>;
  const { subtotal, taxAmount, total } = computeTotals(data.lineItems, data.taxRate);
  const invoiceNumber = await nextInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: data.clientId,
      dueDate: new Date(data.dueDate),
      taxRate: data.taxRate,
      subtotal,
      taxAmount,
      total,
      notes: data.notes,
      lineItems: {
        create: data.lineItems.map((li) => ({
          jobId: li.jobId,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          amount: li.quantity * li.unitPrice,
        })),
      },
    },
    include: invoiceInclude,
  });
  res.status(201).json(invoice);
});

/** Convenience: build a draft invoice pre-filled from one or more completed jobs. */
const fromJobsSchema = z.object({ jobIds: z.array(z.string()).min(1), taxRate: z.number().min(0).max(100).default(0), dueInDays: z.number().int().positive().default(14) });

invoiceRouter.post("/from-jobs", requireRole("ADMIN", "MANAGER"), validate(fromJobsSchema), async (req, res) => {
  const { jobIds, taxRate, dueInDays } = req.body as z.infer<typeof fromJobsSchema>;
  const jobs = await prisma.job.findMany({ where: { id: { in: jobIds } }, include: { property: true } });
  if (jobs.length === 0) throw ApiError.badRequest("No matching jobs found");
  const clientId = jobs[0].clientId;
  if (jobs.some((j) => j.clientId !== clientId)) {
    throw ApiError.badRequest("All jobs must belong to the same client");
  }

  const lineItems = jobs.map((j) => ({
    jobId: j.id,
    description: `${j.title} — ${j.property.name} (${j.scheduledStart.toDateString()})`,
    quantity: 1,
    unitPrice: j.price,
  }));
  const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueInDays);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(),
      clientId,
      dueDate,
      taxRate,
      subtotal,
      taxAmount,
      total,
      lineItems: { create: lineItems.map((li) => ({ ...li, amount: li.quantity * li.unitPrice })) },
    },
    include: invoiceInclude,
  });
  res.status(201).json(invoice);
});

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "VOID"]).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
});

invoiceRouter.put("/:id", requireRole("ADMIN", "MANAGER"), validate(updateInvoiceSchema), async (req, res) => {
  const data = req.body as z.infer<typeof updateInvoiceSchema>;
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { lineItems: true } });
  if (!existing) throw ApiError.notFound("Invoice not found");

  let totals = {};
  if (data.taxRate !== undefined) {
    totals = computeTotals(existing.lineItems, data.taxRate);
  }

  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined, ...totals },
    include: invoiceInclude,
  });
  res.json(invoice);
});

invoiceRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  await prisma.invoice.update({ where: { id: req.params.id }, data: { status: "VOID" } });
  res.status(204).send();
});

// ---- Payments ----

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "CHECK", "CARD", "BANK_TRANSFER", "OTHER"]).default("CARD"),
  reference: z.string().optional(),
});

invoiceRouter.post("/:id/payments", requireRole("ADMIN", "MANAGER"), validate(paymentSchema), async (req, res) => {
  const data = req.body as z.infer<typeof paymentSchema>;
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw ApiError.notFound("Invoice not found");

  const newAmountPaid = invoice.amountPaid + data.amount;
  const status = newAmountPaid >= invoice.total ? "PAID" : "PARTIALLY_PAID";

  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data: { invoiceId: invoice.id, ...data } }),
    prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: newAmountPaid, status } }),
  ]);
  res.status(201).json(payment);
});
