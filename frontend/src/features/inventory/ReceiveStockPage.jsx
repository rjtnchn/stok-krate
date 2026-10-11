// FR-08 — Staff-reachable stock receipt. Picks an item, then hands off to the
// existing ReceiveStockForm; the batches list underneath shows the new lot
// landing, including its computed available quantity.

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import ReceiveStockForm from "./ReceiveStockForm";
import BatchesList from "./BatchesList";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, Label, Select } from "@/components/ui/input";
import Spinner from "@/components/common/Spinner";

function ReceiveStockPageInner() {
  const [items, setItems] = useState([]);
  const [itemsStatus, setItemsStatus] = useState("loading");
  const [itemId, setItemId] = useState("");
  const batchesRef = useRef(null);

  const loadItems = useCallback(async () => {
    setItemsStatus("loading");
    try {
      const data = await api.getItems();
      setItems(data);
      setItemsStatus("ready");
    } catch {
      setItemsStatus("error");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Receive stock"
        description="Log a delivery against an item. Each receipt writes a stock transaction under your name."
      />

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <Field className="mb-0">
            <Label htmlFor="receive-item">Item</Label>
            {itemsStatus === "loading" && (
              <span className="flex h-10 items-center gap-2 text-sm text-steel">
                <Spinner label="Loading items" /> Loading items…
              </span>
            )}
            {itemsStatus === "error" && (
              <span className="text-sm text-rust">
                Couldn&apos;t load items.{" "}
                <button onClick={loadItems} className="underline">
                  Retry
                </button>
              </span>
            )}
            {itemsStatus === "ready" && (
              <Select
                id="receive-item"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
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

      {itemId && (
        <>
          <ReceiveStockForm
            itemId={itemId}
            onReceived={() => batchesRef.current?.refresh()}
          />

          <Card>
            <CardHeader>
              <CardTitle>Batches for this item</CardTitle>
            </CardHeader>
            <CardContent>
              <BatchesList ref={batchesRef} itemId={itemId} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ReceiveStockPage() {
  return (
    <RoleGuard allow={["admin", "staff"]}>
      <ReceiveStockPageInner />
    </RoleGuard>
  );
}
