// FR-15 / FR-21 — days until expiry is computed client-side from expiry_date and
// stated in words, so "how urgent is this?" doesn't depend on reading a colour.

import { useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/api/client";
import { expiryStatus, formatDay as formatDate } from "@/lib/inventory";
import { Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function useResolve(alert, onResolved) {
  const [resolvedInfo, setResolvedInfo] = useState(null);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  async function handleResolve() {
    setError(null);
    setWorking(true);
    try {
      const updated = await api.resolveAlert(alert.id);
      setResolvedInfo(updated);
      onResolved?.(alert.id, updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.body?.code === "ALREADY_RESOLVED") {
        setError("This alert has already been resolved.");
      } else {
        setError("Couldn't resolve this alert. Please try again.");
      }
    } finally {
      setWorking(false);
    }
  }

  return { resolvedInfo, error, working, handleResolve };
}

export default function ExpiryWarningRow({ alert, onResolved, readOnly = false }) {
  const { resolvedInfo, error, working, handleResolve } = useResolve(alert, onResolved);
  const status = expiryStatus(alert.expiry_date);

  return (
    <>
      <Tr className={resolvedInfo ? "opacity-60" : undefined}>
        <Td className="code text-[12px] text-steel">{alert.lot_number}</Td>
        <Td className="font-medium">{alert.item_name}</Td>
        <Td className="whitespace-nowrap text-steel">{formatDate(alert.expiry_date)}</Td>
        <Td>
          <Badge tone={status.tone} icon={CalendarClock}>
            {status.label}
          </Badge>
        </Td>
        <Td className="num text-right">{alert.quantity_on_hand}</Td>
        {!readOnly && (
          <Td className="text-right">
            {resolvedInfo ? (
              <span className="inline-flex flex-col items-end gap-0.5">
                <Badge tone="good" icon={CheckCircle2}>
                  Resolved
                </Badge>
                <span className="text-[11px] text-steel">
                  by {resolvedInfo.resolved_by_name ?? `user #${resolvedInfo.resolved_by}`}
                </span>
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={handleResolve} disabled={working}>
                {working ? "Resolving…" : "Resolve alert"}
              </Button>
            )}
          </Td>
        )}
      </Tr>

      {error && (
        <Tr>
          <Td colSpan={readOnly ? 5 : 6} className="bg-rust-bg text-[12px] text-rust">
            {error}
          </Td>
        </Tr>
      )}
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-steel-soft">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] text-ink">{children}</div>
    </div>
  );
}

// Mobile presentation keeps expiry urgency and the Resolve action visible
// without requiring a sideways scroll through the desktop ledger columns.
export function ExpiryWarningCard({ alert, onResolved, readOnly = false }) {
  const { resolvedInfo, error, working, handleResolve } = useResolve(alert, onResolved);
  const status = expiryStatus(alert.expiry_date);

  return (
    <div className={`rounded-lg border border-line bg-white ${resolvedInfo ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-ink">{alert.item_name}</div>
          <div className="code text-[11px] text-steel">Lot {alert.lot_number}</div>
        </div>
        <Badge tone={status.tone} icon={CalendarClock}>
          {status.label}
        </Badge>
      </div>

      <div className="px-3 py-2.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expires">
            <span className="whitespace-nowrap text-steel">{formatDate(alert.expiry_date)}</span>
          </Field>
          <Field label="On hand">
            <span className="num font-semibold">{alert.quantity_on_hand}</span>
          </Field>
        </div>

        {!readOnly && (
          resolvedInfo ? (
            <div className="mt-2.5 flex items-center gap-2">
              <Badge tone="good" icon={CheckCircle2}>Resolved</Badge>
              <span className="text-[11px] text-steel">
                by {resolvedInfo.resolved_by_name ?? `user #${resolvedInfo.resolved_by}`}
              </span>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-2.5 w-full"
              onClick={handleResolve}
              disabled={working}
            >
              {working ? "Resolving…" : "Resolve alert"}
            </Button>
          )
        )}

        {error && (
          <p role="alert" className="mt-2 rounded-sm bg-rust-bg px-2 py-1.5 text-[12px] text-rust">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
