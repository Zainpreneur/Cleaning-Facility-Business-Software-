import PDFDocument from "pdfkit";
import { Response } from "express";
import { Invoice, InvoiceLineItem, Client, Payment } from "@prisma/client";

type FullInvoice = Invoice & { client: Client; lineItems: InvoiceLineItem[]; payments: Payment[] };

const money = (n: number) => `$${n.toFixed(2)}`;

/** Streams a simple, readable invoice PDF directly to the HTTP response. */
export function renderInvoicePdf(invoice: FullInvoice, res: Response) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text("INVOICE", { align: "right" });
  doc.fontSize(10).fillColor("#555").text(invoice.invoiceNumber, { align: "right" });
  doc.moveDown(2);

  doc.fillColor("#000").fontSize(14).text("CleanFacility Ops");
  doc.fontSize(10).fillColor("#555").text("Cleaning & Facility Management Services");
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(11).text(`Bill to: ${invoice.client.name}`);
  if (invoice.client.companyName) doc.text(invoice.client.companyName);
  if (invoice.client.billingAddress) doc.text(invoice.client.billingAddress);
  if (invoice.client.email) doc.text(invoice.client.email);
  doc.moveDown();

  doc.text(`Issue date: ${invoice.issueDate.toDateString()}`);
  doc.text(`Due date: ${invoice.dueDate.toDateString()}`);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown();

  const tableTop = doc.y;
  doc.fontSize(10).fillColor("#333");
  doc.text("Description", 50, tableTop, { width: 260 });
  doc.text("Qty", 320, tableTop, { width: 50, align: "right" });
  doc.text("Unit Price", 370, tableTop, { width: 80, align: "right" });
  doc.text("Amount", 460, tableTop, { width: 90, align: "right" });
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let y = tableTop + 22;
  doc.fillColor("#000");
  for (const item of invoice.lineItems) {
    doc.text(item.description, 50, y, { width: 260 });
    doc.text(String(item.quantity), 320, y, { width: 50, align: "right" });
    doc.text(money(item.unitPrice), 370, y, { width: 80, align: "right" });
    doc.text(money(item.amount), 460, y, { width: 90, align: "right" });
    y += 20;
  }

  doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
  y += 15;
  doc.text(`Subtotal: ${money(invoice.subtotal)}`, 370, y, { width: 180, align: "right" });
  y += 16;
  doc.text(`Tax (${invoice.taxRate}%): ${money(invoice.taxAmount)}`, 370, y, { width: 180, align: "right" });
  y += 16;
  doc.fontSize(12).text(`Total: ${money(invoice.total)}`, 370, y, { width: 180, align: "right" });
  y += 18;
  doc.fontSize(10).text(`Amount paid: ${money(invoice.amountPaid)}`, 370, y, { width: 180, align: "right" });
  y += 16;
  doc
    .fontSize(12)
    .text(`Balance due: ${money(invoice.total - invoice.amountPaid)}`, 370, y, { width: 180, align: "right" });

  if (invoice.notes) {
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#555").text(`Notes: ${invoice.notes}`);
  }

  doc.end();
}
