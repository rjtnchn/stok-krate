// components/ActivityLogPage.jsx
// Placeholder — no backend endpoint for an activity log yet, so this
// uses a small hardcoded sample dataset. Swap SAMPLE_ACTIVITY out for a
// real api call (e.g. api.getActivityLog()) once that endpoint exists.

import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

const SAMPLE_ACTIVITY = [
  { id: 1, timestamp: "8/27/2026, 8:12:00 PM", user: "admin", action: "Resolved alert", details: "AC Unit - 1.5HP reorder alert" },
  { id: 2, timestamp: "8/27/2026, 7:47:00 PM", user: "mreyes", action: "Reservation", details: "AC Unit - 1.5HP, lot AC-L1, qty 2" },
  { id: 3, timestamp: "8/26/2026, 5:12:00 PM", user: "mreyes", action: "Reservation", details: "Smart Thermostat, lot TH-A1, qty 5" },
  { id: 4, timestamp: "8/21/2026, 6:00:00 PM", user: "jgarcia", action: "Fulfilment", details: "HVAC Air Filter, lot FIL-LATE, qty -10" },
  { id: 5, timestamp: "8/20/2026, 10:03:00 PM", user: "jgarcia", action: "Reservation", details: "HVAC Air Filter, lot FIL-LATE, qty 10" },
];

function ActivityLogPageInner() {
  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Activity log</h1>
      </div>

      <p className="state-msg">
        Sample data shown below — activity log isn't wired to a real backend yet.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_ACTIVITY.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.timestamp}</td>
              <td>{entry.user}</td>
              <td>{entry.action}</td>
              <td>{entry.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
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