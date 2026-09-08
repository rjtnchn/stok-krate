// FR-20 / FR-21 — a reorder alert has to be readable without inferring what a
// number means from its position, so Available, Reorder point, Deficit,
// Severity and Created are labelled in both presentations. Desktop is a table
// row under real headers; mobile is a labelled card. Resolve is the row action.

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/api/client";
import {
  reorderSeverity,
  reorderDeficit,
  formatShortDay as formatDate,
} from "@/lib/inventory";
import { Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function useResolve(alert, onResolved) {
  const [resolvedInfo, setResolvedInfo] = useState(null);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  async function resolve() {
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

  return { resolvedInfo, error, working, resolve };
}

function ResolvedNote({ info }) {
  return (
    <span className="text-[11px] text-steel">
      by {info.resolved_by_name ?? `user #${info.resolved_by}`}
      {info.resolved_at ? ` · ${formatDate(info.resolved_at)}` : ""}
    </span>
  );
}

export default function ReorderAlertRow({ alert, onResolved }) {
  const { resolvedInfo, error, working, resolve } = useResolve(alert, onResolved);
  const severity = reorderSeverity(alert.available_qty, alert.reorder_point);
  const deficit = reorderDeficit(alert.available_qty, alert.reorder_point);

  return (
    <>
      <Tr className={resolvedInfo ? "opacity-60" : undefined}>
        <Td>
          <div className="font-medium text-ink">{alert.item_name}</div>
          <div className="code text-[11px] text-steel">{alert.sku}</div>
        </Td>
        <Td className="num text-right font-semibold text-rust">{alert.available_qty}</Td>
        <Td className="num text-right text-steel">{alert.reorder_point}</Td>
        <Td className="num text-right font-semibold text-rust">
          {deficit > 0 ? `−${deficit}` : "0"}
        </Td>
        <Td>
          <Badge tone={severity.tone} icon={severity.icon}>
            {severity.label}
          </Badge>
        </Td>
        <Td className="whitespace-nowrap text-steel">{formatDate(alert.created_at)}</Td>
        <Td className="text-right">
          {resolvedInfo ? (
            <span className="inline-flex flex-col items-end gap-0.5">
              <Badge tone="good" icon={CheckCircle2}>
                Resolved
              </Badge>
              <ResolvedNote info={resolvedInfo} />
            </span>
          ) : (
            <Button size="sm" variant="outline" onClick={resolve} disabled={working}>
              {working ? "Resolving…" : "Resolve alert"}
            </Button>
          )}
        </Td>
      </Tr>

      {error && (
        <Tr>
          <Td colSpan={7} className="bg-rust-bg text-[12px] text-rust">
            {error}
          </Td>
        </Tr>
      )}
    </>
  );
}

function Field({ label, children, tone }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-steel-soft">
        {label}
      </div>
      <div
        className={`num mt-0.5 text-[13px] font-semibold ${tone === "critical" ? "text-rust" : "text-ink"
          }`}
      >
        {children}
      </div>
    </div>
  );
}

// Mobile presentation of the same alert — same labels, no horizontal scrolling.
export function ReorderAlertCard({ alert, onResolved }) {
  const { resolvedInfo, error, working, resolve } = useResolve(alert, onResolved);
  const severity = reorderSeverity(alert.available_qty, alert.reorder_point);
  const deficit = reorderDeficit(alert.available_qty, alert.reorder_point);

  return (
    <div className={`rounded-lg border border-line bg-white ${resolvedInfo ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-ink">{alert.item_name}</div>
          <div className="code text-[11px] text-steel">{alert.sku}</div>
        </div>
        <Badge tone={severity.tone} icon={severity.icon}>
          {severity.label}
        </Badge>
      </div>

      <div className="px-3 py-2.5">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Available" tone="critical">
            {alert.available_qty}
          </Field>
          <Field label="Reorder point">{alert.reorder_point}</Field>
          <Field label="Deficit" tone="critical">
            {deficit > 0 ? `−${deficit}` : "0"}
          </Field>
        </div>

        <div className="mt-2 text-[11px] text-steel">Created {formatDate(alert.created_at)}</div>

        {resolvedInfo ? (
          <div className="mt-2.5 flex items-center gap-2">
            <Badge tone="good" icon={CheckCircle2}>
              Resolved
            </Badge>
            <ResolvedNote info={resolvedInfo} />
          </div>
        ) : (
          <Button
            variant="outline"
            className="mt-2.5 w-full"
            onClick={resolve}
            disabled={working}
          >
            {working ? "Resolving…" : "Resolve alert"}
          </Button>
        )}

        {error && (
          <p className="mt-2 rounded-sm bg-rust-bg px-2 py-1.5 text-[12px] text-rust">{error}</p>
        )}
      </div>
    </div>
  );
}
