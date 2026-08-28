// components/ExpiryWarningRow.jsx
// FR-15 — days until expiry computed client-side from expiry_date
// FR-21 — Resolve button, PUT /api/alerts/{id}/resolve, 409 ALREADY_RESOLVED handling

import { useState } from "react";
import { api, ApiError } from "../api/client";

function formatDate(value) {
  return new Date(value).toLocaleString();
}

// Whole days remaining until expiry_date, counting from today. Negative
// means already expired.
export function daysUntilExpiry(expiryDate) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / MS_PER_DAY);
}

export default function ExpiryWarningRow({ alert, onResolved, readOnly = false }) {
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  if (resolved) return null;

  const daysLeft = daysUntilExpiry(alert.expiry_date);
  const daysLeftLabel =
    daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} day(s) ago` : `${daysLeft} day(s) left`;

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
    <>
      <tr>
        <td>{alert.lot_number}</td>
        <td>{alert.item_name}</td>
        <td>{formatDate(alert.expiry_date)}</td>
        <td className={daysLeft <= 0 ? "text-critical" : undefined}>{daysLeftLabel}</td>
        <td>{alert.quantity_on_hand}</td>
        <td>{formatDate(alert.created_at)}</td>
        {!readOnly && (
          <td>
            <button onClick={handleResolve} disabled={working}>
              Resolve
            </button>
          </td>
        )}
      </tr>
      {error && (
        <tr>
          <td colSpan={readOnly ? 6 : 7}>
            <p className="state-msg state-msg--error">{error}</p>
          </td>
        </tr>
      )}
    </>
  );
}
