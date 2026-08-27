import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UsersApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { Badge } from "../../components/Badge";
import type { Role } from "../../types";

const ROLES: Role[] = ["ADMIN", "MANAGER", "STAFF"];

export function StaffList() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: staff, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => UsersApi.list().then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => UsersApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Staff account created"); setShowCreate(false); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => UsersApi.deactivate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Account deactivated"); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => UsersApi.update(id, { active: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("Account reactivated"); },
  });

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      phone: form.get("phone") || undefined,
      role: form.get("role"),
      hourlyRate: form.get("hourlyRate") ? Number(form.get("hourlyRate")) : undefined,
    });
  }

  return (
    <div>
      <PageHeader title="Staff" subtitle="Manage team accounts and roles" actions={<button className="btn-primary" onClick={() => setShowCreate(true)}>+ New staff account</button>} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Hourly rate</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {staff?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="font-medium">{u.name}</td>
                <td className="text-slate-600">{u.email}</td>
                <td><Badge value={u.role} /></td>
                <td>{u.hourlyRate ? `$${u.hourlyRate.toFixed(2)}/hr` : "—"}</td>
                <td>{u.active ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                <td>
                  {u.active ? (
                    <button className="text-xs text-red-600 hover:underline" onClick={() => deactivateMutation.mutate(u.id)}>Deactivate</button>
                  ) : (
                    <button className="text-xs text-brand-700 hover:underline" onClick={() => reactivateMutation.mutate(u.id)}>Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New staff account" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input name="email" type="email" className="input" required />
            </div>
            <div>
              <label className="label">Temporary password *</label>
              <input name="password" type="password" minLength={8} className="input" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select name="role" className="input" defaultValue="STAFF">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Hourly rate ($)</label>
                <input name="hourlyRate" type="number" step="0.01" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>Create account</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
