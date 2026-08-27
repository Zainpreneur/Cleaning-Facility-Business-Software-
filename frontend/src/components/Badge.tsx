import { humanize } from "../utils/format";

const COLOR_MAP: Record<string, string> = {
  // Job statuses
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-600",
  // Priorities
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
  // Invoice statuses
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-800",
  PAID: "bg-emerald-100 text-emerald-800",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-800",
  VOID: "bg-slate-200 text-slate-500 line-through",
  // Roles
  ADMIN: "bg-purple-100 text-purple-800",
  MANAGER: "bg-indigo-100 text-indigo-800",
  STAFF: "bg-teal-100 text-teal-800",
};

export function Badge({ value }: { value: string }) {
  const cls = COLOR_MAP[value] ?? "bg-slate-100 text-slate-700";
  return <span className={`badge ${cls}`}>{humanize(value)}</span>;
}
