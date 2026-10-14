import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

const TYPE_TONE = {
  receipt: "neutral",
  reservation: "pending",
  fulfillment: "good",
  adjustment: "critical",
  cancellation: "neutral",
  "alert resolved": "neutral",
};

function ActivityLogPageInner() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await api.getActivityLog();
      setRows(res.data || res);
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
        title="Activity log"
        description="Stock movements recorded in the warehouse ledger, newest first."
      />

      {status === "loading" && <TableSkeleton columns={4} rows={5} />}
      {status === "error" && (
        <p className="text-sm text-rust">
          Couldn&apos;t load the activity log.{" "}
          <button onClick={load} className="underline">
            Retry
          </button>
        </p>
      )}
      {status === "ready" && rows.length === 0 && (
        <EmptyState>No activity recorded.</EmptyState>
      )}

      {status === "ready" && rows.length > 0 && (
        <Table>
          <THead>
            <Tr>
              <Th>Timestamp</Th>
              <Th>User</Th>
              <Th>Action</Th>
              <Th>Details</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((entry) => (
              <Tr key={entry.id}>
                <Td className="text-steel">{formatTimestamp(entry.created_at)}</Td>
                <Td className="font-medium">{entry.user?.name || "—"}</Td>
                <Td>
                  <Badge tone={TYPE_TONE[entry.type] || "neutral"}>
                    {entry.type_label || entry.type}
                  </Badge>
                </Td>
                <Td className="text-steel">
                  {entry.item?.item_name} (Lot: {entry.batch?.lot_number}, Qty: {entry.quantity})
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

export default function ActivityLogPage() {
  return (
    <RoleGuard allow={["Admin"]}>
      <ActivityLogPageInner />
    </RoleGuard>
  );
}
