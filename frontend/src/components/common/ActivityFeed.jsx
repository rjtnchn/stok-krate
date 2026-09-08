// Compact ledger feed for the dashboards. Six columns of transaction data
// crushed into a narrow panel is unreadable, so each movement becomes a
// three-line entry instead — item, then lot · type · signed quantity, then who
// and when. The full tabular view lives on the transaction ledger page.

import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, RotateCcw, SlidersHorizontal, Ban } from "lucide-react";

const TYPE_META = {
  receipt: { label: "Receipt", icon: ArrowUpRight },
  reservation: { label: "Reservation", icon: RotateCcw },
  fulfillment: { label: "Fulfillment", icon: ArrowDownRight },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal },
  cancellation: { label: "Cancellation", icon: Ban },
};

function formatWhen(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function signed(quantity) {
  const n = Number(quantity);
  return n > 0 ? `+${n}` : `${n}`;
}

export default function ActivityFeed({ transactions, limit = 5, viewAllTo, showUser = true }) {
  const entries = transactions.slice(0, limit);

  if (entries.length === 0) {
    return (
      <p className="px-3.5 py-6 text-center text-[13px] text-steel">No recent stock movements.</p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {entries.map((tx) => {
          const meta = TYPE_META[tx.transaction_type] ?? { label: tx.transaction_type, icon: null };
          const Icon = meta.icon;
          return (
            <li key={tx.id} className="flex items-start gap-2.5 px-3.5 py-2">
              {/* A normal movement is not an alert — the tile and the quantity
                  stay neutral, and the signed number carries the direction. */}
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-paper-dim text-steel">
                {Icon && <Icon size={12} strokeWidth={2.5} aria-hidden="true" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{tx.item_name}</div>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[12px]">
                  <span className="code text-steel">{tx.lot_number}</span>
                  <span aria-hidden="true" className="text-steel-soft">
                    ·
                  </span>
                  <span className="text-steel">{meta.label}</span>
                  <span className="num font-semibold text-ink">{signed(tx.quantity)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-steel-soft">
                  {showUser && tx.user_name ? `${tx.user_name} · ` : ""}
                  {formatWhen(tx.timestamp)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {viewAllTo && (
        <div className="border-t border-line px-3.5 py-2">
          <Link
            to={viewAllTo}
            className="text-[12px] font-semibold text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}
