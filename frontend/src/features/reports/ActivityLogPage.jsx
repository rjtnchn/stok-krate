// Placeholder — no backend endpoint for an activity log yet. Swap
// SAMPLE_ACTIVITY for a real api call (e.g. api.getActivityLog()) once
// that endpoint exists.

import { RoleGuard } from "@/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

// Same keys and tones as AuditSummaryPage and ActivityFeed, plus the non-stock
// events (alert resolution) that only appear here.
const TYPE_TONE = {
  receipt: "neutral",
  reservation: "pending",
  fulfillment: "good",
  adjustment: "critical",
  cancellation: "neutral",
  "alert resolved": "neutral",
};

const SAMPLE_ACTIVITY = [
  { id: 1, timestamp: "2026-08-27T20:12:00Z", user_name: "Site Admin", transaction_type: "alert resolved", details: "Portable AC Unit - 1.5HP reorder alert" },
  { id: 2, timestamp: "2026-08-27T19:47:00Z", user_name: "Maria Reyes", transaction_type: "reservation", details: "Portable AC Unit - 1.5HP, lot A-2093, qty 2" },
  { id: 3, timestamp: "2026-08-26T17:12:00Z", user_name: "Maria Reyes", transaction_type: "reservation", details: "Smart Thermostat V2, lot T-1187, qty 5" },
  { id: 4, timestamp: "2026-08-21T18:00:00Z", user_name: "Juan Garcia", transaction_type: "fulfillment", details: "Carbon Filter - Standard, lot C-2305, qty -10" },
  { id: 5, timestamp: "2026-08-20T22:03:00Z", user_name: "Juan Garcia", transaction_type: "reservation", details: "Carbon Filter - Standard, lot C-2305, qty 10" },
  { id: 6, timestamp: "2026-08-15T09:00:00Z", user_name: "Maria Reyes", transaction_type: "receipt", details: "Carbon Filter - Standard, lot C-2291, qty 50" },
];

function ActivityLogPageInner() {
  return (
    <div>
      <PageHeader
        title="Activity log"
        description="Stock movements plus non-stock events such as alert resolutions, newest first. Demo mode — sample data."
      />

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
          {SAMPLE_ACTIVITY.map((entry) => (
            <Tr key={entry.id}>
              <Td className="text-steel">{formatTimestamp(entry.timestamp)}</Td>
              <Td className="font-medium">{entry.user_name}</Td>
              <Td>
                <Badge tone={TYPE_TONE[entry.transaction_type] || "neutral"}>
                  {entry.transaction_type}
                </Badge>
              </Td>
              <Td className="text-steel">{entry.details}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

export default function ActivityLogPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ActivityLogPageInner />
    </RoleGuard>
  );
}
