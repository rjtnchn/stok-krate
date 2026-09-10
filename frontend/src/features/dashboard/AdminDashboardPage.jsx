// FR-25 — operational working surface. Hierarchy is deliberate and identical at
// every width: heading + Check now, KPI strip, what needs attention, shortcuts,
// then recent activity. Alerts never sit below the activity history.

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Boxes,
  ClipboardList,
  BarChart3,
  TrendingDown,
  Truck,
  ChevronRight,
} from "lucide-react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import CheckNowButton from "@/features/alerts/CheckNowButton";
import ActivityFeed from "@/components/common/ActivityFeed";
import AlertsPreviewPanel from "@/features/alerts/AlertsPreviewPanel";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CardsSkeleton, ListSkeleton } from "@/components/ui/skeleton";

function KpiCard({ icon: Icon, value, label, tone }) {
  const attention = tone === "critical" || tone === "warning";
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 ${tone === "critical"
          ? "border-rust/30"
          : tone === "warning"
            ? "border-amber-bright/40"
            : "border-line"
        }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone === "critical"
            ? "bg-rust-bg text-rust"
            : tone === "warning"
              ? "bg-amber-bg text-amber"
              : "bg-paper-dim text-steel"
          }`}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div
          className={`num font-display text-xl font-bold leading-none ${attention ? (tone === "critical" ? "text-rust" : "text-amber") : "text-ink"
            }`}
        >
          {value ?? "—"}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-steel">{label}</div>
      </div>
    </div>
  );
}

const SHORTCUTS = [
  { to: "/orders", label: "Orders", description: "Reserve, fulfil, cancel", icon: ClipboardList },
  { to: "/receive", label: "Receive stock", description: "Log a delivery", icon: Truck },
  { to: "/admin/reports/stock-levels", label: "Stock levels", description: "On hand vs ROP", icon: BarChart3 },
  { to: "/admin/reports/shrinkage", label: "Shrinkage", description: "Recorded adjustments", icon: TrendingDown },
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

function Section({ title, meta, children }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {meta}
      </CardHeader>
      {children}
    </Card>
  );
}

function AdminDashboardPageInner() {
  const [summary, setSummary] = useState(null);
  const [summaryStatus, setSummaryStatus] = useState("loading");

  const [transactions, setTransactions] = useState([]);
  const [txStatus, setTxStatus] = useState("loading");

  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [alertsStatus, setAlertsStatus] = useState("loading");

  const loadSummary = useCallback(async () => {
    setSummaryStatus("loading");
    try {
      setSummary(await api.getDashboardSummary());
      setSummaryStatus("ready");
    } catch {
      setSummaryStatus("error");
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

  const loadAlerts = useCallback(async () => {
    setAlertsStatus("loading");
    try {
      const [reorder, expiry] = await Promise.all([
        api.getReorderAlerts(false),
        api.getExpiryAlerts(false),
      ]);
      setReorderAlerts(reorder);
      setExpiryAlerts(expiry);
      setAlertsStatus("ready");
    } catch {
      setAlertsStatus("error");
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadTransactions();
    loadAlerts();
  }, [loadSummary, loadTransactions, loadAlerts]);

  async function handleChecked() {
    await Promise.all([loadSummary(), loadAlerts(), loadTransactions()]);
  }

  const reorderCount = summary?.active_reorder_alerts ?? 0;
  const expiryCount = summary?.active_expiry_warnings ?? 0;
  const activeTotal = reorderAlerts.length + expiryAlerts.length;

  return (
    <div>
      <PageHeader
        title="Admin dashboard"
        description="Stock health across the warehouse, as of the last check."
        actions={<CheckNowButton onChecked={handleChecked} />}
      />

      {/* 1 — KPI strip */}
      {summaryStatus === "loading" && <CardsSkeleton count={3} />}
      {summaryStatus === "error" && (
        <p className="mb-4 text-[13px] text-rust">
          Couldn&apos;t load the summary.{" "}
          <button onClick={loadSummary} className="underline">
            Retry
          </button>
        </p>
      )}
      {summaryStatus === "ready" && (
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <KpiCard
            icon={AlertTriangle}
            value={reorderCount}
            label="Active reorder alerts"
            tone={reorderCount > 0 ? "critical" : "neutral"}
          />
          <KpiCard
            icon={CalendarClock}
            value={expiryCount}
            label="Active expiry warnings"
            tone={expiryCount > 0 ? "warning" : "neutral"}
          />
          <KpiCard icon={Boxes} value={summary?.total_skus} label="Total SKUs" tone="neutral" />
        </div>
      )}

      {/* 2 — Needs attention, ahead of everything else at every width */}
      <Section
        title="Needs attention"
        meta={
          alertsStatus === "ready" && (
            <span className="num text-[11px] font-semibold text-steel">{activeTotal} active</span>
          )
        }
      >
        {alertsStatus === "loading" && <ListSkeleton rows={3} className="p-3.5" />}
        {alertsStatus === "error" && (
          <p className="px-3.5 py-4 text-[13px] text-rust">
            Couldn&apos;t load alerts.{" "}
            <button onClick={loadAlerts} className="underline">
              Retry
            </button>
          </p>
        )}
        {alertsStatus === "ready" && (
          <AlertsPreviewPanel reorderAlerts={reorderAlerts} expiryAlerts={expiryAlerts} />
        )}
      </Section>

      {/* 3 — Shortcuts */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {SHORTCUTS.map((shortcut) => (
          <Shortcut key={shortcut.to} {...shortcut} />
        ))}
      </div>

      {/* 4 — Recent activity, last */}
      <Section title="Recent stock activity">
        {txStatus === "loading" && <ListSkeleton rows={4} className="p-3.5" />}
        {txStatus === "error" && (
          <p className="px-3.5 py-4 text-[13px] text-rust">
            Couldn&apos;t load activity.{" "}
            <button onClick={loadTransactions} className="underline">
              Retry
            </button>
          </p>
        )}
        {txStatus === "ready" && (
          <ActivityFeed
            transactions={transactions}
            limit={5}
            viewAllTo="/admin/audit-summary"
          />
        )}
      </Section>
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
