// components/AddBatchPage.jsx
// Placeholder standalone "Add batch" page with a sample item picker.
// api.createBatch(itemId, payload) is real, but this page uses a
// hardcoded item list (SAMPLE_ITEMS) instead of api.getItems() so it
// works without depending on the mock data shape. Swap SAMPLE_ITEMS for
// a real api.getItems() call, and wire handleSubmit to
// api.createBatch(itemId, payload), once you're ready to connect it.

import { useState } from "react";
import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

const SAMPLE_ITEMS = [
  { id: "AC-100", name: "AC Unit - 1.5HP" },
  { id: "FIL-LATE", name: "HVAC Air Filter" },
  { id: "TH-A1", name: "Smart Thermostat" },
  { id: "FAN-B1", name: "Ceiling Fan" },
];

function AddBatchPageInner() {
  const [form, setForm] = useState({
    itemId: SAMPLE_ITEMS[0].id,
    lotNumber: "",
    quantity: "",
    expiryDate: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.lotNumber.trim()) nextErrors.lotNumber = "Lot number is required.";
    if (!form.quantity || Number(form.quantity) <= 0)
      nextErrors.quantity = "Quantity must be greater than 0.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      // No backend wiring yet — just simulate success locally.
      setSubmitted(true);
      setForm({ itemId: SAMPLE_ITEMS[0].id, lotNumber: "", quantity: "", expiryDate: "" });
    }
  }

  return (
    <div className="admin-page">
      <h1>Add batch</h1>
      <p className="state-msg">
        Sample form — not yet wired to api.createBatch(itemId, payload), so submitting just
        shows a success message below.
      </p>

      {submitted && (
        <p className="state-msg state-msg--success">Batch added (not actually saved — no backend wiring yet).</p>
      )}

      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="form-field">
          Item
          <select value={form.itemId} onChange={(e) => update("itemId", e.target.value)}>
            {SAMPLE_ITEMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.id})
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          Lot number
          <input
            type="text"
            value={form.lotNumber}
            onChange={(e) => update("lotNumber", e.target.value)}
            placeholder="e.g. AC-L2"
          />
          {errors.lotNumber && <span className="field-error">{errors.lotNumber}</span>}
        </label>

        <label className="form-field">
          Quantity
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            placeholder="e.g. 20"
          />
          {errors.quantity && <span className="field-error">{errors.quantity}</span>}
        </label>

        <label className="form-field">
          Expiry date (optional)
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => update("expiryDate", e.target.value)}
          />
        </label>

        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary">
            Add batch
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddBatchPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AddBatchPageInner />
    </RoleGuard>
  );
}