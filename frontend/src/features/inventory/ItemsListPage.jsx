import { useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, Select, FieldError, Checkbox } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import BatchesList from "./BatchesList";
import CreateItemForm from "./CreateItemForm";

const CATEGORY_TONE = { A: "ink", B: "outline", C: "neutral" };

export default function ItemsListPanel() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    sku: "",
    name: "",
    category: "",
    turnover_category: "A",
    seasonal_flag: false,
    reorder_point: 0,
    current_sf: 1.0,
  });
  const [editErrors, setEditErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batchesItem, setBatchesItem] = useState(null);

  const loadItems = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getItems();
      setItems(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function startEdit(item) {
    setEditingItem(item);
    setEditForm({
      sku: item.sku || "",
      name: item.name || "",
      category: item.category || "",
      turnover_category: item.turnover_category || "A",
      seasonal_flag: Boolean(item.seasonal_flag),
      reorder_point: item.reorder_point || 0,
      current_sf: item.current_sf || 1.0,
    });
    setEditErrors({});
  }

  async function handleCreated() {
    setShowCreateModal(false);
    await loadItems();
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setEditErrors({});
    setActionError(null);
    setIsUpdating(true);

    const payload = {
      ...editForm,
      reorder_point: Number(editForm.reorder_point),
      current_sf: editForm.seasonal_flag ? Number(editForm.current_sf) : 1.0,
    };

    try {
      await api.updateItem(editingItem.id, payload);
      setEditingItem(null);
      loadItems();
    } catch (err) {
      if (err.body?.errors) {
        setEditErrors(err.body.errors);
      } else {
        setActionError(getErrorMessage(err));
      }
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Items & batches"
        actions={
          <Button variant="signal" size="sm" onClick={() => setShowCreateModal(true)}>
            Add item
          </Button>
        }
      />

      {actionError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-ink">Add item</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  Close
                </Button>
              </div>
              <CreateItemForm onCreated={handleCreated} onCancel={() => setShowCreateModal(false)} />
            </CardContent>
          </Card>
        </div>
      )}

      {batchesItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto shadow-lg">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{batchesItem.name}</h3>
                  <p className="code text-xs text-steel">{batchesItem.sku}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setBatchesItem(null)}>
                  Close
                </Button>
              </div>
              <BatchesList itemId={batchesItem.id} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Item Modal Popup */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-lg">
            <CardContent className="pt-6">
              <h3 className="mb-4 font-display text-lg font-bold text-ink">
                Edit Item: {editingItem.name}
              </h3>
              <form onSubmit={handleUpdate} noValidate>
                <Field>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={editForm.sku}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    required
                  />
                  <FieldError>{editErrors.sku?.[0] || editErrors.sku}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                  <FieldError>{editErrors.name?.[0] || editErrors.name}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    required
                  />
                  <FieldError>{editErrors.category?.[0] || editErrors.category}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="turnover_category">ABC category</Label>
                  <Select
                    id="turnover_category"
                    value={editForm.turnover_category}
                    onChange={(e) => setEditForm({ ...editForm, turnover_category: e.target.value })}
                    required
                  >
                    <option value="">Select…</option>
                    <option value="A">A — high value, close monitoring</option>
                    <option value="B">B — moderate value, routine checks</option>
                    <option value="C">C — low cost, rotation matters (FEFO)</option>
                  </Select>
                  <FieldError>{editErrors.turnover_category?.[0] || editErrors.turnover_category}</FieldError>
                </Field>

                <Field>
                  <Checkbox
                    label="Seasonal item"
                    checked={editForm.seasonal_flag}
                    onChange={(e) => setEditForm({ ...editForm, seasonal_flag: e.target.checked })}
                  />
                </Field>

                <Field>
                  <Label htmlFor="reorder_point">Reorder point</Label>
                  <Input
                    id="reorder_point"
                    type="number"
                    min="0"
                    value={editForm.reorder_point}
                    onChange={(e) => setEditForm({ ...editForm, reorder_point: e.target.value })}
                    required
                  />
                  <FieldError>{editErrors.reorder_point?.[0] || editErrors.reorder_point}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="current_sf">Sf (seasonal coefficient)</Label>
                  <Input
                    id="current_sf"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.seasonal_flag ? editForm.current_sf ?? "" : "1.00"}
                    onChange={(e) => setEditForm({ ...editForm, current_sf: e.target.value })}
                    disabled={!editForm.seasonal_flag}
                    required
                  />
                  <FieldError>{editErrors.current_sf?.[0] || editErrors.current_sf}</FieldError>
                </Field>

                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="signal" size="sm" disabled={isUpdating}>
                    {isUpdating ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {status === "loading" && <TableSkeleton columns={8} rows={5} />}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load items.{" "}
          <button onClick={loadItems} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && (
        items.length === 0 ? (
          <EmptyState>No items yet. Add one using the Add item button.</EmptyState>
        ) : (
          <Table minWidth={900}>
            <THead>
              <Tr>
                <Th>SKU</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>ABC</Th>
                <Th>Seasonal</Th>
                <Th>Reorder point</Th>
                <Th>Sf</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td className="code text-[12px] text-steel">{item.sku}</Td>
                  <Td className="font-medium">{item.name}</Td>
                  <Td className="text-steel">{item.category}</Td>
                  <Td>
                    <Badge tone={CATEGORY_TONE[item.turnover_category] || "neutral"}>
                      {item.turnover_category}
                    </Badge>
                  </Td>
                  <Td>{item.seasonal_flag ? "Yes" : "No"}</Td>
                  <Td>{item.reorder_point}</Td>
                  <Td>{Number(item.current_sf).toFixed(2)}</Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setBatchesItem(item)}>
                        Batches
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                        Edit
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )
      )}
    </div>
  );
}
