// FR-24 — GET /api/reports/expiry-risk, highlight rows where days_until_expiry <= 7

import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import { daysUntilExpiry } from "@/lib/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function ExpiryRiskReportPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getExpiryRiskReport();
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
      <PageHeader title="Expiry risk report" description="Lots closest to their expiry date across the catalog." />

      {status === "loading" && <TableSkeleton columns={5} rows={4} />}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load the report.{" "}
          <button onClick={load} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && <EmptyState>No expiry risk data.</EmptyState>}

      {status === "ready" && rows.length > 0 && (
        <Table minWidth={700}>
          <THead>
            <Tr>
              <Th>Item</Th>
              <Th>Lot</Th>
              <Th>On hand</Th>
              <Th>Expiry date</Th>
              <Th>Days left</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((row) => {
              const days = row.days_until_expiry ?? daysUntilExpiry(row.expiry_date);
              const highRisk = days <= 7;
              return (
                <Tr key={`${row.item_id}-${row.lot_number}`}>
                  <Td className="font-medium">{row.item_name}</Td>
                  <Td className="code text-[12px] text-steel">{row.lot_number}</Td>
                  <Td>{row.on_hand}</Td>
                  <Td className="text-steel">{formatDate(row.expiry_date)}</Td>
                  <Td>
                    <Badge tone={highRisk ? "critical" : "neutral"}>{days}d</Badge>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}

export default function ExpiryRiskReportPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ExpiryRiskReportPageInner />
    </RoleGuard>
  );
}
