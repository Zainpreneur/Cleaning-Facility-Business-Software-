export type Role = "ADMIN" | "MANAGER" | "STAFF";
export type PropertyType =
  | "OFFICE"
  | "RESIDENTIAL"
  | "RETAIL"
  | "WAREHOUSE"
  | "MEDICAL"
  | "INDUSTRIAL"
  | "EDUCATIONAL"
  | "OTHER";
export type JobStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type JobPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "VOID";
export type PaymentMethod = "CASH" | "CHECK" | "CARD" | "BANK_TRANSFER" | "OTHER";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  active: boolean;
  hourlyRate?: number | null;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  _count?: { properties: number; jobs: number; invoices: number };
  properties?: Property[];
  invoices?: Invoice[];
  jobs?: Job[];
}

export interface Property {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  name: string;
  type: PropertyType;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  squareFootage?: number | null;
  numberOfRooms?: number | null;
  accessNotes?: string | null;
  notes?: string | null;
  active: boolean;
  jobs?: Job[];
}

export interface ServiceType {
  id: string;
  name: string;
  description?: string | null;
  defaultDurationMinutes: number;
  defaultPrice: number;
}

export interface JobAssignment {
  id: string;
  jobId: string;
  userId: string;
  isLead: boolean;
  user: { id: string; name: string };
}

export interface JobChecklistItem {
  id: string;
  jobId: string;
  description: string;
  completed: boolean;
  completedAt?: string | null;
  sortOrder: number;
}

export interface TimeEntry {
  id: string;
  jobId: string;
  userId: string;
  clockIn: string;
  clockOut?: string | null;
  notes?: string | null;
  user?: { id: string; name: string };
}

export interface Job {
  id: string;
  title: string;
  description?: string | null;
  clientId: string;
  client: { id: string; name: string };
  propertyId: string;
  property: { id: string; name: string; addressLine1?: string; city?: string | null };
  serviceTypeId?: string | null;
  serviceType?: ServiceType | null;
  status: JobStatus;
  priority: JobPriority;
  recurrence: Recurrence;
  recurrenceEndDate?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  price: number;
  assignments: JobAssignment[];
  checklistItems: JobChecklistItem[];
  timeEntries?: TimeEntry[];
  inventoryUsages?: InventoryUsage[];
  inspections?: Inspection[];
  childJobs?: { id: string; scheduledStart: string; status: JobStatus }[];
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  usages?: InventoryUsage[];
}

export interface InventoryUsage {
  id: string;
  jobId: string;
  inventoryItemId: string;
  quantityUsed: number;
  inventoryItem?: InventoryItem;
  job?: { id: string; title: string };
}

export interface InspectionItem {
  id: string;
  area: string;
  rating: number;
  notes?: string | null;
}

export interface Inspection {
  id: string;
  jobId: string;
  inspectorId: string;
  inspector?: { id: string; name: string };
  overallScore?: number | null;
  notes?: string | null;
  createdAt: string;
  items: InspectionItem[];
  job?: { id: string; title: string; propertyId?: string };
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  jobId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  paidAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client: { id: string; name: string; email?: string | null };
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  notes?: string | null;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
}

export interface DashboardSummary {
  jobsToday: number;
  jobsThisWeek: number;
  activeClients: number;
  revenueThisMonth: number;
  collectedThisMonth: number;
  overdueInvoices: Invoice[];
  lowStockItems: InventoryItem[];
  upcomingJobs: Job[];
  jobStatusCounts: { status: JobStatus; count: number }[];
}
