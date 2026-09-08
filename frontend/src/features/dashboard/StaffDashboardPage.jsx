// FR-26 — the Staff surface exists to process pending orders, so that comes
// first: a compact table on desktop, labelled action cards on mobile where
// Fulfil and Cancel must never sit off the edge of a scrolling table. Expiry and
// FEFO warnings come next, then shortcuts, then personal activity last.

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { PackagePlus, Truck, ChevronRight } from "lucide-react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import OrderRow from "@/features/orders/OrderRow";
import OrderCard from "@/features/orders/OrderCard";
import ActivityFeed from "@/components/common/ActivityFeed";
import ExpiryWarningRow, { ExpiryWarningCard } from "@/features/alerts/ExpiryWarningRow";
import { daysUntilExpiry } from "@/lib/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, Tr, Th, EmptyState } from "@/components/ui/table";
import { TableSkeleton, ListSkeleton } from "@/components/ui/skeleton";

const SHORTCUTS = [
  { to: "/orders/new", label: "Place order", description: "Reserve stock by FEFO", icon: PackagePlus },
  { to: "/receive", label: "Receive stock", description: "Log an incoming batch", icon: Truck },
];

function Shortcut({ to, label, description, icon: Icon }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2 hover:border-line-strong hover:bg-paper/60"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-paper-dim text-steel">
        <Icon size={14} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink">{label}</span>
        <span className="block truncate text-[11px] text-steel">{description}</span>
      </span>
      <ChevronRight size={14} className="shrink-0 text-steel-soft" aria-hidden="true" />
    </Link>
  );
}

function Section({ title, meta, children, className }) {
  return (
    <Card className={`mb-4 ${className ?? ""}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {meta}
      </CardHeader>
      {children}
    </Card>
  );
}

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
      setTransactions(await api.getRecentTransactions(10));
      setTxStatus("ready");
    } catch {
      setTxStatus("error");
    }
  }, []);

  const loadExpiryAlerts = useCallback(async () => {
    setExpiryStatus("loading");
    try {
      const data = await api.getExpiryAlerts(false);
      setExpiryAlerts(
        [...data].sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date))
      );
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
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  }

  return (
    <div>
      <PageHeader title="My dashboard" description="Orders waiting on you, and what to watch." />

      {/* 1 — Pending orders */}
      <Section
        title="Pending orders"
        meta={
          ordersStatus === "ready" && (
            <span className="num text-[11px] font-semibold text-steel">{orders.length} waiting</span>
          )
        }
      >
        {ordersStatus === "loading" && (
          <div className="p-3.5">
            <TableSkeleton columns={7} rows={3} />
          </div>
        )}
        {ordersStatus === "error" && (
          <p className="px-3.5 py-4 text-[13px] text-rust">
            Couldn&apos;t load orders.{" "}
            <button onClick={loadOrders} className="underline">
              Retry
            </button>
          </p>
        )}
        {ordersStatus === "ready" && orders.length === 0 && (
          <div className="p-3.5">
            <EmptyState>Nothing pending. New orders will appear here.</EmptyState>
          </div>
        )}

        {ordersStatus === "ready" && orders.length > 0 && (
          <>
            {/* Mobile: labelled cards, actions inside the card */}
            <div className="flex flex-col gap-2.5 p-3 md:hidden">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleOrderStatusChange}
                />
              ))}
            </div>

            {/* Desktop: compact operational table */}
            <div className="hidden md:block">
              <Table className="border-0" minWidth={720}>
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
                    <OrderRow
                      key={order.id}
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                    />
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </Section>

      {/* 2 — Expiry / FEFO warnings, ahead of activity history */}
      <Section
        title="Expiry & FEFO warnings"
        meta={
          expiryStatus === "ready" && (
            <span className="num text-[11px] font-semibold text-steel">
              {expiryAlerts.length} open
            </span>
          )
        }
      >
        {expiryStatus === "loading" && (
          <div className="p-3.5">
            <TableSkeleton columns={5} rows={2} />
          </div>
        )}
        {expiryStatus === "error" && (
          <p className="px-3.5 py-4 text-[13px] text-rust">
            Couldn&apos;t load expiry warnings.{" "}
            <button onClick={loadExpiryAlerts} className="underline">
              Retry
            </button>
          </p>
        )}
        {expiryStatus === "ready" && expiryAlerts.length === 0 && (
          <div className="p-3.5">
            <EmptyState>No batches are near expiry.</EmptyState>
          </div>
        )}
        {expiryStatus === "ready" && expiryAlerts.length > 0 && (
          <>
            <div className="flex flex-col gap-2.5 p-3 md:hidden">
              {expiryAlerts.map((alert) => (
                <ExpiryWarningCard key={alert.id} alert={alert} readOnly />
              ))}
            </div>

            <div className="hidden md:block">
              <Table className="border-0" minWidth={560}>
                <THead>
                  <Tr>
                    <Th>Lot</Th>
                    <Th>Item</Th>
                    <Th>Expires</Th>
                    <Th>Days left</Th>
                    <Th className="text-right">On hand</Th>
                  </Tr>
                </THead>
                <TBody>
                  {expiryAlerts.map((alert) => (
                    <ExpiryWarningRow key={alert.id} alert={alert} readOnly />
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </Section>

      {/* 3 — Shortcuts */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SHORTCUTS.map((shortcut) => (
          <Shortcut key={shortcut.to} {...shortcut} />
        ))}
      </div>

      {/* 4 — Personal activity last */}
      <Section title="My recent activity">
        {txStatus === "loading" && <ListSkeleton rows={3} className="p-3.5" />}
        {txStatus === "error" && (
          <p className="px-3.5 py-4 text-[13px] text-rust">
            Couldn&apos;t load activity.{" "}
            <button onClick={loadTransactions} className="underline">
              Retry
            </button>
          </p>
        )}
        {txStatus === "ready" && (
          <ActivityFeed transactions={transactions} limit={5} showUser={false} />
        )}
      </Section>
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
