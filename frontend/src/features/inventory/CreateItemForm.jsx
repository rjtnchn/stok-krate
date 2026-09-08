// FR-05, FR-05b — the Add item tab of the items workspace: POST /api/items.
// ItemsPage owns the page header, the tab strip and the admin role guard.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, Select, FieldError, Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EMPTY_FORM = {
  sku: "",
  name: "",
  category: "",
  turnover_category: "",
  seasonal_flag: false,
  reorder_point: "",
  current_sf: "1.00",
};

export default function CreateItemForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

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
      current_sf: Number(form.current_sf),
    };

    try {
      await api.createItem(payload);
      navigate("/admin/items", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        setFieldErrors(err.body.errors);
      } else {
        setFormError("Couldn't create the item. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} noValidate>
            <Field>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={(e) => updateField("sku", e.target.value)} required />
              <FieldError>{fieldErrors.sku}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
              <FieldError>{fieldErrors.name}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                placeholder="e.g. Appliances"
                required
              />
              <FieldError>{fieldErrors.category}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="turnover_category">ABC category</Label>
              <Select
                id="turnover_category"
                value={form.turnover_category}
                onChange={(e) => updateField("turnover_category", e.target.value)}
                required
              >
                <option value="">Select…</option>
                <option value="A">A — high value, close monitoring</option>
                <option value="B">B — moderate value, routine checks</option>
                <option value="C">C — low cost, rotation matters (FEFO)</option>
              </Select>
              <FieldError>{fieldErrors.turnover_category}</FieldError>
            </Field>

            <Field>
              <Checkbox
                label="Seasonal item"
                checked={form.seasonal_flag}
                onChange={(e) => updateField("seasonal_flag", e.target.checked)}
              />
            </Field>

            <Field>
              <Label htmlFor="reorder_point">Reorder point</Label>
              <Input
                id="reorder_point"
                type="number"
                min="0"
                value={form.reorder_point}
                onChange={(e) => updateField("reorder_point", e.target.value)}
                required
              />
              <FieldError>{fieldErrors.reorder_point}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="current_sf">Sf (seasonal coefficient)</Label>
              <Input
                id="current_sf"
                type="number"
                min="0"
                step="0.01"
                value={form.seasonal_flag ? form.current_sf : "1.00"}
                onChange={(e) => updateField("current_sf", e.target.value)}
                disabled={!form.seasonal_flag}
                required
              />
              <p className="mt-1 text-xs text-steel">
                {form.seasonal_flag
                  ? "Recalculated monthly: 2.50 for March–May, 0.30 for August–February."
                  : "Seasonal items only — non-seasonal items stay at the 1.00 baseline."}
              </p>
              <FieldError>{fieldErrors.current_sf}</FieldError>
            </Field>

            {formError && <p className="mb-4 rounded-md bg-rust-bg px-3 py-2 text-sm text-rust">{formError}</p>}

            <Button type="submit" variant="signal" disabled={submitting}>
              {submitting ? "Creating…" : "Create item"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
