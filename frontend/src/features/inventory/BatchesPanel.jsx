// The Batches tab of the items workspace. There is no all-batches endpoint —
// SPEC §5 only defines GET /api/items/{item_id}/batches, per item — so this
// picks an item and hands off to BatchesList, which derives available_qty and
// marks the lot FEFO will draw from next. Same shape as the Receive stock page:
// one request per selection, rather than one per item on load.

import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import BatchesList from "./BatchesList";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/table";
import Spinner from "@/components/common/Spinner";

export default function BatchesPanel() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [itemId, setItemId] = useState("");

  const loadItems = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getItems();
      setItems(data);
      // Default to the first item so the tab opens with batches on screen
      // instead of an empty selector.
      setItemId((current) => current || (data[0] ? String(data[0].id) : ""));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="space-y-4">
      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <Field className="mb-0">
            <Label htmlFor="batches-item">Item</Label>
            {status === "loading" && (
              <span className="flex h-10 items-center gap-2 text-sm text-steel">
                <Spinner label="Loading items" /> Loading items…
              </span>
            )}
            {status === "error" && (
              <span className="text-sm text-rust">
                Couldn&apos;t load items.{" "}
                <button onClick={loadItems} className="underline">
                  Retry
                </button>
              </span>
            )}
            {status === "ready" && (
              <Select id="batches-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Select an item…</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </CardContent>
      </Card>

      {status === "ready" && !itemId && <EmptyState>Pick an item to see its batches.</EmptyState>}
      {itemId && <BatchesList itemId={itemId} />}
    </div>
  );
}
