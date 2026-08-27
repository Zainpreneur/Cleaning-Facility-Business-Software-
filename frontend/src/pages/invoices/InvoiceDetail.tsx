import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { InvoicesApi } from "../../api/resources";
import { api, apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/Badge";
import { formatCurrency, formatDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import type { InvoiceStatus, PaymentMethod } from "../../types";

const STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"];
const METHODS: PaymentMethod[] = ["CARD", "CASH", "CHECK", "BANK_TRANSFER", "OTHER"];

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => InvoicesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices", id] });

  const statusMutation = useMutation({
    mutationFn: (status: string) => InvoicesApi.update(id!, { status }),
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const voidMutation = useMutation({
    mutationFn: () => InvoicesApi.void(id!),
    onSuccess: () => { toast.success("Invoice voided"); navigate("/invoices"); },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => InvoicesApi.addPayment(id!, data),
    onSuccess: () => { invalidate(); toast.success("Payment recorded"); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoiceNumber ?? "invoice"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  function handlePayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    paymentMutation.mutate({
      amount: Number(form.get("amount")),
      method: form.get("method"),
      reference: form.get("reference") || undefined,
    });
    e.currentTarget.reset();
  }

  if (isLoading || !invoice) return <div className="text-slate-400">Loading…</div>;

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";
  const balance = invoice.total - invoice.amountPaid;

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={invoice.client.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge value={invoice.status} />
            {canManage && (
              <select className="input w-auto text-sm" value="" onChange={(e) => e.target.value && statusMutation.mutate(e.target.value)}>
                <option value="">Change status…</option>
                {STATUSES.filter((s) => s !== invoice.status).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            )}
            <button className="btn-secondary" onClick={handleDownloadPdf} disabled={downloading}>
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
            {user?.role === "ADMIN" && invoice.status !== "VOID" && (
              <button className="btn-danger" onClick={() => voidMutation.mutate()}>Void</button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Line items</h2>
          <table className="table-base">
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li) => (
                <tr key={li.id}>
                  <td>{li.description}</td>
                  <td>{li.quantity}</td>
                  <td>{formatCurrency(li.unitPrice)}</td>
                  <td>{formatCurrency(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <dl className="w-56 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatCurrency(invoice.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Tax ({invoice.taxRate}%)</dt><dd>{formatCurrency(invoice.taxAmount)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatCurrency(invoice.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd>{formatCurrency(invoice.amountPaid)}</dd></div>
              <div className="flex justify-between font-semibold text-brand-700"><dt>Balance due</dt><dd>{formatCurrency(balance)}</dd></div>
            </dl>
          </div>
          {invoice.notes && <p className="mt-3 text-sm text-slate-600">{invoice.notes}</p>}
        </div>

        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Details</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Issued</dt><dd>{formatDate(invoice.issueDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Due</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
          </dl>

          <h2 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Payments</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>{formatDate(p.paidAt)} · {p.method}</span>
                <span className="font-medium">{formatCurrency(p.amount)}</span>
              </li>
            ))}
            {invoice.payments.length === 0 && <li className="py-2 text-slate-400">No payments yet.</li>}
          </ul>

          {canManage && balance > 0 && invoice.status !== "VOID" && (
            <form onSubmit={handlePayment} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <div>
                <label className="label">Amount</label>
                <input name="amount" type="number" step="0.01" min="0.01" max={balance} defaultValue={balance} className="input" required />
              </div>
              <div>
                <label className="label">Method</label>
                <select name="method" className="input" defaultValue="CARD">
                  {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Reference (optional)</label>
                <input name="reference" className="input" />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={paymentMutation.isPending}>Record payment</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
