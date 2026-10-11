// FR-22 — GET /api/reports/stock-levels. One row per batch: item, SKU, lot,
// on hand, reserved, available (computed), reorder point, expiry.
//
// available_qty is never a stored field — it's quantity_on_hand − reserved_qty,
// which is why the column is labelled "(computed)".

import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function StockLevelsReportPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api.getStockLevelsReport();
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
        title="Stock levels report"
        description="Every batch in the warehouse, with available quantity against each item's reorder point."
      />

      {status === "loading" && <TableSkeleton columns={9} rows={5} />}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load the report.{" "}
          <button onClick={load} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && <EmptyState>No stock level data.</EmptyState>}

      {status === "ready" && rows.length > 0 && (
        <Table minWidth={980}>
          <THead>
            <Tr>
              <Th>Item</Th>
              <Th>SKU</Th>
              <Th>Lot</Th>
              <Th>On hand</Th>
              <Th>Reserved</Th>
              <Th>Available (computed)</Th>
              <Th>Reorder point</Th>
              <Th>Expiry</Th>
              <Th>Status</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((row) => {
              const lowStock = row.available_qty <= row.reorder_point;
              return (
                <Tr key={row.lot_number}>
                  <Td className="font-medium">{row.item_name}</Td>
                  <Td className="code text-[12px] text-steel">{row.sku}</Td>
                  <Td className="code text-[12px] text-steel">{row.lot_number}</Td>
                  <Td>{row.on_hand}</Td>
                  <Td>{row.reserved}</Td>
                  <Td className="font-semibold">{row.available_qty}</Td>
                  <Td>{row.reorder_point}</Td>
                  <Td className="text-steel">{formatDate(row.expiry_date)}</Td>
                  <Td>
                    <Badge tone={lowStock ? "critical" : "neutral"}>
                      {lowStock ? "Reorder needed" : "OK"}
                    </Badge>
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

export default function StockLevelsReportPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <StockLevelsReportPageInner />
    </RoleGuard>
  );
}
