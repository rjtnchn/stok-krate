// components/ReceiveStockForm.jsx
// FR-06, FR-06b, FR-08 — Staff + Admin form for POST /api/items/{item_id}/batches

import { useState } from "react";
import { api, ApiError } from "../api/client";
import { RoleGuard } from "../api/auth";
import Spinner from "./Spinner";
import "../styles/admin.css";

const EMPTY_FORM = {
  lot_number: "",
  quantity: "",
  received_date: "",
  expiry_date: "",
};

// Client-side checks that mirror the server's inline error cases, so the
// user gets instant feedback before the round trip.
function validateLocally(form) {
  const errors = {};

  if (form.quantity !== "" && Number(form.quantity) < 0) {
    errors.quantity = "Quantity cannot be negative.";
  }

  if (form.received_date && form.expiry_date) {
    if (new Date(form.expiry_date) < new Date(form.received_date)) {
      errors.expiry_date = "Expiry date cannot be before the received date.";
    }
  }

  return errors;
}

function ReceiveStockFormInner({ itemId, onReceived }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setConfirmation(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setConfirmation(null);

    const localErrors = validateLocally(form);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      lot_number: form.lot_number,
      quantity: Number(form.quantity),
      received_date: form.received_date,
      expiry_date: form.expiry_date,
    };

    try {
      const batch = await api.createBatch(itemId, payload);
      setForm(EMPTY_FORM);
      setConfirmation(
        `Received ${payload.quantity} units, lot ${payload.lot_number} — transaction type "receipt" logged.`
      );
      // On 201: refresh batches list
      onReceived?.(batch);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        // Server-side inline errors: duplicate lot number, negative quantity,
        // expiry before received date, etc.
        setFieldErrors(err.body.errors);
      } else {
        setFormError("Couldn't record this stock receipt. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <h2>Receive stock</h2>
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <label className="form-field">
          Lot number
          <input
            type="text"
            value={form.lot_number}
            onChange={(e) => updateField("lot_number", e.target.value)}
            required
          />
          {fieldErrors.lot_number && (
            <span className="field-error">{fieldErrors.lot_number}</span>
          )}
        </label>

        <label className="form-field">
          Quantity
          <input
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => updateField("quantity", e.target.value)}
            required
          />
          {fieldErrors.quantity && (
            <span className="field-error">{fieldErrors.quantity}</span>
          )}
        </label>

        <label className="form-field">
          Received date
          <input
            type="date"
            value={form.received_date}
            onChange={(e) => updateField("received_date", e.target.value)}
            required
          />
          {fieldErrors.received_date && (
            <span className="field-error">{fieldErrors.received_date}</span>
          )}
        </label>

        <label className="form-field">
          Expiry date
          <input
            type="date"
            value={form.expiry_date}
            onChange={(e) => updateField("expiry_date", e.target.value)}
            required
          />
          {fieldErrors.expiry_date && (
            <span className="field-error">{fieldErrors.expiry_date}</span>
          )}
        </label>

        {formError && <p className="state-msg state-msg--error">{formError}</p>}
        {confirmation && <p className="state-msg state-msg--success">{confirmation}</p>}

        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting && <Spinner label="Receiving stock" />}
            {submitting ? "Receiving…" : "Receive stock"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ReceiveStockForm(props) {
  return (
    <RoleGuard allow={["admin", "staff"]}>
      <ReceiveStockFormInner {...props} />
    </RoleGuard>
  );
}
