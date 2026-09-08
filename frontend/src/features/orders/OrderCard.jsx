// Mobile order card. Every field a picker needs is labelled and visible without
// horizontal scrolling, and Fulfil / Cancel sit in the card itself rather than
// off the right edge of a table.

import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { useOrderActions, availableOf, ORDER_STATUS_TONE } from "./useOrderActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_ICON = { pending: Clock, fulfilled: CheckCircle2, cancelled: XCircle };

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Cell({ label, children, className }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-steel-soft">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] text-ink">{children}</div>
    </div>
  );
}

export default function OrderCard({ order, onStatusChange }) {
  const { status, working, actionError, updatedBatch, fulfil, cancel } = useOrderActions(
    order,
    onStatusChange
  );

  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="code text-[12px] font-semibold text-ink">Order #{order.id}</span>
        <Badge tone={ORDER_STATUS_TONE[status] || "neutral"} icon={STATUS_ICON[status]}>
          {status}
        </Badge>
      </div>

      <div className="px-3 py-2.5">
        <Cell label="Item">
          <span className="font-medium">{order.item_name}</span>
        </Cell>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <Cell label="Lot">
            <span className="code text-[12px]">{order.batch_lot_number}</span>
          </Cell>
          <Cell label="Quantity">
            <span className="num font-semibold">{order.quantity}</span>
          </Cell>
          <Cell label="Placed">
            <span className="text-steel">{formatDate(order.created_at)}</span>
          </Cell>
        </div>

        {status === "pending" && (
          <div className="mt-3 flex gap-2">
            <Button variant="signal" className="flex-1" onClick={fulfil} disabled={working}>
              {working ? "Working…" : "Fulfil"}
            </Button>
            <Button variant="outline" onClick={cancel} disabled={working}>
              Cancel
            </Button>
          </div>
        )}

        {actionError && (
          <p className="mt-2 rounded-sm bg-rust-bg px-2 py-1.5 text-[12px] text-rust">
            {actionError}
          </p>
        )}

        {updatedBatch && (
          <p className="mt-2 rounded-sm bg-teal-bg px-2 py-1.5 text-[12px] text-teal">
            Lot <span className="code">{updatedBatch.lot_number}</span> — on hand{" "}
            <span className="num font-semibold">{updatedBatch.quantity_on_hand}</span>, reserved{" "}
            <span className="num font-semibold">{updatedBatch.reserved_qty}</span>, available{" "}
            <span className="num font-semibold">{availableOf(updatedBatch)}</span> (computed)
          </p>
        )}
      </div>
    </div>
  );
}
