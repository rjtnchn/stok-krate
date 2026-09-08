// lib/useOrderActions.js
// Fulfil / cancel behaviour shared by the desktop order row and the mobile
// order card, so the two presentations can never drift apart. Two-phase
// deduction is untouched: the mock decrements quantity_on_hand only on fulfil,
// and both views refetch the affected batch afterwards to show it.

import { useState } from "react";
import { api, ApiError, getErrorMessage } from "@/api/client";

export function useOrderActions(order, onStatusChange) {
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
      // Non-fatal: the status still updated even if the batch refresh failed.
    }
  }

  async function run(action, nextStatus, failureMessage) {
    setActionError(null);
    setWorking(true);
    try {
      await action(order.id);
      setStatus(nextStatus);
      onStatusChange?.(order.id, nextStatus);
      await refreshAffectedBatch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError(getErrorMessage(err, failureMessage));
      } else {
        setActionError(failureMessage);
      }
    } finally {
      setWorking(false);
    }
  }

  return {
    status,
    working,
    actionError,
    updatedBatch,
    fulfil: () =>
      run(api.fulfilOrder, "fulfilled", "Couldn't fulfil this order. Please try again."),
    cancel: () =>
      run(api.cancelOrder, "cancelled", "Couldn't cancel this order. Please try again."),
  };
}

export function availableOf(batch) {
  return batch.quantity_on_hand - batch.reserved_qty;
}

export const ORDER_STATUS_TONE = {
  pending: "pending",
  fulfilled: "good",
  cancelled: "critical",
};
