import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { InventoryApi, JobsApi, UsersApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import type { JobStatus } from "../../types";

const STATUS_FLOW: JobStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [usageItemId, setUsageItemId] = useState("");
  const [usageQty, setUsageQty] = useState("1");

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", id],
    queryFn: () => JobsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });
  const { data: staff } = useQuery({ queryKey: ["users", "active"], queryFn: () => UsersApi.list({ active: "true" }).then((r) => r.data) });
  const { data: inventory } = useQuery({ queryKey: ["inventory"], queryFn: () => InventoryApi.list().then((r) => r.data) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["jobs", id] });

  const statusMutation = useMutation({
    mutationFn: (status: string) => JobsApi.setStatus(id!, status),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const checklistAddMutation = useMutation({
    mutationFn: (description: string) => JobsApi.addChecklistItem(id!, description),
    onSuccess: () => { invalidate(); setNewChecklistItem(""); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const checklistToggleMutation = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) => JobsApi.toggleChecklistItem(itemId, completed),
    onSuccess: invalidate,
  });

  const checklistRemoveMutation = useMutation({
    mutationFn: (itemId: string) => JobsApi.removeChecklistItem(itemId),
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => JobsApi.assign(id!, userId),
    onSuccess: () => { invalidate(); setAssignUserId(""); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const unassignMutation = useMutation({
    mutationFn: (userId: string) => JobsApi.unassign(id!, userId),
    onSuccess: invalidate,
  });

  const clockInMutation = useMutation({
    mutationFn: () => JobsApi.clockIn(id!),
    onSuccess: () => { invalidate(); toast.success("Clocked in"); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const clockOutMutation = useMutation({
    mutationFn: (entryId: string) => JobsApi.clockOut(entryId),
    onSuccess: () => { invalidate(); toast.success("Clocked out"); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const usageMutation = useMutation({
    mutationFn: () => JobsApi.logInventoryUsage(id!, usageItemId, Number(usageQty)),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Usage logged");
      setUsageItemId("");
      setUsageQty("1");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading || !job) return <div className="text-slate-400">Loading…</div>;

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";
  const myOpenEntry = job.timeEntries?.find((t) => t.userId === user?.id && !t.clockOut);
  const assignedUserIds = new Set(job.assignments.map((a) => a.userId));

  return (
    <div>
      <PageHeader
        title={job.title}
        subtitle={`${job.client.name} · ${job.property.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge value={job.status} />
            {canManage && (
              <select
                className="input w-auto text-sm"
                value=""
                onChange={(e) => e.target.value && statusMutation.mutate(e.target.value)}
              >
                <option value="">Change status…</option>
                {STATUS_FLOW.filter((s) => s !== job.status).map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Details</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Scheduled</dt><dd>{formatDateTime(job.scheduledStart)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Ends</dt><dd>{formatDateTime(job.scheduledEnd)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Priority</dt><dd><Badge value={job.priority} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Repeats</dt><dd>{job.recurrence}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Price</dt><dd>{formatCurrency(job.price)}</dd></div>
            {job.serviceType && <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd>{job.serviceType.name}</dd></div>}
          </dl>
          {job.description && <p className="mt-3 text-sm text-slate-600">{job.description}</p>}

          <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-700">Assigned staff</h3>
          <ul className="space-y-1">
            {job.assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.user.name} {a.isLead && <span className="text-xs text-brand-600">(lead)</span>}</span>
                {canManage && (
                  <button className="text-xs text-red-600 hover:underline" onClick={() => unassignMutation.mutate(a.userId)}>Remove</button>
                )}
              </li>
            ))}
            {job.assignments.length === 0 && <li className="text-sm text-slate-400">Unassigned</li>}
          </ul>
          {canManage && (
            <div className="mt-2 flex gap-2">
              <select className="input text-sm" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
                <option value="">Add staff…</option>
                {staff?.filter((u) => !assignedUserIds.has(u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button className="btn-secondary text-sm" disabled={!assignUserId} onClick={() => assignMutation.mutate(assignUserId)}>Add</button>
            </div>
          )}

          {!myOpenEntry ? (
            <button className="btn-primary mt-4 w-full" onClick={() => clockInMutation.mutate()}>Clock in</button>
          ) : (
            <button className="btn-secondary mt-4 w-full" onClick={() => clockOutMutation.mutate(myOpenEntry.id)}>Clock out</button>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Checklist</h2>
          <ul className="divide-y divide-slate-100">
            {job.checklistItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => checklistToggleMutation.mutate({ itemId: item.id, completed: e.target.checked })}
                />
                <span className={`flex-1 text-sm ${item.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.description}</span>
                {canManage && (
                  <button className="text-xs text-red-600 hover:underline" onClick={() => checklistRemoveMutation.mutate(item.id)}>Remove</button>
                )}
              </li>
            ))}
            {job.checklistItems.length === 0 && <li className="py-2 text-sm text-slate-400">No checklist items.</li>}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (newChecklistItem.trim()) checklistAddMutation.mutate(newChecklistItem.trim());
            }}
          >
            <input className="input" placeholder="Add checklist item…" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} />
            <button type="submit" className="btn-secondary">Add</button>
          </form>

          <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-700">Time entries</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {job.timeEntries?.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <span>{t.user?.name}</span>
                <span className="text-slate-500">
                  {formatDateTime(t.clockIn)} — {t.clockOut ? formatDateTime(t.clockOut) : "in progress"}
                </span>
              </li>
            ))}
            {(!job.timeEntries || job.timeEntries.length === 0) && <li className="py-2 text-slate-400">No time entries yet.</li>}
          </ul>

          <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-700">Supplies used</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {job.inventoryUsages?.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2">
                <span>{u.inventoryItem?.name}</span>
                <span className="text-slate-500">{u.quantityUsed} {u.inventoryItem?.unit}</span>
              </li>
            ))}
            {(!job.inventoryUsages || job.inventoryUsages.length === 0) && <li className="py-2 text-slate-400">No supplies logged.</li>}
          </ul>
          <div className="mt-2 flex gap-2">
            <select className="input text-sm" value={usageItemId} onChange={(e) => setUsageItemId(e.target.value)}>
              <option value="">Select item…</option>
              {inventory?.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input className="input w-24 text-sm" type="number" min="0.01" step="0.01" value={usageQty} onChange={(e) => setUsageQty(e.target.value)} />
            <button className="btn-secondary text-sm" disabled={!usageItemId} onClick={() => usageMutation.mutate()}>Log usage</button>
          </div>

          <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-700">Inspections</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {job.inspections?.map((insp) => (
              <li key={insp.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span>By {insp.inspector?.name}</span>
                  <span className="font-semibold">{insp.overallScore?.toFixed(1)} / 5</span>
                </div>
                {insp.notes && <p className="text-xs text-slate-500">{insp.notes}</p>}
              </li>
            ))}
            {(!job.inspections || job.inspections.length === 0) && <li className="py-2 text-slate-400">No inspections yet. <Link to="/inspections" className="text-brand-700 hover:underline">Add one</Link>.</li>}
          </ul>

          {job.childJobs && job.childJobs.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-700">Future occurrences</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {job.childJobs.map((c) => (
                  <li key={c.id} className="py-2">
                    <Link to={`/jobs/${c.id}`} className="flex items-center justify-between hover:text-brand-700">
                      <span>{formatDateTime(c.scheduledStart)}</span>
                      <Badge value={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
