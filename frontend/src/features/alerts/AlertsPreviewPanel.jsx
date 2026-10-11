// Dashboard view of what currently needs attention. Every number is labelled —
// a bare "−14" tells a presenter nothing — and severity is carried by an icon
// and a word as well as colour.

import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { daysUntilExpiry, reorderSeverity, reorderDeficit } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";

const MAX_ITEMS = 5;

function Metric({ label, value, tone }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-steel-soft">
        {label}
      </div>
      <div
        className={`num text-[13px] font-semibold ${tone === "critical" ? "text-rust" : tone === "warning" ? "text-amber" : "text-ink"
          }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function AlertsPreviewPanel({ reorderAlerts, expiryAlerts }) {
  const reorderRows = [...reorderAlerts]
    .sort((a, b) => a.available_qty - a.reorder_point - (b.available_qty - b.reorder_point))
    .map((alert) => {
      const severity = reorderSeverity(alert.available_qty, alert.reorder_point);
      return {
        id: `reorder-${alert.id}`,
        icon: severity.icon,
        tone: severity.tone,
        title: alert.item_name,
        code: alert.sku,
        severityLabel: severity.label,
        metrics: [
          { label: "Available", value: alert.available_qty, tone: severity.tone === "critical" ? "critical" : "warning" },
          { label: "Reorder point", value: alert.reorder_point },
          { label: "Deficit", value: reorderDeficit(alert.available_qty, alert.reorder_point), tone: "critical" },
        ],
      };
    });

  const expiryRows = [...expiryAlerts]
    .sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date))
    .map((alert) => {
      const days = daysUntilExpiry(alert.expiry_date);
      const expired = days <= 0;
      return {
        id: `expiry-${alert.id}`,
        icon: CalendarClock,
        tone: expired ? "critical" : "pending",
        title: alert.item_name,
        code: alert.lot_number,
        severityLabel: expired ? "Expired" : "Expiring soon",
        metrics: [
          {
            label: "Days left",
            value: expired ? `${Math.abs(days)} overdue` : days,
            tone: expired ? "critical" : "warning",
          },
          { label: "On hand", value: alert.quantity_on_hand },
        ],
      };
    });

  const rows = [...reorderRows, ...expiryRows].slice(0, MAX_ITEMS);
  const total = reorderAlerts.length + expiryAlerts.length;

  if (total === 0) {
    return (
      <p className="px-3.5 py-6 text-center text-[13px] text-steel">
        Nothing needs attention right now.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {rows.map(({ id, icon: Icon, tone, title, code, severityLabel, metrics }) => (
          <li key={id} className="px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm ${tone === "critical" ? "bg-rust-bg text-rust" : "bg-amber-bg text-amber"
                  }`}
              >
                <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="text-[13px] font-medium text-ink">{title}</span>
              <span className="code text-[11px] text-steel">{code}</span>
              <Badge tone={tone} className="ml-auto">
                {severityLabel}
              </Badge>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 pl-7">
              {metrics.map((m) => (
                <Metric key={m.label} {...m} />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 border-t border-line px-3.5 py-2">
        <Link
          to="/admin/alerts"
          className="text-[12px] font-semibold text-teal underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
        >
          Review all alerts
        </Link>
        {total > rows.length && (
          <span className="num text-[11px] text-steel-soft">
            {rows.length} of {total} shown
          </span>
        )}
      </div>
    </div>
  );
}
