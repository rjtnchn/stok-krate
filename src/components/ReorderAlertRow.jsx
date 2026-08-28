// components/ReorderAlertRow.jsx
// FR-20 — shows available_qty vs reorder_point with a progress bar + severity badge
// FR-21 — Resolve action, PUT /api/alerts/{id}/resolve, 409 ALREADY_RESOLVED handling

import { useState } from "react";
import { api, ApiError } from "../api/client";

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

// "Critically low" once available stock has dropped to half the reorder
// point or below (or hit zero) — adjust the threshold to match your policy.
function getSeverity(availableQty, reorderPoint) {
  if (availableQty <= 0) return { label: "Out of stock", className: "badge--critical" };
  if (availableQty <= reorderPoint * 0.5) {
    return { label: "Critical", className: "badge--critical" };
  }
  return { label: "Low", className: "badge--warning" };
}

export default function ReorderAlertRow({ alert, onResolved }) {
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  if (resolved) return null;

  const severity = getSeverity(alert.available_qty, alert.reorder_point);
  const deficit = alert.available_qty - alert.reorder_point; // negative = short of the reorder point
  const suggestedOrder = Math.max(alert.reorder_point - alert.available_qty, 0);
  const progressPct = Math.max(
    0,
    Math.min(100, (alert.available_qty / alert.reorder_point) * 100)
  );

  async function handleResolve() {
    setError(null);
    setWorking(true);
    try {
      await api.resolveAlert(alert.id);
      setResolved(true);
      onResolved?.(alert.id);
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

  return (
    <div className="alert-card">
      <div className="alert-card__row">
        <div className="alert-card__item">
          <span className="alert-card__avatar">{alert.item_name?.[0] || "?"}</span>
          <div>
            <div className="alert-card__item-name">{alert.item_name}</div>
            <div className="alert-card__item-sku">{alert.sku}</div>
          </div>
        </div>

        <div className="alert-card__progress">
          <div className="progress-track">
            <div
              className={`progress-fill ${severity.className}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="alert-card__progress-label">
            {alert.available_qty} available / ROP {alert.reorder_point}
          </div>
        </div>

        <div className="alert-card__deficit">
          <span className={deficit < 0 ? "text-critical" : undefined}>{deficit}</span>
        </div>

        <div>
          <span className={`badge ${severity.className}`}>{severity.label}</span>
        </div>

        <div className="alert-card__suggested">
          {suggestedOrder > 0 ? `${suggestedOrder} units` : "—"}
        </div>

        <div className="alert-card__meta">{formatDate(alert.created_at)}</div>

        <div>
          <button className="btn btn--dark-pill" onClick={handleResolve} disabled={working}>
            {working ? "Resolving…" : "Resolve"}
          </button>
        </div>
      </div>

      {error && <p className="state-msg state-msg--error alert-card__error">{error}</p>}
    </div>
  );
}