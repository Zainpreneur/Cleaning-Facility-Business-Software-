import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cfbs.demo" },
    update: {},
    create: { name: "Alex Admin", email: "admin@cfbs.demo", passwordHash, role: "ADMIN" },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@cfbs.demo" },
    update: {},
    create: { name: "Morgan Manager", email: "manager@cfbs.demo", passwordHash, role: "MANAGER" },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: "staff1@cfbs.demo" },
    update: {},
    create: { name: "Sam Staff", email: "staff1@cfbs.demo", passwordHash, role: "STAFF", hourlyRate: 22 },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "staff2@cfbs.demo" },
    update: {},
    create: { name: "Jordan Staff", email: "staff2@cfbs.demo", passwordHash, role: "STAFF", hourlyRate: 20 },
  });

  const [officeClean, deepClean, carpetClean, windowClean] = await Promise.all([
    prisma.serviceType.upsert({
      where: { name: "Standard Office Cleaning" },
      update: {},
      create: { name: "Standard Office Cleaning", defaultDurationMinutes: 90, defaultPrice: 120 },
    }),
    prisma.serviceType.upsert({
      where: { name: "Deep Cleaning" },
      update: {},
      create: { name: "Deep Cleaning", defaultDurationMinutes: 180, defaultPrice: 350 },
    }),
    prisma.serviceType.upsert({
      where: { name: "Carpet Cleaning" },
      update: {},
      create: { name: "Carpet Cleaning", defaultDurationMinutes: 120, defaultPrice: 200 },
    }),
    prisma.serviceType.upsert({
      where: { name: "Window Cleaning" },
      update: {},
      create: { name: "Window Cleaning", defaultDurationMinutes: 60, defaultPrice: 100 },
    }),
  ]);

  const acme = await prisma.client.create({
    data: {
      name: "Acme Corp",
      companyName: "Acme Corporation",
      email: "facilities@acme.example",
      phone: "555-0100",
      billingAddress: "100 Acme Way, Springfield",
      createdById: admin.id,
      properties: {
        create: [
          {
            name: "Acme HQ",
            type: "OFFICE",
            addressLine1: "100 Acme Way",
            city: "Springfield",
            state: "IL",
            zip: "62704",
            squareFootage: 12000,
            numberOfRooms: 24,
            accessNotes: "Front desk has building keycard; ask for suite 400.",
          },
          {
            name: "Acme Warehouse",
            type: "WAREHOUSE",
            addressLine1: "42 Industrial Pkwy",
            city: "Springfield",
            state: "IL",
            zip: "62711",
            squareFootage: 40000,
          },
        ],
      },
    },
    include: { properties: true },
  });

  const brightRetail = await prisma.client.create({
    data: {
      name: "Bright Retail Group",
      email: "ops@brightretail.example",
      phone: "555-0142",
      billingAddress: "88 Market St, Springfield",
      createdById: manager.id,
      properties: {
        create: [
          {
            name: "Bright Retail - Downtown",
            type: "RETAIL",
            addressLine1: "88 Market St",
            city: "Springfield",
            state: "IL",
            zip: "62701",
            squareFootage: 5000,
          },
        ],
      },
    },
    include: { properties: true },
  });

  await prisma.inventoryItem.createMany({
    data: [
      { name: "All-Purpose Cleaner", sku: "APC-001", unit: "bottle", quantityOnHand: 40, reorderLevel: 10, unitCost: 4.5 },
      { name: "Microfiber Cloths (pack of 12)", sku: "MFC-012", unit: "pack", quantityOnHand: 15, reorderLevel: 5, unitCost: 9 },
      { name: "Trash Liners 55gal", sku: "TL-055", unit: "case", quantityOnHand: 3, reorderLevel: 5, unitCost: 22 },
      { name: "Glass Cleaner", sku: "GC-002", unit: "bottle", quantityOnHand: 25, reorderLevel: 8, unitCost: 5.25 },
    ],
  });

  const now = new Date();
  function at(daysFromNow: number, hour: number, minute = 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const completedJob = await prisma.job.create({
    data: {
      title: "Weekly Office Cleaning",
      clientId: acme.id,
      propertyId: acme.properties[0].id,
      serviceTypeId: officeClean.id,
      status: "COMPLETED",
      priority: "NORMAL",
      scheduledStart: at(-3, 18),
      scheduledEnd: at(-3, 19, 30),
      actualStart: at(-3, 18, 5),
      actualEnd: at(-3, 19, 25),
      price: 120,
      createdById: manager.id,
      assignments: { create: [{ userId: staff1.id, isLead: true }, { userId: staff2.id }] },
      checklistItems: {
        create: [
          { description: "Vacuum all carpeted areas", completed: true, completedAt: at(-3, 19) },
          { description: "Empty trash bins", completed: true, completedAt: at(-3, 19) },
          { description: "Sanitize restrooms", completed: true, completedAt: at(-3, 19) },
          { description: "Wipe down desks and common surfaces", completed: true, completedAt: at(-3, 19) },
        ],
      },
    },
  });

  await prisma.timeEntry.createMany({
    data: [
      { jobId: completedJob.id, userId: staff1.id, clockIn: at(-3, 18, 5), clockOut: at(-3, 19, 25) },
      { jobId: completedJob.id, userId: staff2.id, clockIn: at(-3, 18, 5), clockOut: at(-3, 19, 20) },
    ],
  });

  await prisma.inspection.create({
    data: {
      jobId: completedJob.id,
      inspectorId: manager.id,
      overallScore: 4.5,
      notes: "Great job overall, minor streaks on lobby glass.",
      items: {
        create: [
          { area: "Lobby", rating: 4, notes: "Streaks on glass door" },
          { area: "Restrooms", rating: 5 },
          { area: "Offices", rating: 5 },
          { area: "Kitchen", rating: 4 },
        ],
      },
    },
  });

  await prisma.job.create({
    data: {
      title: "Weekly Office Cleaning",
      clientId: acme.id,
      propertyId: acme.properties[0].id,
      serviceTypeId: officeClean.id,
      status: "SCHEDULED",
      priority: "NORMAL",
      recurrence: "WEEKLY",
      scheduledStart: at(2, 18),
      scheduledEnd: at(2, 19, 30),
      price: 120,
      createdById: manager.id,
      assignments: { create: [{ userId: staff1.id, isLead: true }] },
      checklistItems: {
        create: [
          { description: "Vacuum all carpeted areas" },
          { description: "Empty trash bins" },
          { description: "Sanitize restrooms" },
          { description: "Wipe down desks and common surfaces" },
        ],
      },
    },
  });

  await prisma.job.create({
    data: {
      title: "Warehouse Deep Clean",
      clientId: acme.id,
      propertyId: acme.properties[1].id,
      serviceTypeId: deepClean.id,
      status: "SCHEDULED",
      priority: "HIGH",
      scheduledStart: at(1, 8),
      scheduledEnd: at(1, 11),
      price: 350,
      createdById: admin.id,
      assignments: { create: [{ userId: staff2.id, isLead: true }] },
    },
  });

  await prisma.job.create({
    data: {
      title: "Storefront Window Cleaning",
      clientId: brightRetail.id,
      propertyId: brightRetail.properties[0].id,
      serviceTypeId: windowClean.id,
      status: "SCHEDULED",
      priority: "LOW",
      scheduledStart: at(4, 9),
      scheduledEnd: at(4, 10),
      price: 100,
      createdById: manager.id,
    },
  });

  const overdueInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-" + now.getFullYear() + "-0001",
      clientId: brightRetail.id,
      status: "SENT",
      issueDate: at(-30, 9),
      dueDate: at(-16, 9),
      subtotal: 200,
      taxRate: 8,
      taxAmount: 16,
      total: 216,
      amountPaid: 0,
      lineItems: { create: [{ description: "Carpet Cleaning - Bright Retail Downtown", quantity: 1, unitPrice: 200, amount: 200 }] },
    },
  });

  const paidInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-" + now.getFullYear() + "-0002",
      clientId: acme.id,
      status: "PAID",
      issueDate: at(-5, 9),
      dueDate: at(9, 9),
      subtotal: 120,
      taxRate: 0,
      taxAmount: 0,
      total: 120,
      amountPaid: 120,
      lineItems: { create: [{ jobId: completedJob.id, description: "Weekly Office Cleaning", quantity: 1, unitPrice: 120, amount: 120 }] },
      payments: { create: [{ amount: 120, method: "CARD", reference: "auth_demo_1" }] },
    },
  });

  console.log("Seed complete.");
  console.log("Login with: admin@cfbs.demo / manager@cfbs.demo / staff1@cfbs.demo / staff2@cfbs.demo — password: password123");
  console.log({ overdueInvoice: overdueInvoice.invoiceNumber, paidInvoice: paidInvoice.invoiceNumber });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
