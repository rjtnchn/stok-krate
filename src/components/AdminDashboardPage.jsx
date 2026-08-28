// components/AdminDashboardPage.jsx
// FR-25 — Summary cards, recent transactions (last 10), Check Now, quick links.

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { RoleGuard } from "../api/auth";
import CheckNowButton from "./CheckNowButton";
import RecentTransactionsTable from "./RecentTransactionsTable";
import "../styles/admin.css";

function SummaryCards({ summary }) {
  if (!summary) return null;

  const reorderAlerts = summary.active_reorder_alerts ?? 0;
  const expiryWarnings = summary.active_expiry_warnings ?? 0;

  return (
    <div className="kpi-cards">
      <div className={`kpi-card${reorderAlerts > 0 ? " kpi-card--critical" : ""}`}>
        <span className="kpi-card__value">{summary.active_reorder_alerts ?? "—"}</span>
        <span className="kpi-card__label">Active reorder alerts</span>
      </div>
      <div className={`kpi-card${expiryWarnings > 0 ? " kpi-card--warning" : ""}`}>
        <span className="kpi-card__value">{summary.active_expiry_warnings ?? "—"}</span>
        <span className="kpi-card__label">Active expiry warnings</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-card__value">{summary.total_skus ?? "—"}</span>
        <span className="kpi-card__label">Total SKUs</span>
      </div>
    </div>
  );
}

function AdminDashboardPageInner() {
  const [summary, setSummary] = useState(null);
  const [summaryStatus, setSummaryStatus] = useState("loading");

  const [transactions, setTransactions] = useState([]);
  const [txStatus, setTxStatus] = useState("loading");

  const loadSummary = useCallback(async () => {
    setSummaryStatus("loading");
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
      setSummaryStatus("ready");
    } catch {
      setSummaryStatus("error");
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxStatus("loading");
    try {
      const data = await api.getRecentTransactions(10);
      setTransactions(data);
      setTxStatus("ready");
    } catch {
      setTxStatus("error");
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadTransactions();
  }, [loadSummary, loadTransactions]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Admin dashboard</h1>
        <div className="header-actions">
          <CheckNowButton onChecked={loadSummary} />
        </div>
      </div>

      {summaryStatus === "loading" && <p className="state-msg">Loading summary…</p>}
      {summaryStatus === "error" && (
        <p className="state-msg state-msg--error">
          Couldn't load summary. <button onClick={loadSummary}>Retry</button>
        </p>
      )}
      {summaryStatus === "ready" && <SummaryCards summary={summary} />}

      <section className="admin-section">
        <h2>Recent transactions</h2>
        {txStatus === "loading" && <p className="state-msg">Loading transactions…</p>}
        {txStatus === "error" && (
          <p className="state-msg state-msg--error">
            Couldn't load transactions. <button onClick={loadTransactions}>Retry</button>
          </p>
        )}
        {txStatus === "ready" && (
          <RecentTransactionsTable transactions={transactions} showUser />
        )}
      </section>

      <section className="admin-section">
        <h2>Quick links</h2>
        <nav className="quick-links">
          <Link to="/admin/reports/stock-levels">Stock levels report</Link>
          <Link to="/admin/reports/shrinkage">Shrinkage report</Link>
          <Link to="/admin/reports/expiry-risk">Expiry risk report</Link>
          <Link to="/admin/alerts">Alerts</Link>
        </nav>
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AdminDashboardPageInner />
    </RoleGuard>
  );
}