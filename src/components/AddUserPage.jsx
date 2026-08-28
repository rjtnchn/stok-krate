// components/AddUserPage.jsx
// Placeholder — no backend endpoint for user creation yet. The form is
// fully interactive client-side (validates, shows a success state) but
// doesn't persist anywhere. Swap the fake submit for a real
// api.createUser(payload) call once that endpoint exists.

import { useState } from "react";
import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

const ROLES = ["staff", "admin"];

function AddUserPageInner() {
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
      // No backend yet — just simulate success locally.
      setSubmitted(true);
      setForm({ name: "", username: "", role: "staff" });
    }
  }

  return (
    <div className="admin-page">
      <h1>Add user</h1>
      <p className="state-msg">
        Sample form — user creation isn't wired to a real backend yet, so submitting just
        shows a success message below.
      </p>

      {submitted && (
        <p className="state-msg state-msg--success">User added (not actually saved — no backend yet).</p>
      )}

      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="form-field">
          Name
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Juan Garcia"
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>

        <label className="form-field">
          Username
          <input
            type="text"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="e.g. jgarcia"
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </label>

        <label className="form-field">
          Role
          <select value={form.role} onChange={(e) => update("role", e.target.value)}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary">
            Add user
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddUserPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AddUserPageInner />
    </RoleGuard>
  );
}