// components/AlertsListPage.jsx
// FR-15, FR-20 — Admin tabbed view: Reorder Alerts / Expiry Warnings.
// Both tabs show only unresolved alerts by default (resolved=0).

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api/client";
import { RoleGuard } from "../api/auth";
import CheckNowButton from "./CheckNowButton";
import ReorderAlertRow from "./ReorderAlertRow";
import ExpiryWarningRow, { daysUntilExpiry } from "./ExpiryWarningRow";
import "../styles/admin.css";

// Mirrors the threshold in ReorderAlertRow — kept in sync there since both
// need to agree on what counts as "Critical" vs "Low".
function reorderSeverity(availableQty, reorderPoint) {
  if (availableQty <= 0) return "critical";
  if (availableQty <= reorderPoint * 0.5) return "critical";
  return "low";
}

function AlertsListPageInner() {
  const [tab, setTab] = useState("reorder"); // reorder | expiry

  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [reorderStatus, setReorderStatus] = useState("loading");

  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [expiryStatus, setExpiryStatus] = useState("loading");

  const [reorderFilter, setReorderFilter] = useState("all"); // all | critical | low
  const [reorderSort, setReorderSort] = useState("deficit"); // deficit | name

  const loadReorderAlerts = useCallback(async () => {
    setReorderStatus("loading");
    try {
      const data = await api.getReorderAlerts(false);
      setReorderAlerts(data);
      setReorderStatus("ready");
    } catch {
      setReorderStatus("error");
    }
  }, []);

  const loadExpiryAlerts = useCallback(async () => {
    setExpiryStatus("loading");
    try {
      const data = await api.getExpiryAlerts(false);
      // Sort by nearest expiry date first
      const sorted = [...data].sort(
        (a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date)
      );
      setExpiryAlerts(sorted);
      setExpiryStatus("ready");
    } catch {
      setExpiryStatus("error");
    }
  }, []);

  useEffect(() => {
    loadReorderAlerts();
    loadExpiryAlerts();
  }, [loadReorderAlerts, loadExpiryAlerts]);

  async function handleCheckedNow() {
    await Promise.all([loadReorderAlerts(), loadExpiryAlerts()]);
  }

  function handleReorderResolved(alertId) {
    setReorderAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  function handleExpiryResolved(alertId) {
    setExpiryAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  const reorderCounts = useMemo(() => {
    let critical = 0;
    let low = 0;
    for (const a of reorderAlerts) {
      if (reorderSeverity(a.available_qty, a.reorder_point) === "critical") critical++;
      else low++;
    }
    return { critical, low, total: reorderAlerts.length };
  }, [reorderAlerts]);

  const visibleReorderAlerts = useMemo(() => {
    let list = reorderAlerts;
    if (reorderFilter !== "all") {
      list = list.filter(
        (a) => reorderSeverity(a.available_qty, a.reorder_point) === reorderFilter
      );
    }
    return [...list].sort((a, b) => {
      if (reorderSort === "name") return a.item_name.localeCompare(b.item_name);
      // "deficit" — most-over-the-reorder-point-shortfall first
      const deficitA = a.available_qty - a.reorder_point;
      const deficitB = b.available_qty - b.reorder_point;
      return deficitA - deficitB;
    });
  }, [reorderAlerts, reorderFilter, reorderSort]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Alerts</h1>
        <CheckNowButton onChecked={handleCheckedNow} />
      </div>

      <div className="tabs">
        <button
          className={`tabs__tab ${tab === "reorder" ? "tabs__tab--active" : ""}`}
          onClick={() => setTab("reorder")}
        >
          Reorder Alerts
        </button>
        <button
          className={`tabs__tab ${tab === "expiry" ? "tabs__tab--active" : ""}`}
          onClick={() => setTab("expiry")}
        >
          Expiry Warnings
        </button>
      </div>

      {tab === "reorder" && (
        <>
          {reorderStatus === "loading" && <p className="state-msg">Loading reorder alerts…</p>}
          {reorderStatus === "error" && (
            <p className="state-msg state-msg--error">
              Couldn't load reorder alerts. <button onClick={loadReorderAlerts}>Retry</button>
            </p>
          )}

          {reorderStatus === "ready" && (
            <>
              <div className="kpi-cards">
                <div className="kpi-card kpi-card--critical">
                  <span className="kpi-card__value">{reorderCounts.critical}</span>
                  <span className="kpi-card__label">Critical</span>
                </div>
                <div className="kpi-card kpi-card--warning">
                  <span className="kpi-card__value">{reorderCounts.low}</span>
                  <span className="kpi-card__label">Approaching ROP</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-card__value">{reorderCounts.total}</span>
                  <span className="kpi-card__label">Total unresolved</span>
                </div>
              </div>

              <div className="pill-filter-row">
                <div className="pill-filter">
                  <button
                    className={`pill-filter__pill ${reorderFilter === "all" ? "pill-filter__pill--active" : ""}`}
                    onClick={() => setReorderFilter("all")}
                  >
                    All alerts
                  </button>
                  <button
                    className={`pill-filter__pill ${reorderFilter === "critical" ? "pill-filter__pill--active" : ""}`}
                    onClick={() => setReorderFilter("critical")}
                  >
                    Critical
                  </button>
                  <button
                    className={`pill-filter__pill ${reorderFilter === "low" ? "pill-filter__pill--active" : ""}`}
                    onClick={() => setReorderFilter("low")}
                  >
                    Approaching ROP
                  </button>
                </div>

                <label className="sort-select">
                  Sort by
                  <select value={reorderSort} onChange={(e) => setReorderSort(e.target.value)}>
                    <option value="deficit">Biggest deficit</option>
                    <option value="name">Item name</option>
                  </select>
                </label>
              </div>

              {reorderAlerts.length === 0 && (
                <p className="state-msg">No unresolved reorder alerts.</p>
              )}
              {reorderAlerts.length > 0 && visibleReorderAlerts.length === 0 && (
                <p className="state-msg">No alerts match this filter.</p>
              )}

              <div className="alert-card-list">
                {visibleReorderAlerts.map((alert) => (
                  <ReorderAlertRow
                    key={alert.id}
                    alert={alert}
                    onResolved={handleReorderResolved}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === "expiry" && (
        <>
          {expiryStatus === "loading" && <p className="state-msg">Loading expiry warnings…</p>}
          {expiryStatus === "error" && (
            <p className="state-msg state-msg--error">
              Couldn't load expiry warnings. <button onClick={loadExpiryAlerts}>Retry</button>
            </p>
          )}
          {expiryStatus === "ready" && expiryAlerts.length === 0 && (
            <p className="state-msg">No unresolved expiry warnings.</p>
          )}
          {expiryStatus === "ready" && expiryAlerts.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Lot number</th>
                  <th>Item name</th>
                  <th>Expiry date</th>
                  <th>Days until expiry</th>
                  <th>Quantity on hand</th>
                  <th>Created at</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {expiryAlerts.map((alert) => (
                  <ExpiryWarningRow
                    key={alert.id}
                    alert={alert}
                    onResolved={handleExpiryResolved}
                  />
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default function AlertsListPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AlertsListPageInner />
    </RoleGuard>
  );
}