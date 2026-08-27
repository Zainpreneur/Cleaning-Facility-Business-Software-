import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ClientsApi, InvoicesApi, JobsApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { Badge } from "../../components/Badge";
import { formatCurrency, formatDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import type { InvoiceStatus } from "../../types";

const STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"];

export function InvoiceList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [clientId, setClientId] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: () => InvoicesApi.list(statusFilter ? { status: statusFilter } : undefined).then((r) => r.data),
  });

  const { data: clients } = useQuery({ queryKey: ["clients", "all"], queryFn: () => ClientsApi.list({ active: "true" }).then((r) => r.data) });
  const { data: clientJobs } = useQuery({
    queryKey: ["jobs", "for-invoice", clientId],
    queryFn: () => JobsApi.list({ clientId, status: "COMPLETED" }).then((r) => r.data),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: () => InvoicesApi.createFromJobs(selectedJobIds, 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
      setShowCreate(false);
      setClientId("");
      setSelectedJobIds([]);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedJobIds.length === 0) {
      toast.error("Select at least one completed job to invoice");
      return;
    }
    createMutation.mutate();
  }

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Bill clients for completed work and track payments"
        actions={canManage ? <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New invoice</button> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
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
              <th>Invoice #</th>
              <th>Client</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {invoices?.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td><Link to={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">{inv.invoiceNumber}</Link></td>
                <td>{inv.client.name}</td>
                <td className="text-slate-600">{formatDate(inv.issueDate)}</td>
                <td className="text-slate-600">{formatDate(inv.dueDate)}</td>
                <td>{formatCurrency(inv.total)}</td>
                <td className={inv.total - inv.amountPaid > 0 ? "text-red-600" : "text-emerald-600"}>{formatCurrency(inv.total - inv.amountPaid)}</td>
                <td><Badge value={inv.status} /></td>
              </tr>
            ))}
            {!isLoading && invoices?.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New invoice from completed jobs" onClose={() => setShowCreate(false)} wide>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Client *</label>
              <select className="input" value={clientId} onChange={(e) => { setClientId(e.target.value); setSelectedJobIds([]); }} required>
                <option value="">Select a client…</option>
                {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {clientId && (
              <div>
                <label className="label">Completed jobs to invoice</label>
                {clientJobs?.length === 0 && <p className="text-sm text-slate-400">No completed, unbilled jobs for this client.</p>}
                <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
                  {clientJobs?.map((job) => (
                    <li key={job.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedJobIds.includes(job.id)}
                        onChange={(e) =>
                          setSelectedJobIds((prev) => (e.target.checked ? [...prev, job.id] : prev.filter((id) => id !== job.id)))
                        }
                      />
                      <span className="flex-1">{job.title} — {job.property.name}</span>
                      <span className="text-slate-500">{formatDate(job.scheduledStart)}</span>
                      <span className="font-medium">{formatCurrency(job.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending || selectedJobIds.length === 0}>
                Create invoice
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
