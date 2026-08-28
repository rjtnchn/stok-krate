// components/CheckNowButton.jsx
// FR-14, FR-19 — POST /api/alerts/check-now, shows a result banner, reloads alerts.

import { useState } from "react";
import { api } from "../api/client";
import "../styles/admin.css";

export default function CheckNowButton({ onChecked }) {
  const [working, setWorking] = useState(false);
  const [banner, setBanner] = useState(null); // { text, tone: "success" | "error" }

  async function handleClick() {
    setWorking(true);
    setBanner(null);
    try {
      const result = await api.checkAlertsNow();
      const expiryCount = result?.expiry_warnings_created ?? 0;
      const seasonalCount = result?.seasonal_factors_updated ?? 0;
      setBanner({
        tone: "success",
        text: `${expiryCount} expiry warnings created, ${seasonalCount} seasonal factors updated`,
      });
      // Reload alerts list after response
      await onChecked?.();
    } catch {
      setBanner({ tone: "error", text: "Couldn't run the check. Please try again." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="check-now">
      <button className="btn btn--primary" onClick={handleClick} disabled={working}>
        {working ? "Checking…" : "Check now"}
      </button>
      {banner && (
        <p
          className={`state-msg ${
            banner.tone === "success" ? "state-msg--success" : "state-msg--error"
          }`}
        >
          {banner.text}
        </p>
      )}
    </div>
  );
}
