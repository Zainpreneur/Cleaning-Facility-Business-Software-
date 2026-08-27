import { api } from "./client";
import type {
  Client,
  DashboardSummary,
  InventoryItem,
  Inspection,
  Invoice,
  Job,
  Property,
  ServiceType,
  User,
} from "../types";

// ---- Auth ----
export const AuthApi = {
  login: (email: string, password: string) => api.post<{ token: string; user: User }>("/auth/login", { email, password }),
  bootstrapAdmin: (name: string, email: string, password: string) =>
    api.post<{ token: string; user: User }>("/auth/bootstrap-admin", { name, email, password }),
  me: () => api.get<User>("/auth/me"),
};

// ---- Dashboard ----
export const DashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
};

// ---- Users ----
export const UsersApi = {
  list: (params?: Record<string, string>) => api.get<User[]>("/users", { params }),
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: any) => api.post<User>("/users", data),
  update: (id: string, data: any) => api.put<User>(`/users/${id}`, data),
  deactivate: (id: string) => api.delete<User>(`/users/${id}`),
};

// ---- Clients ----
export const ClientsApi = {
  list: (params?: Record<string, string>) => api.get<Client[]>("/clients", { params }),
  get: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: any) => api.post<Client>("/clients", data),
  update: (id: string, data: any) => api.put<Client>(`/clients/${id}`, data),
  deactivate: (id: string) => api.delete(`/clients/${id}`),
};

// ---- Properties ----
export const PropertiesApi = {
  list: (params?: Record<string, string>) => api.get<Property[]>("/properties", { params }),
  get: (id: string) => api.get<Property>(`/properties/${id}`),
  create: (data: any) => api.post<Property>("/properties", data),
  update: (id: string, data: any) => api.put<Property>(`/properties/${id}`, data),
  deactivate: (id: string) => api.delete(`/properties/${id}`),
};

// ---- Service types ----
export const ServiceTypesApi = {
  list: () => api.get<ServiceType[]>("/service-types"),
  create: (data: any) => api.post<ServiceType>("/service-types", data),
  update: (id: string, data: any) => api.put<ServiceType>(`/service-types/${id}`, data),
  remove: (id: string) => api.delete(`/service-types/${id}`),
};

// ---- Jobs ----
export const JobsApi = {
  list: (params?: Record<string, string>) => api.get<Job[]>("/jobs", { params }),
  get: (id: string) => api.get<Job>(`/jobs/${id}`),
  create: (data: any) => api.post<Job>("/jobs", data),
  update: (id: string, data: any) => api.put<Job>(`/jobs/${id}`, data),
  setStatus: (id: string, status: string) => api.patch<Job>(`/jobs/${id}/status`, { status }),
  cancel: (id: string) => api.delete(`/jobs/${id}`),
  assign: (id: string, userId: string, isLead?: boolean) =>
    api.post(`/jobs/${id}/assignments`, { userId, isLead }),
  unassign: (id: string, userId: string) => api.delete(`/jobs/${id}/assignments/${userId}`),
  addChecklistItem: (id: string, description: string) => api.post(`/jobs/${id}/checklist`, { description }),
  toggleChecklistItem: (itemId: string, completed: boolean) =>
    api.patch(`/jobs/checklist/${itemId}`, { completed }),
  removeChecklistItem: (itemId: string) => api.delete(`/jobs/checklist/${itemId}`),
  clockIn: (id: string) => api.post(`/jobs/${id}/clock-in`),
  clockOut: (entryId: string, notes?: string) => api.patch(`/jobs/time-entries/${entryId}/clock-out`, { notes }),
  logInventoryUsage: (id: string, inventoryItemId: string, quantityUsed: number) =>
    api.post(`/jobs/${id}/inventory-usage`, { inventoryItemId, quantityUsed }),
};

// ---- Inventory ----
export const InventoryApi = {
  list: (params?: Record<string, string>) => api.get<InventoryItem[]>("/inventory", { params }),
  get: (id: string) => api.get<InventoryItem>(`/inventory/${id}`),
  create: (data: any) => api.post<InventoryItem>("/inventory", data),
  update: (id: string, data: any) => api.put<InventoryItem>(`/inventory/${id}`, data),
  restock: (id: string, quantity: number) => api.post<InventoryItem>(`/inventory/${id}/restock`, { quantity }),
  remove: (id: string) => api.delete(`/inventory/${id}`),
};

// ---- Inspections ----
export const InspectionsApi = {
  list: (params?: Record<string, string>) => api.get<Inspection[]>("/inspections", { params }),
  get: (id: string) => api.get<Inspection>(`/inspections/${id}`),
  create: (data: any) => api.post<Inspection>("/inspections", data),
};

// ---- Invoices ----
export const InvoicesApi = {
  list: (params?: Record<string, string>) => api.get<Invoice[]>("/invoices", { params }),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: any) => api.post<Invoice>("/invoices", data),
  createFromJobs: (jobIds: string[], taxRate: number, dueInDays?: number) =>
    api.post<Invoice>("/invoices/from-jobs", { jobIds, taxRate, dueInDays }),
  update: (id: string, data: any) => api.put<Invoice>(`/invoices/${id}`, data),
  void: (id: string) => api.delete(`/invoices/${id}`),
  addPayment: (id: string, data: any) => api.post(`/invoices/${id}/payments`, data),
  pdfUrl: (id: string) => `${api.defaults.baseURL}/invoices/${id}/pdf`,
};
