// components/LoginPage.jsx
// POST /api/auth/login via AuthContext's login(). On success, role is set
// in context and the caller (App.jsx's HomeRedirect) sends the user to the
// right dashboard.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../api/auth";
import { getErrorMessage } from "../api/client";
import Spinner from "./Spinner";
import "../styles/admin.css";

// Set to false once your backend + POST /api/auth/login exist, to remove
// this button from the login screen entirely.
const SHOW_DEV_BYPASS = true;

export default function LoginPage() {
  const { login, setDevRole } = useCurrentUser();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username, password });
      // HomeRedirect (in App.jsx) sends the user to the right dashboard
      // based on the role that login() just set.
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't log in. Check your username and password."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDevBypass(role) {
    setDevRole(role);
    navigate("/", { replace: true });
  }

  return (
    <div className="admin-page login-page">
      <h1>Log in</h1>
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <label className="form-field">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="form-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="state-msg state-msg--error">{error}</p>}

        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting && <Spinner label="Logging in" />}
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </div>
      </form>

      {SHOW_DEV_BYPASS && (
        <div className="admin-section">
          <p className="state-msg">
            No backend yet? Skip login and browse the app as a fake user:
          </p>
          <div className="header-actions">
            <button onClick={() => handleDevBypass("admin")}>Continue as Admin (dev)</button>
            <button onClick={() => handleDevBypass("staff")}>Continue as Staff (dev)</button>
          </div>
        </div>
      )}
    </div>
  );
}