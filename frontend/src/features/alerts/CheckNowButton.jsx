// FR-14, FR-19 — POST /api/alerts/check-now, shows a result banner, reloads alerts.
//
// The banner animates in once per result (keyed on runId, so a re-render
// doesn't replay it), the counts tick up from zero, and the Sf change lines
// fade in after the counts have settled. All of it is inert under
// prefers-reduced-motion — see index.css.

import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";

const COUNT_UP_MS = 500;
const SF_DELAY_MS = COUNT_UP_MS + 60;
const SF_STAGGER_MS = 90;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Ticks `target` up from 0 over COUNT_UP_MS. Returns the target immediately
// when reduced motion is requested, or when there's nothing to animate.
function useCountUp(target, runId, enabled) {
  // Nothing to animate for zero, and nothing to animate under reduced motion —
  // in both cases the target is returned directly rather than staged through
  // state, so there's no synchronous setState during the effect.
  const shouldAnimate = enabled && target > 0;
  const [value, setValue] = useState(shouldAnimate ? 0 : target);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!shouldAnimate) return undefined;

    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      // easeOutCubic — fast then settling, so the final number lands softly.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, runId, shouldAnimate]);

  return shouldAnimate ? value : target;
}

function plural(n, word) {
  return `${word}${n === 1 ? "" : "s"}`;
}

function ResultBanner({ result, runId, animate }) {
  const reorder = result.reorder_alerts_created ?? 0;
  const expiry = result.expiry_warnings_created ?? 0;
  const sfChanges = result.sf_changes ?? [];

  const reorderShown = useCountUp(reorder, runId, animate);
  const expiryShown = useCountUp(expiry, runId, animate);

  const counts = [];
  if (expiry > 0) counts.push(`${expiryShown} new ${plural(expiry, "expiry warning")}`);
  if (reorder > 0) counts.push(`${reorderShown} new ${plural(reorder, "reorder alert")}`);

  return (
    <div
      className={`rounded-md bg-teal-bg px-3 py-2 text-xs text-teal sm:text-right ${animate ? "animate-banner-in" : ""
        }`}
    >
      <div className="font-semibold">
        {counts.length > 0 ? `${counts.join(", ")}.` : "No new alerts."}
      </div>

      {sfChanges.map((change, i) => (
        <div
          key={change.item_name}
          className={`font-mono ${animate ? "animate-fade-in" : ""}`}
          style={animate ? { animationDelay: `${SF_DELAY_MS + i * SF_STAGGER_MS}ms` } : undefined}
        >
          {change.item_name}: Sf {Number(change.from).toFixed(2)} →{" "}
          {Number(change.to).toFixed(2)}
        </div>
      ))}

      {sfChanges.length === 0 && (
        <div
          className={animate ? "animate-fade-in" : ""}
          style={animate ? { animationDelay: `${SF_DELAY_MS}ms` } : undefined}
        >
          Seasonal factors already up to date for this month.
        </div>
      )}
    </div>
  );
}

export default function CheckNowButton({ onChecked }) {
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  // Bumped per successful check so the banner remounts and replays its
  // entrance instead of animating on every parent re-render.
  const [runId, setRunId] = useState(0);

  async function handleClick() {
    setWorking(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.checkAlertsNow();
      setResult(data);
      setRunId((n) => n + 1);
      await onChecked?.();
    } catch {
      setError("Couldn't run the check. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  const animate = !prefersReducedMotion();

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button variant="signal" onClick={handleClick} disabled={working}>
        <RefreshCw size={15} className={working ? "animate-spin" : ""} />
        {working ? "Checking…" : "Check now"}
      </Button>

      {error && (
        <p className={`rounded-md bg-rust-bg px-3 py-2 text-xs text-rust ${animate ? "animate-banner-in" : ""}`}>
          {error}
        </p>
      )}

      {result && (
        <ResultBanner key={runId} result={result} runId={runId} animate={animate} />
      )}
    </div>
  );
}
