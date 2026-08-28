// components/ShrinkageReportPage.jsx
// FR-XX — GET /api/reports/shrinkage, highlight rows where shrinkage_pct > 5

import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

const SHRINKAGE_ALERT_THRESHOLD_PCT = 5;

function formatPct(value) {
  return `${Number(value).toFixed(1)}%`;
}

function ShrinkageReportPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getShrinkageReport();
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
      <h1>Shrinkage report</h1>

      {status === "loading" && <p className="state-msg">Loading report…</p>}
      {status === "error" && (
        <p className="state-msg state-msg--error">
          Couldn't load the report. <button onClick={load}>Retry</button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && <p className="state-msg">No shrinkage data.</p>}

      {status === "ready" && rows.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item name</th>
              <th>Lot number</th>
              <th>Expected qty</th>
              <th>Actual qty</th>
              <th>Shrinkage</th>
              <th>Shrinkage %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              // shrinkage_pct is expected from the API; computed client-side as a fallback
              const shrinkageQty = row.shrinkage_qty ?? row.expected_qty - row.actual_qty;
              const shrinkagePct =
                row.shrinkage_pct ?? (row.expected_qty ? (shrinkageQty / row.expected_qty) * 100 : 0);
              const highRisk = shrinkagePct > SHRINKAGE_ALERT_THRESHOLD_PCT;
              return (
                <tr
                  key={`${row.item_id}-${row.lot_number}`}
                  className={highRisk ? "row--critical" : undefined}
                >
                  <td>{row.item_name}</td>
                  <td>{row.lot_number}</td>
                  <td>{row.expected_qty}</td>
                  <td>{row.actual_qty}</td>
                  <td>{shrinkageQty}</td>
                  <td>{formatPct(shrinkagePct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ShrinkageReportPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ShrinkageReportPageInner />
    </RoleGuard>
  );
}