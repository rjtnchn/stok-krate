// FR-06, FR-06b, FR-08 — Staff + Admin form for POST /api/items/{item_id}/batches

import { useState } from "react";
import { api, ApiError } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, Label, Input, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EMPTY_FORM = { lot_number: "", quantity: "", received_date: "", expiry_date: "" };

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
      onReceived?.(batch);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        setFieldErrors(err.body.errors);
      } else {
        setFormError("Couldn't record this stock receipt. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Receive stock</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} noValidate>
          <Field>
            <Label htmlFor="lot_number">Lot number</Label>
            <Input
              id="lot_number"
              value={form.lot_number}
              onChange={(e) => updateField("lot_number", e.target.value)}
              required
            />
            <FieldError>{fieldErrors.lot_number}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
              required
            />
            <FieldError>{fieldErrors.quantity}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="received_date">Received date</Label>
            <Input
              id="received_date"
              type="date"
              value={form.received_date}
              onChange={(e) => updateField("received_date", e.target.value)}
              required
            />
            <FieldError>{fieldErrors.received_date}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="expiry_date">Expiry date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={form.expiry_date}
              onChange={(e) => updateField("expiry_date", e.target.value)}
              required
            />
            <FieldError>{fieldErrors.expiry_date}</FieldError>
          </Field>

          {formError && <p className="mb-4 rounded-md bg-rust-bg px-3 py-2 text-sm text-rust">{formError}</p>}
          {confirmation && (
            <p className="mb-4 rounded-md bg-teal-bg px-3 py-2 text-sm text-teal">{confirmation}</p>
          )}

          <Button type="submit" variant="signal" disabled={submitting}>
            {submitting ? "Receiving…" : "Receive stock"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ReceiveStockForm(props) {
  return (
    <RoleGuard allow={["admin", "staff"]}>
      <ReceiveStockFormInner {...props} />
    </RoleGuard>
  );
}
