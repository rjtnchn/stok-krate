// components/PlaceOrderForm.jsx
// FR-09, FR-12, FR-13 — item selector + quantity, POST /api/orders

import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import Spinner from "./Spinner";
import "../styles/admin.css";

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
      const order = await api.createOrder({
        item_id: itemId,
        quantity: Number(quantity),
      });
      // On 201: show confirmation with order ID and status "pending"
      // The server assigns the batch (FEFO — earliest expiry first); surface
      // that assignment so it's visible without a separate batch lookup.
      const lotNote = order.batch_lot_number ? ` — assigned to lot ${order.batch_lot_number}` : "";
      setConfirmation(`Order #${order.id} placed — status: ${order.status}${lotNote}.`);
      setItemId("");
      setQuantity("");
      onOrderPlaced?.(order);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        err.body?.code === "INSUFFICIENT_STOCK"
      ) {
        const { available, requested } = err.body;
        setFormError(
          `Not enough stock available (available: ${available}, requested: ${requested})`
        );
      } else {
        setFormError("Couldn't place the order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <h1>Place order</h1>
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <label className="form-field">
          Item
          {itemsStatus === "loading" && <span className="state-msg">Loading items…</span>}
          {itemsStatus === "error" && (
            <span className="state-msg state-msg--error">Couldn't load items.</span>
          )}
          {itemsStatus === "ready" && (
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              <option value="">Select an item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="form-field">
          Quantity
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>

        {formError && <p className="state-msg state-msg--error">{formError}</p>}
        {confirmation && <p className="state-msg state-msg--success">{confirmation}</p>}

        <div className="admin-form__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || itemsStatus !== "ready"}
          >
            {submitting && <Spinner label="Placing order" />}
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </div>
      </form>
    </div>
  );
}

