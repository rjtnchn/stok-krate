// components/CreateItemForm.jsx
// FR-05, FR-05b — Admin-only form for POST /api/items

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { RoleGuard } from "../api/auth";
import Spinner from "./Spinner";
import "../styles/admin.css";

const EMPTY_FORM = {
  sku: "",
  name: "",
  category: "",
  turnover_category: "",
  seasonal_flag: false,
  reorder_point: "",
  safety_factor: "",
};

function CreateItemFormInner() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // clear that field's error as soon as the user edits it
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
      await api.createItem(payload);
      // On 201: refresh items list by navigating back to it
      navigate("/admin/items", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        // Server returns field-level errors, e.g. { sku: "already taken" }
        setFieldErrors(err.body.errors);
      } else {
        setFormError("Couldn't create the item. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <h1>Create item</h1>
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
            {submitting && <Spinner label="Creating item" />}
            {submitting ? "Creating…" : "Create item"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateItemForm() {
  return (
    <RoleGuard allow={["admin"]}>
      <CreateItemFormInner />
    </RoleGuard>
  );
}
