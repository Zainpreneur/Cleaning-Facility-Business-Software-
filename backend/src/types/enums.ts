// Shared "enum" value lists. The Prisma schema stores these as plain
// Strings (SQLite has no native enum support), so these arrays + unions are
// the single source of truth used by both the zod validators in each route
// and any TypeScript code that needs the type.

export const ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const PROPERTY_TYPES = [
  "OFFICE",
  "RESIDENTIAL",
  "RETAIL",
  "WAREHOUSE",
  "MEDICAL",
  "INDUSTRIAL",
  "EDUCATIONAL",
  "OTHER",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const JOB_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const RECURRENCES = ["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CHECK", "CARD", "BANK_TRANSFER", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
