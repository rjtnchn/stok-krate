// components/OrderRow.jsx
// FR-10, FR-11 — Fulfil/Cancel actions on a pending order row.
// FR-09, FR-10 — after fulfil/cancel, refetch the item's batches and show
// the updated batch row (quantity_on_hand, reserved_qty, available_qty) inline.

import { useState } from "react";
import { api, ApiError, getErrorMessage } from "../api/client";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function computeAvailable(batch) {
  return batch.quantity_on_hand - batch.reserved_qty;
}

export default function OrderRow({ order, onStatusChange }) {
  const [status, setStatus] = useState(order.status);
  const [actionError, setActionError] = useState(null);
  const [working, setWorking] = useState(false);
  const [updatedBatch, setUpdatedBatch] = useState(null);

  async function refreshAffectedBatch() {
    try {
      const batches = await api.getBatches(order.item_id);
      const match = batches.find((b) => b.lot_number === order.batch_lot_number);
      if (match) setUpdatedBatch(match);
    } catch {
      // Non-fatal: the row's status still updated even if the batch refresh fails.
    }
  }

  async function handleFulfil() {
    setActionError(null);
    setWorking(true);
    try {
      await api.fulfilOrder(order.id);
      setStatus("fulfilled");
      onStatusChange?.(order.id, "fulfilled");
      // Show quantity_on_hand change visibly: reload batch data after fulfil
      await refreshAffectedBatch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError(getErrorMessage(err, "This order can no longer be fulfilled."));
      } else {
        setActionError("Couldn't fulfil this order. Please try again.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleCancel() {
    setActionError(null);
    setWorking(true);
    try {
      await api.cancelOrder(order.id);
      setStatus("cancelled");
      onStatusChange?.(order.id, "cancelled");
      await refreshAffectedBatch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError(getErrorMessage(err, "This order can no longer be cancelled."));
      } else {
        setActionError("Couldn't cancel this order. Please try again.");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <tr>
        <td>{order.id}</td>
        <td>{formatDate(order.created_at)}</td>
        <td>{order.item_name}</td>
        <td>{order.batch_lot_number}</td>
        <td>{order.quantity}</td>
        <td>{status}</td>
        <td>
          {status === "pending" && (
            <div className="order-row__actions">
              <button className="btn--dark-pill" onClick={handleFulfil} disabled={working}>
                Fulfil
              </button>
              <button className="btn--dark-pill" onClick={handleCancel} disabled={working}>
                Cancel
              </button>
            </div>
          )}
        </td>
      </tr>
      {actionError && (
        <tr>
          <td colSpan={7}>
            <p className="state-msg state-msg--error">{actionError}</p>
          </td>
        </tr>
      )}
      {updatedBatch && (
        <tr>
          <td colSpan={7}>
            <p className="state-msg state-msg--success">
              Stock updated for lot {updatedBatch.lot_number}: quantity on hand{" "}
              {updatedBatch.quantity_on_hand}, reserved {updatedBatch.reserved_qty},
              available {computeAvailable(updatedBatch)} (computed)
            </p>
          </td>
        </tr>
      )}
    </>
  );
}