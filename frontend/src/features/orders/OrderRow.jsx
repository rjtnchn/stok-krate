// Desktop order row. FR-10/FR-11 — after fulfil or cancel it reports the
// affected batch's on hand / reserved / available (computed) inline, which is
// the Mystery Shrinkage evidence.

import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { useOrderActions, availableOf, ORDER_STATUS_TONE } from "./useOrderActions";
import { Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_ICON = { pending: Clock, fulfilled: CheckCircle2, cancelled: XCircle };

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function OrderRow({ order, onStatusChange }) {
  const { status, working, actionError, updatedBatch, fulfil, cancel } = useOrderActions(
    order,
    onStatusChange
  );

  return (
    <>
      <Tr>
        <Td className="code text-[12px] text-steel">#{order.id}</Td>
        <Td className="whitespace-nowrap text-steel">{formatDate(order.created_at)}</Td>
        <Td className="font-medium">{order.item_name}</Td>
        <Td className="code text-[12px] text-steel">{order.batch_lot_number}</Td>
        <Td className="num text-right">{order.quantity}</Td>
        <Td>
          <Badge tone={ORDER_STATUS_TONE[status] || "neutral"} icon={STATUS_ICON[status]}>
            {status}
          </Badge>
        </Td>
        <Td>
          {status === "pending" ? (
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="signal" onClick={fulfil} disabled={working}>
                Fulfil
              </Button>
              <Button size="sm" variant="outline" onClick={cancel} disabled={working}>
                Cancel
              </Button>
            </div>
          ) : (
            <span className="block text-right text-[11px] text-steel-soft">No action</span>
          )}
        </Td>
      </Tr>

      {actionError && (
        <Tr>
          <Td colSpan={7} className="bg-rust-bg text-[12px] text-rust">
            {actionError}
          </Td>
        </Tr>
      )}

      {updatedBatch && (
        <Tr>
          <Td colSpan={7} className="bg-teal-bg text-[12px] text-teal">
            Lot <span className="code">{updatedBatch.lot_number}</span> now — on hand{" "}
            <span className="num font-semibold">{updatedBatch.quantity_on_hand}</span>, reserved{" "}
            <span className="num font-semibold">{updatedBatch.reserved_qty}</span>, available{" "}
            <span className="num font-semibold">{availableOf(updatedBatch)}</span> (computed)
          </Td>
        </Tr>
      )}
    </>
  );
}
