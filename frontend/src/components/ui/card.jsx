import { cn } from "@/lib/utils";

// Panels are flat: thin border, small radius, no shadow. Nesting is avoided —
// a panel holds content, not more panels.
export function Card({ className, accent, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-white",
        accent && "border-l-[3px]",
        accent === "signal" && "border-l-signal-bright",
        accent === "teal" && "border-l-teal",
        accent === "amber" && "border-l-amber-bright",
        accent === "rust" && "border-l-rust",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h2 className={cn("font-display text-sm font-bold text-ink", className)} {...props} />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("px-3.5 py-3", className)} {...props} />;
}

/* Flush variant for panels whose body is a full-bleed table or feed. */
export function CardBody({ className, ...props }) {
  return <div className={cn("", className)} {...props} />;
}
