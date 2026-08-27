import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { PropertiesApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { Badge } from "../../components/Badge";
import { formatDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ["properties", id],
    queryFn: () => PropertiesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => PropertiesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", id] });
      toast.success("Property updated");
      setShowEdit(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading || !property) return <div className="text-slate-400">Loading…</div>;

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      name: form.get("name"),
      addressLine1: form.get("addressLine1"),
      city: form.get("city") || undefined,
      state: form.get("state") || undefined,
      zip: form.get("zip") || undefined,
      squareFootage: form.get("squareFootage") ? Number(form.get("squareFootage")) : undefined,
      numberOfRooms: form.get("numberOfRooms") ? Number(form.get("numberOfRooms")) : undefined,
      accessNotes: form.get("accessNotes") || undefined,
      notes: form.get("notes") || undefined,
    });
  }

  return (
    <div>
      <PageHeader
        title={property.name}
        subtitle={(property as any).client?.name}
        actions={canManage ? <button className="btn-secondary" onClick={() => setShowEdit(true)}>Edit</button> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Details</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd><Badge value={property.type} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Address</dt><dd className="text-right">{property.addressLine1}{property.city ? `, ${property.city}` : ""}{property.state ? `, ${property.state}` : ""} {property.zip}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Square footage</dt><dd>{property.squareFootage ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Rooms</dt><dd>{property.numberOfRooms ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Client</dt><dd><Link to={`/clients/${property.clientId}`} className="text-brand-700 hover:underline">{(property as any).client?.name}</Link></dd></div>
          </dl>
          {property.accessNotes && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-500">Access notes</div>
              <p className="text-sm text-slate-600">{property.accessNotes}</p>
            </div>
          )}
          {property.notes && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-500">Notes</div>
              <p className="text-sm text-slate-600">{property.notes}</p>
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Job history</h2>
          {(!property.jobs || property.jobs.length === 0) && <p className="text-sm text-slate-400">No jobs yet.</p>}
          <ul className="divide-y divide-slate-100">
            {property.jobs?.map((job) => (
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
      </div>

      {showEdit && (
        <Modal title="Edit property" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div>
              <label className="label">Name *</label>
              <input name="name" defaultValue={property.name} className="input" required />
            </div>
            <div>
              <label className="label">Address *</label>
              <input name="addressLine1" defaultValue={property.addressLine1} className="input" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">City</label>
                <input name="city" defaultValue={property.city ?? ""} className="input" />
              </div>
              <div>
                <label className="label">State</label>
                <input name="state" defaultValue={property.state ?? ""} className="input" />
              </div>
              <div>
                <label className="label">Zip</label>
                <input name="zip" defaultValue={property.zip ?? ""} className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Square footage</label>
                <input name="squareFootage" type="number" defaultValue={property.squareFootage ?? ""} className="input" />
              </div>
              <div>
                <label className="label">Rooms</label>
                <input name="numberOfRooms" type="number" defaultValue={property.numberOfRooms ?? ""} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Access notes</label>
              <textarea name="accessNotes" defaultValue={property.accessNotes ?? ""} className="input" rows={2} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" defaultValue={property.notes ?? ""} className="input" rows={2} />
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
    </div>
  );
}
