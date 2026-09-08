// FR-07 / FR-13 — batches for one item. available_qty is derived here, never
// stored, and the batch FEFO will draw from next is marked so a picker can see
// the priority lot before placing an order.

import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Target, CalendarClock } from "lucide-react";
import { api } from "@/api/client";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { expiryStatus } from "@/lib/inventory";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// available_qty = quantity on hand − reserved qty
function computeAvailable(batch) {
  return batch.quantity_on_hand - batch.reserved_qty;
}

// The batch the system will reserve from next: earliest expiry among those with
// stock left, batches without an expiry date last (FEFO degrading to FIFO).
// Mirrors the order flow's own selection.
function findFefoPickId(batches) {
  const eligible = batches.filter((b) => computeAvailable(b) > 0);
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date) - new Date(b.expiry_date);
  });
  return sorted[0].id;
}

const BatchesList = forwardRef(function BatchesList({ itemId }, ref) {
  const [batches, setBatches] = useState([]);
  const [status, setStatus] = useState("loading");

  const loadBatches = useCallback(async () => {
    setStatus("loading");
    try {
      setBatches(await api.getBatches(itemId));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [itemId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useImperativeHandle(ref, () => ({ refresh: loadBatches }));

  if (status === "loading") return <TableSkeleton columns={7} rows={3} />;
  if (status === "error") {
    return (
      <p className="text-[13px] text-rust">
        Couldn&apos;t load batches.{" "}
        <button onClick={loadBatches} className="underline">
          Retry
        </button>
      </p>
    );
  }

  if (batches.length === 0) {
    return <EmptyState>No batches received for this item yet.</EmptyState>;
  }

  const fefoPickId = findFefoPickId(batches);

  return (
    <Table minWidth={760}>
      <THead>
        <Tr>
          <Th>Lot</Th>
          <Th className="text-right">On hand</Th>
          <Th className="text-right">Reserved</Th>
          <Th className="text-right">Available</Th>
          <Th>Received</Th>
          <Th>Expires</Th>
          <Th>Priority</Th>
        </Tr>
      </THead>
      <TBody>
        {batches.map((batch) => {
          const isNext = batch.id === fefoPickId;
          const expiry = batch.expiry_date ? expiryStatus(batch.expiry_date) : null;

          return (
            <Tr key={batch.id}>
              <Td className="code text-[12px] text-steel">{batch.lot_number}</Td>
              <Td className="num text-right">{batch.quantity_on_hand}</Td>
              <Td className="num text-right text-steel">{batch.reserved_qty}</Td>
              <Td className="num text-right font-semibold">
                {computeAvailable(batch)}
                <span className="ml-1 text-[10px] font-normal text-steel-soft">computed</span>
              </Td>
              <Td className="whitespace-nowrap text-steel">{formatDate(batch.received_date)}</Td>
              <Td className="whitespace-nowrap">
                {expiry ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-steel">{formatDate(batch.expiry_date)}</span>
                    <Badge tone={expiry.tone} icon={CalendarClock}>
                      {expiry.label}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-steel-soft">Non-perishable</span>
                )}
              </Td>
              <Td>
                {isNext ? (
                  <Badge tone="good" icon={Target} className="animate-fefo-pulse">
                    Next FEFO pick
                  </Badge>
                ) : (
                  <span className="text-[11px] text-steel-soft">—</span>
                )}
              </Td>
            </Tr>
          );
        })}
      </TBody>
    </Table>
  );
});

export default BatchesList;
