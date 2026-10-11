// POST /api/auth/login via AuthContext's login(). On success, role is set in
// context and App.jsx's HomeRedirect sends the user to the right dashboard.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { Input, Field, Label } from "@/components/ui/input";

// Set to false once the backend + POST /api/auth/login exist, to remove these
// buttons from the login screen entirely.
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't log in. Check your email and password."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDevBypass(role) {
    setDevRole(role);
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-shell px-4 py-10">
      <div className="w-full max-w-[340px]">
        <div className="mb-5 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-bright/15 text-signal-bright">
            <BrandMark size={21} />
          </span>
          <span className="font-display text-base font-bold leading-none text-onshell">
            stok<span className="text-signal-bright">·</span>krate
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-onshell-dim">
              WalangBrownout
            </span>
          </span>
        </div>

        <div className="rounded-lg border border-line bg-white px-4 py-4">
          <h1 className="mb-4 font-display text-lg font-bold text-ink">Sign in</h1>

          <form onSubmit={handleSubmit} noValidate>
            <Field>
              <Label htmlFor="username">Email</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin@wb.com"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </Field>

            <Field>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </Field>

            <p aria-live="polite" className="contents">
              {error && (
                <span
                  id="login-error"
                  className="mb-3 block rounded-sm bg-rust-bg px-2.5 py-1.5 text-[13px] text-rust"
                >
                  {error}
                </span>
              )}
            </p>

            <Button type="submit" variant="signal" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {SHOW_DEV_BYPASS && (
            <div className="mt-4 border-t border-line pt-3.5">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDevBypass("admin")}
                >
                  Demo: Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDevBypass("staff")}
                >
                  Demo: Staff
                </Button>
              </div>
              <p className="mt-2.5 text-center text-[11px] leading-relaxed text-steel-soft">
                <span className="code">admin@wb.com</span> / <span className="code">admin123</span>
                <br />
                <span className="code">staff@wb.com</span> / <span className="code">staff123</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
