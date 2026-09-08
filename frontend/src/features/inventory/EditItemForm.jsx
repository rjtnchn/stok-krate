// FR-05 — Admin-only pre-populated form for PUT /api/items/{id}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, Select, FieldError, Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormSkeleton } from "@/components/ui/skeleton";

function EditItemFormInner() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
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
      current_sf: form.seasonal_flag ? Number(form.current_sf) : 1.0,
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
    return (
      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <FormSkeleton fields={5} />
        </CardContent>
      </Card>
    );
  }
  if (loadStatus === "not_found") return <p className="text-sm text-rust">Item not found.</p>;
  if (loadStatus === "error") {
    return <p className="text-sm text-rust">Couldn&apos;t load this item. Please try again.</p>;
  }

  return (
    <div>
      <PageHeader
        title="Edit item"
        description={
          form.current_sf !== undefined ? (
            <>
              Current seasonal factor:{" "}
              <Badge tone="pending" className="align-middle">
                Sf = {form.current_sf}
              </Badge>
            </>
          ) : undefined
        }
      />

      <Card className="max-w-lg">
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
                value={form.seasonal_flag ? form.current_sf ?? "" : "1.00"}
                onChange={(e) => updateField("current_sf", e.target.value)}
                disabled={!form.seasonal_flag}
                required
              />
              <p className="mt-1 text-xs text-steel">
                {form.seasonal_flag
                  ? "Recalculated monthly by Check Now: 2.50 for March–May, 0.30 for August–February."
                  : "Seasonal items only — non-seasonal items stay at the 1.00 baseline."}
              </p>
              <FieldError>{fieldErrors.current_sf}</FieldError>
            </Field>

            {formError && <p className="mb-4 rounded-md bg-rust-bg px-3 py-2 text-sm text-rust">{formError}</p>}

            <Button type="submit" variant="signal" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
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
