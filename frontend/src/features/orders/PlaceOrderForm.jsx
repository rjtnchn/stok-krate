// FR-09, FR-12, FR-13 — the Place order tab of the orders workspace: item
// selector + quantity, POST /api/orders. OrdersPage owns the page header and
// the tab strip.

import { useEffect, useState } from "react";
import { api, ApiError } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/common/Spinner";

export default function PlaceOrderForm({ onOrderPlaced }) {
  const [items, setItems] = useState([]);
  const [itemsStatus, setItemsStatus] = useState("loading"); // loading | ready | error

  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [formError, setFormError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      setItemsStatus("loading");
      try {
        const data = await api.getItems();
        if (cancelled) return;
        setItems(data);
        setItemsStatus("ready");
      } catch {
        if (!cancelled) setItemsStatus("error");
      }
    }
    loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setConfirmation(null);
    setSubmitting(true);

    try {
      const order = await api.createOrder({ item_id: itemId, quantity: Number(quantity) });
      const lotNote = order.batch_lot_number ? ` — assigned to lot ${order.batch_lot_number}` : "";
      setConfirmation(`Order #${order.id} placed — status: ${order.status}${lotNote}.`);
      setItemId("");
      setQuantity("");
      onOrderPlaced?.(order);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.code === "INSUFFICIENT_STOCK") {
        const { available, requested } = err.body;
        setFormError(`Not enough stock available (available: ${available}, requested: ${requested}).`);
      } else {
        setFormError("Couldn't place the order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <p className="mb-3 text-[13px] text-steel">
        One item, one quantity — the system assigns the FEFO batch automatically.
      </p>

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} noValidate>
            <Field>
              <Label htmlFor="order-item">Item</Label>
              {itemsStatus === "loading" && (
                <span className="flex h-10 items-center gap-2 text-sm text-steel">
                  <Spinner label="Loading items" /> Loading items…
                </span>
              )}
              {itemsStatus === "error" && (
                <span className="text-sm text-rust">Couldn&apos;t load items.</span>
              )}
              {itemsStatus === "ready" && (
                <Select id="order-item" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
                  <option value="">Select an item…</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field>
              <Label htmlFor="order-quantity">Quantity</Label>
              <Input
                id="order-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </Field>

            {formError && <p className="mb-4 rounded-md bg-rust-bg px-3 py-2 text-sm text-rust">{formError}</p>}
            {confirmation && (
              <p className="mb-4 rounded-md bg-teal-bg px-3 py-2 text-sm text-teal">{confirmation}</p>
            )}

            <Button type="submit" variant="signal" disabled={submitting || itemsStatus !== "ready"}>
              {submitting ? "Placing order…" : "Place order"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
