// The Add user tab of the access workspace. UsersPage owns the page header,
// the tab strip and the admin role guard (FR-03).
//
// Placeholder — no backend endpoint for user creation yet. Swap the fake
// submit for a real api.createUser(payload) call once that endpoint exists.

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Label, Input, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "staff", label: "Staff", description: "Places and fulfils orders" },
  { value: "admin", label: "Admin", description: "Full system access" },
];

export default function AddUserPanel() {
  const [form, setForm] = useState({ name: "", username: "", role: "staff" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.username.trim()) nextErrors.username = "Username is required.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setSubmitted(true);
      setForm({ name: "", username: "", role: "staff" });
    }
  }

  return (
    <div className="max-w-lg">
      {submitted && (
        <p className="mb-4 rounded-md bg-teal-bg px-3 py-2 text-sm text-teal">
          User added (demo mode — not retained).
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
              <FieldError>{errors.name}</FieldError>
            </Field>

            <Field>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="e.g. jgarcia"
              />
              <FieldError>{errors.username}</FieldError>
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
            </Field>

            <Button type="submit" variant="signal" className="mt-2">
              Add user
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
