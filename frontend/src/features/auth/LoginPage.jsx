import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { Input, Field, Label } from "@/components/ui/input";

export default function LoginPage() {
  const { login } = useCurrentUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Invalid email or password. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-shell px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[380px] space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-signal-bright/15 text-signal-bright mb-3">
            <BrandMark size={24} />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-onshell">
            stok<span className="text-signal-bright">·</span>krate
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-onshell-dim">
            WalangBrownout Inventory
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold text-ink">Sign in</h2>
            <p className="mt-1 text-xs text-steel">Enter your credentials to access the portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
                  className="block rounded-md bg-rust-bg px-3 py-2 text-[13px] text-rust"
                >
                  {error}
                </span>
              )}
            </p>

            <Button type="submit" variant="signal" className="w-full mt-2" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-onshell-dim">
          &copy; 2026 Stok-Krate &middot; WalangBrownout Systems
        </div>
      </div>
    </div>
  );
}
