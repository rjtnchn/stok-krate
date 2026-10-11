// The system's audit trail is stock_transactions: every reservation,
// fulfillment, receipt, adjustment, and cancellation, each attributed to a
// user. This page is a straight read of that ledger.
//
// It deliberately does NOT present a physical stock count (expected vs.
// counted vs. variance). No cycle-count feature exists in the spec, and no
// field holds a counted quantity — inventing one here would imply
// functionality the system doesn't have. Discrepancies surface through
// `adjustment` rows instead, which is what the Shrinkage report filters on.

import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { CardsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

// Same keys and tones as ActivityFeed and ActivityLogPage, so the same movement
// never renders differently on different screens.
const TYPE_TONE = {
  receipt: "neutral",
  reservation: "pending",
  fulfillment: "good",
  adjustment: "critical",
  cancellation: "neutral",
};

const LEDGER_LIMIT = 100;

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function signed(quantity) {
  const n = Number(quantity);
  return n > 0 ? `+${n}` : `${n}`;
}

function SummaryCards({ rows }) {
  const stockIn = rows.reduce((sum, r) => (r.quantity > 0 ? sum + Number(r.quantity) : sum), 0);
  const stockOut = rows.reduce((sum, r) => (r.quantity < 0 ? sum + Number(r.quantity) : sum), 0);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="px-5 py-4">
        <div className="num font-display text-xl font-bold text-ink">{rows.length}</div>
        <div className="text-xs text-steel">Movements logged</div>
      </Card>
      <Card className="px-5 py-4">
        <div className="num font-display text-xl font-bold text-ink">+{stockIn}</div>
        <div className="text-xs text-steel">Units in</div>
      </Card>
      <Card className="px-5 py-4">
        <div className="num font-display text-xl font-bold text-ink">{stockOut}</div>
        <div className="text-xs text-steel">Units out</div>
      </Card>
    </div>
  );
}

function AuditSummaryPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getRecentTransactions(LEDGER_LIMIT);
      setRows(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Audit summary"
        description="Full transaction audit trail — every stock movement recorded, with the batch it touched and the user who recorded it. Demo mode — sample data."
      />

      {status === "loading" && (
        <>
          <CardsSkeleton count={3} />
          <TableSkeleton columns={6} rows={5} />
        </>
      )}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load the audit trail.{" "}
          <button onClick={load} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && (
        <EmptyState>No stock movements recorded.</EmptyState>
      )}

      {status === "ready" && rows.length > 0 && (
        <>
          <SummaryCards rows={rows} />

          <h2 className="mb-3 font-display text-sm font-bold text-ink">Stock transactions</h2>
          <Table minWidth={820}>
            <THead>
              <Tr>
                <Th>Item</Th>
                <Th>Lot</Th>
                <Th>Type</Th>
                <Th>Quantity</Th>
                <Th>User</Th>
                <Th>Timestamp</Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-medium">{row.item_name}</Td>
                  <Td className="code text-[12px] text-steel">{row.lot_number}</Td>
                  <Td>
                    <Badge tone={TYPE_TONE[row.transaction_type] || "neutral"}>
                      {row.transaction_type}
                    </Badge>
                  </Td>
                  <Td
                    className={
                      Number(row.quantity) < 0
                        ? "num font-semibold text-ink"
                        : "num font-semibold text-ink"
                    }
                  >
                    {signed(row.quantity)}
                  </Td>
                  <Td>{row.user_name}</Td>
                  <Td className="text-steel">{formatTimestamp(row.timestamp)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </div>
  );
}

export default function AuditSummaryPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AuditSummaryPageInner />
    </RoleGuard>
  );
}
