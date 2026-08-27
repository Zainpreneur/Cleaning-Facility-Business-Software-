import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { InventoryApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { formatCurrency } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export function InventoryList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("10");

  const { data: items, isLoading } = useQuery({ queryKey: ["inventory"], queryFn: () => InventoryApi.list().then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => InventoryApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Item added"); setShowCreate(false); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const restockMutation = useMutation({
    mutationFn: () => InventoryApi.restock(restockId!, Number(restockQty)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Restocked"); setRestockId(null); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name"),
      sku: form.get("sku") || undefined,
      unit: form.get("unit") || "unit",
      quantityOnHand: Number(form.get("quantityOnHand") || 0),
      reorderLevel: Number(form.get("reorderLevel") || 0),
      unitCost: Number(form.get("unitCost") || 0),
    });
  }

  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Cleaning supplies and stock levels"
        actions={canManage ? <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New item</button> : undefined}
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Item</th><th>SKU</th><th>On hand</th><th>Reorder at</th><th>Unit cost</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="py-6 text-center text-slate-400">Loading…</td></tr>}
            {items?.map((item) => {
              const low = item.quantityOnHand <= item.reorderLevel;
              return (
                <tr key={item.id} className={low ? "bg-red-50" : "hover:bg-slate-50"}>
                  <td className="font-medium">{item.name}</td>
                  <td className="text-slate-500">{item.sku || "—"}</td>
                  <td className={low ? "font-semibold text-red-700" : ""}>{item.quantityOnHand} {item.unit}</td>
                  <td className="text-slate-500">{item.reorderLevel} {item.unit}</td>
                  <td>{formatCurrency(item.unitCost)}</td>
                  <td>
                    {canManage && (
                      <button className="text-xs text-brand-700 hover:underline" onClick={() => setRestockId(item.id)}>Restock</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!isLoading && items?.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No inventory items yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New inventory item" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="input" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">SKU</label>
                <input name="sku" className="input" />
              </div>
              <div>
                <label className="label">Unit</label>
                <input name="unit" className="input" defaultValue="unit" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Qty on hand</label>
                <input name="quantityOnHand" type="number" step="0.01" className="input" defaultValue={0} />
              </div>
              <div>
                <label className="label">Reorder at</label>
                <input name="reorderLevel" type="number" step="0.01" className="input" defaultValue={0} />
              </div>
              <div>
                <label className="label">Unit cost ($)</label>
                <input name="unitCost" type="number" step="0.01" className="input" defaultValue={0} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>Add item</button>
            </div>
          </form>
        </Modal>
      )}

      {restockId && (
        <Modal title="Restock item" onClose={() => setRestockId(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Quantity to add</label>
              <input type="number" min="0.01" step="0.01" className="input" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setRestockId(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => restockMutation.mutate()} disabled={restockMutation.isPending}>Restock</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
