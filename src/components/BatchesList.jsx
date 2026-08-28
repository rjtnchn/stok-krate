// components/BatchesList.jsx
// FR-07 — Batches list nested under item detail, from GET /api/items/{item_id}/batches

import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { api } from "../api/client";
import "../styles/admin.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

// available_qty = quantity on hand - reserved qty
function computeAvailable(batch) {
  return batch.quantity_on_hand - batch.reserved_qty;
}

const BatchesList = forwardRef(function BatchesList({ itemId }, ref) {
  const [batches, setBatches] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const loadBatches = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getBatches(itemId);
      setBatches(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [itemId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Lets the parent (item detail page) trigger a refresh after a receive
  useImperativeHandle(ref, () => ({ refresh: loadBatches }));

  if (status === "loading") return <p className="state-msg">Loading batches…</p>;
  if (status === "error") {
    return (
      <p className="state-msg state-msg--error">
        Couldn't load batches. <button onClick={loadBatches}>Retry</button>
      </p>
    );
  }

  if (batches.length === 0) {
    return <p className="state-msg">No batches received for this item yet.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Lot number</th>
          <th>Quantity on hand</th>
          <th>Reserved qty</th>
          <th>Available qty (computed)</th>
          <th>Received date</th>
          <th>Expiry date</th>
        </tr>
      </thead>
      <tbody>
        {batches.map((batch) => (
          <tr key={batch.id}>
            <td>{batch.lot_number}</td>
            <td>{batch.quantity_on_hand}</td>
            <td>{batch.reserved_qty}</td>
            <td>{computeAvailable(batch)}</td>
            <td>{formatDate(batch.received_date)}</td>
            <td>{formatDate(batch.expiry_date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

export default BatchesList;
