// components/AuditSummaryPage.jsx
// Placeholder — no backend endpoint for an audit summary yet, so this
// uses a small hardcoded sample dataset. Swap SAMPLE_SUMMARY /
// SAMPLE_DISCREPANCIES out for a real api call once that endpoint exists.

import { RoleGuard } from "../api/auth";
import "../styles/admin.css";

const SAMPLE_SUMMARY = {
  itemsAudited: 5,
  discrepanciesFound: 2,
  lastAuditDate: "8/25/2026",
};

const SAMPLE_DISCREPANCIES = [
  { id: 1, item: "HVAC Air Filter", lot: "FIL-LATE", expected: 12, counted: 10, difference: -2 },
  { id: 2, item: "Ceiling Fan", lot: "FAN-B1", expected: 14, counted: 12, difference: -2 },
];

function AuditSummaryPageInner() {
  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Audit summary</h1>
      </div>

      <p className="state-msg">
        Sample data shown below — audit summary isn't wired to a real backend yet.
      </p>

      <div className="kpi-cards">
        <div className="kpi-card">
          <span className="kpi-card__value">{SAMPLE_SUMMARY.itemsAudited}</span>
          <span className="kpi-card__label">Items audited</span>
        </div>
        <div className="kpi-card kpi-card--warning">
          <span className="kpi-card__value">{SAMPLE_SUMMARY.discrepanciesFound}</span>
          <span className="kpi-card__label">Discrepancies found</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{SAMPLE_SUMMARY.lastAuditDate}</span>
          <span className="kpi-card__label">Last audit date</span>
        </div>
      </div>

      <section className="admin-section">
        <h2>Discrepancies</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item name</th>
              <th>Lot number</th>
              <th>Expected</th>
              <th>Counted</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DISCREPANCIES.map((row) => (
              <tr key={row.id} className="row--highlight">
                <td>{row.item}</td>
                <td>{row.lot}</td>
                <td>{row.expected}</td>
                <td>{row.counted}</td>
                <td className="text-critical">{row.difference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
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