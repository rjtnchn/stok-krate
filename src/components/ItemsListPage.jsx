// components/ItemsListPage.jsx
// FR-05 — Admin view: table of all items from GET /api/items

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

function ItemsTable({ items }) {
  if (items.length === 0) {
    return <p className="state-msg">No items yet. Create one to get started.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Name</th>
          <th>Category</th>
          <th>Turnover category</th>
          <th>Seasonal</th>
          <th>Reorder point</th>
          <th>Sf</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.sku}</td>
            <td>{item.name}</td>
            <td>{item.category}</td>
            <td>{item.turnover_category}</td>
            <td>{item.seasonal_flag ? "Yes" : "No"}</td>
            <td>{item.reorder_point}</td>
            <td>{item.safety_factor}</td>
            <td>
              <Link to={`/admin/items/${item.id}`}>View / Edit</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ItemsListPageInner() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const loadItems = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getItems();
      setItems(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Items</h1>
        <Link to="/admin/items/new" className="btn btn--primary">
          Create item
        </Link>
      </div>

      {status === "loading" && <p className="state-msg">Loading items…</p>}
      {status === "error" && (
        <p className="state-msg state-msg--error">
          Couldn't load items. <button onClick={loadItems}>Retry</button>
        </p>
      )}
      {status === "ready" && <ItemsTable items={items} />}
    </div>
  );
}

export default function ItemsListPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ItemsListPageInner />
    </RoleGuard>
  );
}
