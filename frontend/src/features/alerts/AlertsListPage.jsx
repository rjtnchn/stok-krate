// FR-15 / FR-20 — Admin alert queue. Both tabs get the same treatment: a KPI
// strip, a labelled table on desktop, labelled cards on mobile, and Resolve as
// the row action. Only unresolved alerts are requested; resolving marks the row
// in place so the provenance stays pointable-at.

import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import CheckNowButton from "./CheckNowButton";
import ReorderAlertRow, { ReorderAlertCard } from "./ReorderAlertRow";
import ExpiryWarningRow, { ExpiryWarningCard } from "./ExpiryWarningRow";
import { daysUntilExpiry, expiryStatus, reorderSeverity } from "@/lib/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, Tab, TabPanel } from "@/components/ui/tabs";
import { Table, THead, TBody, Tr, Th, EmptyState } from "@/components/ui/table";
import { CardsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

function Kpi({ icon: Icon, value, label, tone }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 ${tone === "critical" ? "border-rust/30" : tone === "warning" ? "border-amber-bright/40" : "border-line"
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
      <div>
        <div
          className={`num font-display text-xl font-bold leading-none ${tone === "critical" ? "text-rust" : tone === "warning" ? "text-amber" : "text-ink"
            }`}
        >
          {value}
        </div>
        <div className="mt-0.5 text-[11px] text-steel">{label}</div>
      </div>
    </div>
  );
}

function AlertsListPageInner() {
  const [tab, setTab] = useState("reorder");

  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [reorderStatus, setReorderStatus] = useState("loading");

  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [expiryStatusState, setExpiryStatusState] = useState("loading");

  const loadReorderAlerts = useCallback(async () => {
    setReorderStatus("loading");
    try {
      setReorderAlerts(await api.getReorderAlerts(false));
      setReorderStatus("ready");
    } catch {
      setReorderStatus("error");
    }
  }, []);

  const loadExpiryAlerts = useCallback(async () => {
    setExpiryStatusState("loading");
    try {
      const data = await api.getExpiryAlerts(false);
      setExpiryAlerts(
        [...data].sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date))
      );
      setExpiryStatusState("ready");
    } catch {
      setExpiryStatusState("error");
    }
  }, []);

  useEffect(() => {
    loadReorderAlerts();
    loadExpiryAlerts();
  }, [loadReorderAlerts, loadExpiryAlerts]);

  async function handleCheckedNow() {
    await Promise.all([loadReorderAlerts(), loadExpiryAlerts()]);
  }

  // Resolved alerts are marked in place rather than dropped, so the row can keep
  // showing who resolved it. They leave on the next refetch.
  function handleReorderResolved(alertId, resolvedAlert) {
    setReorderAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, ...resolvedAlert } : a))
    );
  }

  function handleExpiryResolved(alertId, resolvedAlert) {
    setExpiryAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, ...resolvedAlert } : a)));
  }

  const reorderCounts = useMemo(() => {
    let critical = 0;
    let low = 0;
    for (const a of reorderAlerts) {
      if (a.resolved) continue;
      if (reorderSeverity(a.available_qty, a.reorder_point).key === "critical") critical++;
      else low++;
    }
    return { critical, low, total: critical + low };
  }, [reorderAlerts]);

  const expiryCounts = useMemo(() => {
    let expired = 0;
    let soon = 0;
    for (const a of expiryAlerts) {
      if (a.resolved) continue;
      if (expiryStatus(a.expiry_date).days <= 0) expired++;
      else soon++;
    }
    return { expired, soon, total: expired + soon };
  }, [expiryAlerts]);

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Unresolved reorder and expiry alerts raised by the last check."
        actions={<CheckNowButton onChecked={handleCheckedNow} />}
      />

      <Tabs label="Alert types">
        <Tab
          active={tab === "reorder"}
          id="tab-reorder"
          controls="panel-reorder"
          onClick={() => setTab("reorder")}
        >
          Reorder alerts ({reorderCounts.total})
        </Tab>
        <Tab
          active={tab === "expiry"}
          id="tab-expiry"
          controls="panel-expiry"
          onClick={() => setTab("expiry")}
        >
          Expiry warnings ({expiryCounts.total})
        </Tab>
      </Tabs>

      {tab === "reorder" && (
        <TabPanel id="panel-reorder" labelledBy="tab-reorder">
          {reorderStatus === "loading" && (
            <>
              <CardsSkeleton count={3} />
              <TableSkeleton columns={7} rows={3} />
            </>
          )}
          {reorderStatus === "error" && (
            <p className="text-[13px] text-rust">
              Couldn&apos;t load reorder alerts.{" "}
              <button onClick={loadReorderAlerts} className="underline">
                Retry
              </button>
            </p>
          )}

          {reorderStatus === "ready" && (
            <>
              <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <Kpi
                  icon={AlertTriangle}
                  value={reorderCounts.critical}
                  label="Critical or stocked out"
                  tone={reorderCounts.critical > 0 ? "critical" : "neutral"}
                />
                <Kpi
                  icon={AlertTriangle}
                  value={reorderCounts.low}
                  label="Approaching reorder point"
                  tone={reorderCounts.low > 0 ? "warning" : "neutral"}
                />
                <Kpi icon={AlertTriangle} value={reorderCounts.total} label="Total unresolved" />
              </div>

              {reorderAlerts.length === 0 && (
                <EmptyState>No unresolved reorder alerts.</EmptyState>
              )}

              {reorderAlerts.length > 0 && (
                <>
                  <div className="flex flex-col gap-2.5 md:hidden">
                    {reorderAlerts.map((alert) => (
                      <ReorderAlertCard
                        key={alert.id}
                        alert={alert}
                        onResolved={handleReorderResolved}
                      />
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table minWidth={860}>
                      <THead>
                        <Tr>
                          <Th>Item</Th>
                          <Th className="text-right">Available</Th>
                          <Th className="text-right">Reorder point</Th>
                          <Th className="text-right">Deficit</Th>
                          <Th>Severity</Th>
                          <Th>Created</Th>
                          <Th className="text-right">Action</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {reorderAlerts.map((alert) => (
                          <ReorderAlertRow
                            key={alert.id}
                            alert={alert}
                            onResolved={handleReorderResolved}
                          />
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </>
              )}
            </>
          )}
        </TabPanel>
      )}

      {tab === "expiry" && (
        <TabPanel id="panel-expiry" labelledBy="tab-expiry">
          {expiryStatusState === "loading" && (
            <>
              <CardsSkeleton count={3} />
              <TableSkeleton columns={6} rows={3} />
            </>
          )}
          {expiryStatusState === "error" && (
            <p className="text-[13px] text-rust">
              Couldn&apos;t load expiry warnings.{" "}
              <button onClick={loadExpiryAlerts} className="underline">
                Retry
              </button>
            </p>
          )}

          {expiryStatusState === "ready" && (
            <>
              <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <Kpi
                  icon={CalendarClock}
                  value={expiryCounts.expired}
                  label="Expired or expiring today"
                  tone={expiryCounts.expired > 0 ? "critical" : "neutral"}
                />
                <Kpi
                  icon={CalendarClock}
                  value={expiryCounts.soon}
                  label="Approaching expiry"
                  tone={expiryCounts.soon > 0 ? "warning" : "neutral"}
                />
                <Kpi icon={CalendarClock} value={expiryCounts.total} label="Total unresolved" />
              </div>

              {expiryAlerts.length === 0 && (
                <EmptyState>No unresolved expiry warnings.</EmptyState>
              )}

              {expiryAlerts.length > 0 && (
                <>
                  <div className="flex flex-col gap-2.5 md:hidden">
                    {expiryAlerts.map((alert) => (
                      <ExpiryWarningCard
                        key={alert.id}
                        alert={alert}
                        onResolved={handleExpiryResolved}
                      />
                    ))}
                  </div>

                  <div className="hidden md:block">
                    <Table minWidth={700}>
                      <THead>
                        <Tr>
                          <Th>Lot</Th>
                          <Th>Item</Th>
                          <Th>Expires</Th>
                          <Th>Days left</Th>
                          <Th className="text-right">On hand</Th>
                          <Th className="text-right">Action</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {expiryAlerts.map((alert) => (
                          <ExpiryWarningRow
                            key={alert.id}
                            alert={alert}
                            onResolved={handleExpiryResolved}
                          />
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </>
              )}
            </>
          )}
        </TabPanel>
      )}
    </div>
  );
}

export default function AlertsListPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AlertsListPageInner />
    </RoleGuard>
  );
}
