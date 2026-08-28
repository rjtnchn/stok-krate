// components/StockLevelsReportPage.jsx
// FR-XX — GET /api/reports/stock-levels, highlight rows where on_hand <= reorder_threshold

import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

function StockLevelsReportPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getStockLevelsReport();
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
      <h1>Stock level report</h1>

      {status === "loading" && <p className="state-msg">Loading report…</p>}
      {status === "error" && (
        <p className="state-msg state-msg--error">
          Couldn't load the report. <button onClick={load}>Retry</button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && <p className="state-msg">No stock level data.</p>}

      {status === "ready" && rows.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item name</th>
              <th>SKU</th>
              <th>On hand</th>
              <th>Reorder threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              // low stock is flagged when on_hand is at or below the reorder threshold
              const lowStock = row.on_hand <= row.reorder_threshold;
              return (
                <tr
                  key={row.item_id}
                  className={lowStock ? "row--critical" : undefined}
                >
                  <td>{row.item_name}</td>
                  <td>{row.sku}</td>
                  <td>{row.on_hand}</td>
                  <td>{row.reorder_threshold}</td>
                  <td>{lowStock ? "Reorder needed" : "OK"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function StockLevelsReportPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <StockLevelsReportPageInner />
    </RoleGuard>
  );
}