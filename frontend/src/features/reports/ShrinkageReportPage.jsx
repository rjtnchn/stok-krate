// FR-23 — GET /api/reports/shrinkage. Lists stock adjustments only: item, lot,
// who recorded it, the signed quantity delta, and when.
//
// Cancellations are deliberately absent — they're logged as their own
// transaction type so they don't read as unexplained stock loss here.

import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function signed(quantity) {
  const n = Number(quantity);
  return n > 0 ? `+${n}` : `${n}`;
}

function ShrinkageReportPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getShrinkageReport();
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
        title="Shrinkage report"
        description="Manual stock adjustments, with the user who recorded each one. Cancellations are excluded from this report."
      />

      {status === "loading" && <TableSkeleton columns={5} rows={4} />}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load the report.{" "}
          <button onClick={load} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && (
        <EmptyState>No stock adjustments recorded.</EmptyState>
      )}

      {status === "ready" && rows.length > 0 && (
        <Table minWidth={720}>
          <THead>
            <Tr>
              <Th>Item</Th>
              <Th>Lot</Th>
              <Th>User</Th>
              <Th>Quantity</Th>
              <Th>Recorded</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="font-medium">{row.item_name}</Td>
                <Td className="code text-[12px] text-steel">{row.lot_number}</Td>
                <Td>{row.user_name}</Td>
                <Td
                  className={
                    Number(row.quantity) < 0 ? "num font-semibold text-rust" : "num font-semibold text-ink"
                  }
                >
                  {signed(row.quantity)}
                </Td>
                <Td className="text-steel">{formatTimestamp(row.created_at)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

export default function ShrinkageReportPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ShrinkageReportPageInner />
    </RoleGuard>
  );
}
