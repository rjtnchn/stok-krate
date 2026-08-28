// components/StaffDashboardPage.jsx
// FR-26 — Pending orders (Fulfil/Cancel wired), my recent transactions (last 10),
// all unresolved expiry warnings (read-only).

import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { RoleGuard } from "../api/auth";
import OrderRow from "./OrderRow";
import RecentTransactionsTable from "./RecentTransactionsTable";
import ExpiryWarningRow, { daysUntilExpiry } from "./ExpiryWarningRow";
import "../styles/admin.css";

function StaffDashboardPageInner() {
  const [orders, setOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState("loading");

  const [transactions, setTransactions] = useState([]);
  const [txStatus, setTxStatus] = useState("loading");

  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [expiryStatus, setExpiryStatus] = useState("loading");

  const loadOrders = useCallback(async () => {
    setOrdersStatus("loading");
    try {
      // API already scopes orders to the current staff user
      const data = await api.getOrders();
      setOrders(data.filter((o) => o.status === "pending"));
      setOrdersStatus("ready");
    } catch {
      setOrdersStatus("error");
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

  const loadExpiryAlerts = useCallback(async () => {
    setExpiryStatus("loading");
    try {
      const data = await api.getExpiryAlerts(false);
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
    loadOrders();
    loadTransactions();
    loadExpiryAlerts();
  }, [loadOrders, loadTransactions, loadExpiryAlerts]);

  function handleOrderStatusChange(orderId) {
    // Fulfilled/cancelled orders drop off the "pending" dashboard table
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>My dashboard</h1>
      </div>

      <section className="admin-section">
        <h2>Pending orders</h2>
        {ordersStatus === "loading" && <p className="state-msg">Loading orders…</p>}
        {ordersStatus === "error" && (
          <p className="state-msg state-msg--error">
            Couldn't load orders. <button onClick={loadOrders}>Retry</button>
          </p>
        )}
        {ordersStatus === "ready" && orders.length === 0 && (
          <p className="state-msg">No pending orders.</p>
        )}
        {ordersStatus === "ready" && orders.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Item name</th>
                <th>Batch lot number</th>
                <th>Quantity</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onStatusChange={handleOrderStatusChange}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-section">
        <h2>My recent transactions</h2>
        {txStatus === "loading" && <p className="state-msg">Loading transactions…</p>}
        {txStatus === "error" && (
          <p className="state-msg state-msg--error">
            Couldn't load transactions. <button onClick={loadTransactions}>Retry</button>
          </p>
        )}
        {txStatus === "ready" && (
          <RecentTransactionsTable transactions={transactions} showUser={false} />
        )}
      </section>

      <section className="admin-section">
        <h2>Active expiry warnings</h2>
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
              </tr>
            </thead>
            <tbody>
              {expiryAlerts.map((alert) => (
                <ExpiryWarningRow key={alert.id} alert={alert} readOnly />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <RoleGuard allow={["staff", "admin"]}>
      <StaffDashboardPageInner />
    </RoleGuard>
  );
}