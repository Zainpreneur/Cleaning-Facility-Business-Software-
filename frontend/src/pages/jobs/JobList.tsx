import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ClientsApi, JobsApi, PropertiesApi, ServiceTypesApi, UsersApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { Badge } from "../../components/Badge";
import { formatCurrency, formatDateTime, toInputDateTime } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import type { JobPriority, JobStatus, Recurrence } from "../../types";

const STATUSES: JobStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PRIORITIES: JobPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const RECURRENCES: Recurrence[] = ["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];

export function JobList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", statusFilter],
    queryFn: () => JobsApi.list(statusFilter ? { status: statusFilter } : undefined).then((r) => r.data),
  });

  const { data: clients } = useQuery({ queryKey: ["clients", "all"], queryFn: () => ClientsApi.list({ active: "true" }).then((r) => r.data) });
  const { data: properties } = useQuery({
    queryKey: ["properties", "by-client", selectedClientId],
    queryFn: () => PropertiesApi.list({ clientId: selectedClientId }).then((r) => r.data),
    enabled: !!selectedClientId,
  });
  const { data: serviceTypes } = useQuery({ queryKey: ["service-types"], queryFn: () => ServiceTypesApi.list().then((r) => r.data) });
  const { data: staff } = useQuery({ queryKey: ["users", "active"], queryFn: () => UsersApi.list({ active: "true" }).then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => JobsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      const occ = (res.data as any).occurrencesCreated;
      toast.success(occ ? `Job created with ${occ} future occurrences` : "Job created");
      setShowCreate(false);
      setSelectedClientId("");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const assignedUserIds = form.getAll("assignedUserIds") as string[];
    const checklistRaw = String(form.get("checklist") ?? "");
    const checklist = checklistRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    const recurrenceEndDate = form.get("recurrenceEndDate");

    createMutation.mutate({
      title: form.get("title"),
      description: form.get("description") || undefined,
      clientId: form.get("clientId"),
      propertyId: form.get("propertyId"),
      serviceTypeId: form.get("serviceTypeId") || undefined,
      priority: form.get("priority"),
      recurrence: form.get("recurrence"),
      recurrenceEndDate: recurrenceEndDate ? new Date(String(recurrenceEndDate)).toISOString() : undefined,
      scheduledStart: new Date(String(form.get("scheduledStart"))).toISOString(),
      scheduledEnd: new Date(String(form.get("scheduledEnd"))).toISOString(),
      price: Number(form.get("price") || 0),
      assignedUserIds: assignedUserIds.length ? assignedUserIds : undefined,
      checklist: checklist.length ? checklist : undefined,
    });
  }

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";
  const defaultStart = useMemo(() => toInputDateTime(new Date(Date.now() + 60 * 60 * 1000)), [showCreate]);
  const defaultEnd = useMemo(() => toInputDateTime(new Date(Date.now() + 2 * 60 * 60 * 1000)), [showCreate]);

  return (
    <div>
      <PageHeader
        title="Jobs & Scheduling"
        subtitle="Plan, assign, and track cleaning jobs"
        actions={canManage ? <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New job</button> : undefined}
      />

      <div className="mb-4 flex gap-2">
        <button className={`btn-secondary ${!statusFilter ? "bg-brand-50 text-brand-700" : ""}`} onClick={() => setStatusFilter("")}>All</button>
        {STATUSES.map((s) => (
          <button key={s} className={`btn-secondary ${statusFilter === s ? "bg-brand-50 text-brand-700" : ""}`} onClick={() => setStatusFilter(s)}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Job</th>
              <th>Client / Property</th>
              <th>Scheduled</th>
              <th>Assigned</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400">Loading…</td></tr>
            )}
            {jobs?.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50">
                <td>
                  <Link to={`/jobs/${job.id}`} className="font-medium text-brand-700 hover:underline">{job.title}</Link>
                  {job.recurrence !== "NONE" && <div className="text-xs text-slate-500">Repeats {job.recurrence.toLowerCase()}</div>}
                </td>
                <td className="text-slate-600">
                  <div>{job.client.name}</div>
                  <div className="text-xs text-slate-500">{job.property.name}</div>
                </td>
                <td className="text-slate-600">{formatDateTime(job.scheduledStart)}</td>
                <td className="text-slate-600">{job.assignments.map((a) => a.user.name).join(", ") || "Unassigned"}</td>
                <td><Badge value={job.priority} /></td>
                <td><Badge value={job.status} /></td>
                <td>{formatCurrency(job.price)}</td>
              </tr>
            ))}
            {!isLoading && jobs?.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400">No jobs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New job" onClose={() => setShowCreate(false)} wide>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Title *</label>
              <input name="title" className="input" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Client *</label>
                <select name="clientId" className="input" required value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                  <option value="">Select a client…</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Property *</label>
                <select name="propertyId" className="input" required disabled={!selectedClientId}>
                  <option value="">Select a property…</option>
                  {properties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Service type</label>
                <select name="serviceTypeId" className="input" onChange={(e) => {
                  const st = serviceTypes?.find((s) => s.id === e.target.value);
                  if (st) {
                    const priceInput = document.querySelector<HTMLInputElement>('input[name="price"]');
                    if (priceInput && !priceInput.value) priceInput.value = String(st.defaultPrice);
                  }
                }}>
                  <option value="">None</option>
                  {serviceTypes?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Price ($)</label>
                <input name="price" type="number" step="0.01" min="0" className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start *</label>
                <input name="scheduledStart" type="datetime-local" defaultValue={defaultStart} className="input" required />
              </div>
              <div>
                <label className="label">End *</label>
                <input name="scheduledEnd" type="datetime-local" defaultValue={defaultEnd} className="input" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Priority</label>
                <select name="priority" className="input" defaultValue="NORMAL">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Repeats</label>
                <select name="recurrence" className="input" defaultValue="NONE">
                  {RECURRENCES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Repeat until</label>
                <input name="recurrenceEndDate" type="date" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Assign staff</label>
              <select name="assignedUserIds" className="input" multiple size={4}>
                {staff?.filter((u) => u.role !== "ADMIN" || true).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">Cmd/Ctrl-click to select multiple. First selected is lead.</p>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" className="input" rows={2} />
            </div>
            <div>
              <label className="label">Checklist (one item per line)</label>
              <textarea name="checklist" className="input" rows={3} placeholder={"Vacuum floors\nEmpty trash\nSanitize restrooms"} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>Create job</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
