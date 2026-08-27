import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { InspectionsApi, JobsApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { formatDateTime } from "../../utils/format";

interface AreaRow {
  area: string;
  rating: number;
}

export function InspectionList() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [jobId, setJobId] = useState("");
  const [rows, setRows] = useState<AreaRow[]>([{ area: "", rating: 5 }]);

  const { data: inspections, isLoading } = useQuery({ queryKey: ["inspections"], queryFn: () => InspectionsApi.list().then((r) => r.data) });
  const { data: jobs } = useQuery({ queryKey: ["jobs", "completed-for-inspection"], queryFn: () => JobsApi.list({ status: "COMPLETED" }).then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => InspectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      toast.success("Inspection recorded");
      setShowCreate(false);
      setJobId("");
      setRows([{ area: "", rating: 5 }]);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const items = rows.filter((r) => r.area.trim()).map((r) => ({ area: r.area, rating: r.rating }));
    if (items.length === 0) {
      toast.error("Add at least one inspection area");
      return;
    }
    createMutation.mutate({ jobId, notes: form.get("notes") || undefined, items });
  }

  return (
    <div>
      <PageHeader
        title="Inspections"
        subtitle="Quality checks after completed jobs"
        actions={<button className="btn-primary" onClick={() => setShowCreate(true)}>+ New inspection</button>}
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Job</th><th>Inspector</th><th>Date</th><th>Score</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {inspections?.map((insp) => (
              <tr key={insp.id} className="hover:bg-slate-50">
                <td><Link to={`/jobs/${insp.jobId}`} className="text-brand-700 hover:underline">{insp.job?.title}</Link></td>
                <td>{insp.inspector?.name}</td>
                <td className="text-slate-600">{formatDateTime(insp.createdAt)}</td>
                <td className="font-semibold">{insp.overallScore?.toFixed(1)} / 5</td>
              </tr>
            ))}
            {!isLoading && inspections?.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No inspections yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New inspection" onClose={() => setShowCreate(false)} wide>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Job *</label>
              <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)} required>
                <option value="">Select a completed job…</option>
                {jobs?.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.property.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Areas &amp; ratings (1-5)</label>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input"
                      placeholder="e.g. Lobby, Restrooms…"
                      value={row.area}
                      onChange={(e) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, area: e.target.value } : r)))}
                    />
                    <select
                      className="input w-24"
                      value={row.rating}
                      onChange={(e) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, rating: Number(e.target.value) } : r)))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-secondary mt-2 text-xs" onClick={() => setRows((prev) => [...prev, { area: "", rating: 5 }])}>
                + Add area
              </button>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" className="input" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending || !jobId}>Save inspection</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
