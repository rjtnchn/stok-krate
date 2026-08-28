// components/ExpiryRiskReportPage.jsx
// FR-24 — GET /api/reports/expiry-risk, highlight rows where days_until_expiry <= 7

import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { RoleGuard } from "../api/auth";
import { daysUntilExpiry } from "./ExpiryWarningRow";
import "../styles/admin.css";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function ExpiryRiskReportPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getExpiryRiskReport();
      setRows(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-page">
      <h1>Expiry risk report</h1>

      {status === "loading" && <p className="state-msg">Loading report…</p>}
      {status === "error" && (
        <p className="state-msg state-msg--error">
          Couldn't load the report. <button onClick={load}>Retry</button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && <p className="state-msg">No expiry risk data.</p>}

      {status === "ready" && rows.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item name</th>
              <th>Lot number</th>
              <th>On hand</th>
              <th>Expiry date</th>
              <th>Days until expiry</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              // days_until_expiry is expected from the API; computed client-side as a fallback
              const days = row.days_until_expiry ?? daysUntilExpiry(row.expiry_date);
              const highRisk = days <= 7;
              return (
                <tr
                  key={`${row.item_id}-${row.lot_number}`}
                  className={highRisk ? "row--critical" : undefined}
                >
                  <td>{row.item_name}</td>
                  <td>{row.lot_number}</td>
                  <td>{row.on_hand}</td>
                  <td>{formatDate(row.expiry_date)}</td>
                  <td>{days}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ExpiryRiskReportPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ExpiryRiskReportPageInner />
    </RoleGuard>
  );
}

