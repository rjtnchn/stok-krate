// FR-09 — the Orders tab of the orders workspace: order history. Admin sees
// all, Staff sees their own (the API filters). Newest first. Mobile gets action
// cards so Fulfil and Cancel are never off the right edge of a scrolling table.
// OrdersPage owns the page header and the tab strip.

import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import OrderRow from "./OrderRow";
import OrderCard from "./OrderCard";
import { Table, THead, TBody, Tr, Th, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";

export default function OrdersListPanel() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");

  const loadOrders = useCallback(async () => {
    setStatus("loading");
    try {
      setOrders(await api.getOrders());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  function handleStatusChange(orderId, newStatus) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
  }

  return (
    <div>
      {status === "loading" && <TableSkeleton columns={7} rows={5} />}
      {status === "error" && (
        <p className="text-[13px] text-rust">
          Couldn&apos;t load orders.{" "}
          <button onClick={loadOrders} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && orders.length === 0 && <EmptyState>No orders yet.</EmptyState>}

      {status === "ready" && orders.length > 0 && (
        <>
          <div className="flex flex-col gap-2.5 md:hidden">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
            ))}
          </div>

          <div className="hidden md:block">
            <Table minWidth={780}>
              <THead>
                <Tr>
                  <Th>Order</Th>
                  <Th>Placed</Th>
                  <Th>Item</Th>
                  <Th>Lot</Th>
                  <Th className="text-right">Qty</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </THead>
              <TBody>
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} />
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
