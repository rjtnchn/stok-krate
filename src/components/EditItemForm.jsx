// components/EditItemForm.jsx
// FR-05 — Admin-only pre-populated form for PUT /api/items/{id}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { RoleGuard } from "../api/auth";
import Spinner from "./Spinner";
import "../styles/admin.css";

function EditItemFormInner() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null); // null until loaded
  const [loadStatus, setLoadStatus] = useState("loading"); // loading | ready | not_found | error
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadItem() {
      setLoadStatus("loading");
      try {
        const item = await api.getItem(itemId);
        if (cancelled) return;
        setForm(item);
        setLoadStatus("ready");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setLoadStatus("not_found");
        } else {
          setLoadStatus("error");
        }
      }
    }

    loadItem();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      ...form,
      reorder_point: Number(form.reorder_point),
      safety_factor: Number(form.safety_factor),
    };

    try {
      await api.updateItem(itemId, payload);
      navigate("/admin/items", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        setFieldErrors(err.body.errors);
      } else if (err instanceof ApiError && err.status === 404) {
        setLoadStatus("not_found");
      } else {
        setFormError("Couldn't save changes. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadStatus === "loading") {
    return <p className="state-msg">Loading item…</p>;
  }

  if (loadStatus === "not_found") {
    return <p className="state-msg state-msg--error">Item not found.</p>;
  }

  if (loadStatus === "error") {
    return (
      <p className="state-msg state-msg--error">Couldn't load this item. Please try again.</p>
    );
  }

  return (
    <div className="admin-page">
      <h1>Edit item</h1>

      {/* current_sf is server-computed (seasonal factor at this point in the
          cycle) and shown read-only — it's not a field on PUT /api/items/{id}. */}
      {form.current_sf !== undefined && (
        <p className="state-msg">
          Current seasonal factor (Sf): <strong>{form.current_sf}</strong>
        </p>
      )}

      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <label className="form-field">
          SKU
          <input
            type="text"
            value={form.sku}
            onChange={(e) => updateField("sku", e.target.value)}
            required
          />
          {fieldErrors.sku && <span className="field-error">{fieldErrors.sku}</span>}
        </label>

        <label className="form-field">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
          />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>

        <label className="form-field">
          Category
          <input
            type="text"
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            required
          />
          {fieldErrors.category && (
            <span className="field-error">{fieldErrors.category}</span>
          )}
        </label>

        <label className="form-field">
          Turnover category
          <select
            value={form.turnover_category}
            onChange={(e) => updateField("turnover_category", e.target.value)}
            required
          >
            <option value="">Select…</option>
            <option value="fast">Fast</option>
            <option value="medium">Medium</option>
            <option value="slow">Slow</option>
          </select>
          {fieldErrors.turnover_category && (
            <span className="field-error">{fieldErrors.turnover_category}</span>
          )}
        </label>

        <label className="form-field form-field--checkbox">
          <input
            type="checkbox"
            checked={form.seasonal_flag}
            onChange={(e) => updateField("seasonal_flag", e.target.checked)}
          />
          Seasonal item
        </label>

        <label className="form-field">
          Reorder point
          <input
            type="number"
            min="0"
            value={form.reorder_point}
            onChange={(e) => updateField("reorder_point", e.target.value)}
            required
          />
          {fieldErrors.reorder_point && (
            <span className="field-error">{fieldErrors.reorder_point}</span>
          )}
        </label>

        <label className="form-field">
          Sf (safety factor)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.safety_factor}
            onChange={(e) => updateField("safety_factor", e.target.value)}
            required
          />
          {fieldErrors.safety_factor && (
            <span className="field-error">{fieldErrors.safety_factor}</span>
          )}
        </label>

        {formError && <p className="state-msg state-msg--error">{formError}</p>}

        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting && <Spinner label="Saving changes" />}
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditItemForm() {
  return (
    <RoleGuard allow={["admin"]}>
      <EditItemFormInner />
    </RoleGuard>
  );
}

