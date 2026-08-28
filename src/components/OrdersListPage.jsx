// components/OrdersListPage.jsx
// FR-09 — Table of orders. Admin sees all; Staff sees own only (API-side filtering).

import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import OrderRow from "./OrderRow";
import "../styles/admin.css";

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const loadOrders = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getOrders();
      setOrders(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  function handleStatusChange(orderId, newStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Orders</h1>
      </div>

      {status === "loading" && <p className="state-msg">Loading orders…</p>}
      {status === "error" && (
        <p className="state-msg state-msg--error">
          Couldn't load orders. <button onClick={loadOrders}>Retry</button>
        </p>
      )}

      {status === "ready" && orders.length === 0 && (
        <p className="state-msg">No orders yet.</p>
      )}

      {status === "ready" && orders.length > 0 && (
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
              <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
