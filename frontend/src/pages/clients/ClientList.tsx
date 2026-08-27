import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ClientsApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";

export function ClientList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => ClientsApi.list(search ? { search } : undefined).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => ClientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created");
      setShowCreate(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name"),
      companyName: form.get("companyName") || undefined,
      email: form.get("email") || undefined,
      phone: form.get("phone") || undefined,
      billingAddress: form.get("billingAddress") || undefined,
      notes: form.get("notes") || undefined,
    });
  }

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Businesses and property owners you provide services to"
        actions={
          canManage ? (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              + New client
            </button>
          ) : undefined
        }
      />

      <input
        className="input mb-4 max-w-sm"
        placeholder="Search clients…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Properties</th>
              <th>Jobs</th>
              <th>Invoices</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">Loading…</td>
              </tr>
            )}
            {clients?.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td>
                  <Link to={`/clients/${client.id}`} className="font-medium text-brand-700 hover:underline">
                    {client.name}
                  </Link>
                  {client.companyName && <div className="text-xs text-slate-500">{client.companyName}</div>}
                </td>
                <td className="text-slate-600">
                  {client.email && <div>{client.email}</div>}
                  {client.phone && <div>{client.phone}</div>}
                </td>
                <td>{client._count?.properties ?? 0}</td>
                <td>{client._count?.jobs ?? 0}</td>
                <td>{client._count?.invoices ?? 0}</td>
              </tr>
            ))}
            {!isLoading && clients?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">No clients yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New client" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">Company name</label>
              <input name="companyName" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" className="input" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input name="phone" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Billing address</label>
              <input name="billingAddress" className="input" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" className="input" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                Create client
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
