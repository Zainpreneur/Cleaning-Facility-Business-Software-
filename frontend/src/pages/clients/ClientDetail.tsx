import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ClientsApi, PropertiesApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { Badge } from "../../components/Badge";
import { formatCurrency, formatDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import type { PropertyType } from "../../types";

const PROPERTY_TYPES: PropertyType[] = [
  "OFFICE",
  "RESIDENTIAL",
  "RETAIL",
  "WAREHOUSE",
  "MEDICAL",
  "INDUSTRIAL",
  "EDUCATIONAL",
  "OTHER",
];

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["clients", id],
    queryFn: () => ClientsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => ClientsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", id] });
      toast.success("Client updated");
      setShowEdit(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => ClientsApi.deactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deactivated");
      navigate("/clients");
    },
  });

  const addPropertyMutation = useMutation({
    mutationFn: (data: any) => PropertiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", id] });
      toast.success("Property added");
      setShowAddProperty(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading || !client) return <div className="text-slate-400">Loading…</div>;

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      name: form.get("name"),
      companyName: form.get("companyName") || undefined,
      email: form.get("email") || undefined,
      phone: form.get("phone") || undefined,
      billingAddress: form.get("billingAddress") || undefined,
      notes: form.get("notes") || undefined,
    });
  }

  function handleAddProperty(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addPropertyMutation.mutate({
      clientId: id,
      name: form.get("name"),
      type: form.get("type"),
      addressLine1: form.get("addressLine1"),
      city: form.get("city") || undefined,
      state: form.get("state") || undefined,
      zip: form.get("zip") || undefined,
      squareFootage: form.get("squareFootage") ? Number(form.get("squareFootage")) : undefined,
    });
  }

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={client.companyName ?? undefined}
        actions={
          canManage ? (
            <>
              <button className="btn-secondary" onClick={() => setShowEdit(true)}>
                Edit
              </button>
              {user?.role === "ADMIN" && (
                <button className="btn-danger" onClick={() => deactivateMutation.mutate()}>
                  Deactivate
                </button>
              )}
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Contact info</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{client.email || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd>{client.phone || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Billing address</dt><dd className="text-right">{client.billingAddress || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{client.active ? "Active" : "Inactive"}</dd></div>
          </dl>
          {client.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{client.notes}</p>}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Properties</h2>
            {canManage && (
              <button className="btn-secondary text-xs" onClick={() => setShowAddProperty(true)}>
                + Add property
              </button>
            )}
          </div>
          {(!client.properties || client.properties.length === 0) && (
            <p className="text-sm text-slate-400">No properties yet.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {client.properties?.map((p) => (
              <li key={p.id} className="py-2">
                <Link to={`/properties/${p.id}`} className="flex items-center justify-between hover:text-brand-700">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.addressLine1}{p.city ? `, ${p.city}` : ""}</div>
                  </div>
                  <Badge value={p.type} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent jobs</h2>
          {(!client.jobs || client.jobs.length === 0) && <p className="text-sm text-slate-400">No jobs yet.</p>}
          <ul className="divide-y divide-slate-100">
            {client.jobs?.map((job) => (
              <li key={job.id} className="py-2">
                <Link to={`/jobs/${job.id}`} className="flex items-center justify-between hover:text-brand-700">
                  <div>
                    <div className="text-sm font-medium">{job.title}</div>
                    <div className="text-xs text-slate-500">{formatDate(job.scheduledStart)}</div>
                  </div>
                  <Badge value={job.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent invoices</h2>
          {(!client.invoices || client.invoices.length === 0) && <p className="text-sm text-slate-400">No invoices yet.</p>}
          <ul className="divide-y divide-slate-100">
            {client.invoices?.map((inv) => (
              <li key={inv.id} className="py-2">
                <Link to={`/invoices/${inv.id}`} className="flex items-center justify-between hover:text-brand-700">
                  <div>
                    <div className="text-sm font-medium">{inv.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">{formatCurrency(inv.total)}</div>
                  </div>
                  <Badge value={inv.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit client" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div>
              <label className="label">Name *</label>
              <input name="name" defaultValue={client.name} className="input" required />
            </div>
            <div>
              <label className="label">Company name</label>
              <input name="companyName" defaultValue={client.companyName ?? ""} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" defaultValue={client.email ?? ""} className="input" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input name="phone" defaultValue={client.phone ?? ""} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Billing address</label>
              <input name="billingAddress" defaultValue={client.billingAddress ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" defaultValue={client.notes ?? ""} className="input" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showAddProperty && (
        <Modal title="Add property" onClose={() => setShowAddProperty(false)}>
          <form onSubmit={handleAddProperty} className="space-y-3">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="type" className="input" defaultValue="OFFICE">
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Address *</label>
              <input name="addressLine1" className="input" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">City</label>
                <input name="city" className="input" />
              </div>
              <div>
                <label className="label">State</label>
                <input name="state" className="input" />
              </div>
              <div>
                <label className="label">Zip</label>
                <input name="zip" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Square footage</label>
              <input name="squareFootage" type="number" className="input" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowAddProperty(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={addPropertyMutation.isPending}>
                Add property
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
