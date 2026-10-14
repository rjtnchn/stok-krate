// The Add user tab of the access workspace. UsersPage owns the page header,
// the tab strip and the admin role guard (FR-03).
//
// Placeholder — no backend endpoint for user creation yet. Swap the fake
// submit for a real api.createUser(payload) call once that endpoint exists.

import { useState } from "react";
import { api, getErrorMessage } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "Staff", label: "Staff", description: "Places and fulfils orders" },
  { value: "Admin", label: "Admin", description: "Full system access" },
];

export default function AddUserPanel() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Staff" });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await api.createUser(form);
      setSuccessMessage("User created successfully.");
      setForm({ name: "", email: "", password: "", role: "Staff" });
    } catch (err) {
      if (err.data?.errors) {
        setErrors(err.data.errors);
      } else {
        setErrors({ general: getErrorMessage(err) });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      {successMessage && (
        <p className="mb-4 rounded-md bg-teal-bg px-3 py-2 text-sm text-teal">
          {successMessage}
        </p>
      )}

      {errors.general && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {errors.general}
        </p>
      )}

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit}>
            <Field>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Juan Garcia"
              />
              <FieldError>{errors.name?.[0] || errors.name}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="e.g. jgarcia@wb.com"
              />
              <FieldError>{errors.email?.[0] || errors.email}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="At least 8 characters"
              />
              <FieldError>{errors.password?.[0] || errors.password}</FieldError>
            </Field>

            <Field>
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update("role", r.value)}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left",
                      form.role === r.value ? "border-signal bg-teal-bg" : "border-line bg-white hover:border-steel-soft"
                    )}
                  >
                    <div className="text-sm font-semibold text-ink">{r.label}</div>
                    <div className="text-xs text-steel">{r.description}</div>
                  </button>
                ))}
              </div>
              <FieldError>{errors.role?.[0] || errors.role}</FieldError>
            </Field>

            <Button type="submit" variant="signal" className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? "Adding user..." : "Add user"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
