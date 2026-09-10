import { useRef } from "react";
import { cn } from "@/lib/utils";

// Accessible tablist: arrow-key navigation, aria-selected, and panels wired by
// id so screen readers announce which view is showing.
export function Tabs({ children, className, label = "Views" }) {
  const ref = useRef(null);

  function handleKeyDown(e) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const tabs = Array.from(ref.current?.querySelectorAll('[role="tab"]') ?? []);
    if (tabs.length === 0) return;

    const current = tabs.indexOf(document.activeElement);
    let next = current;
    if (e.key === "ArrowRight") next = (current + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;

    e.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  }

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn("mb-4 flex gap-1 border-b border-line", className)}
    >
      {children}
    </div>
  );
}

export function Tab({ active, id, controls, children, ...props }) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold",
        active
          ? "border-signal-bright text-ink"
          : "border-transparent text-steel hover:text-ink"
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabPanel({ id, labelledBy, children }) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={labelledBy} tabIndex={-1}>
      {children}
    </div>
  );
}
