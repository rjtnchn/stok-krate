import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Status is never carried by colour alone — every badge renders a text label,
// and callers pass an icon for the states that matter operationally.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-paper-dim text-steel",
        pending: "bg-amber-bg text-amber",
        good: "bg-teal-bg text-teal",
        critical: "bg-rust-bg text-rust",
        ink: "bg-ink text-white",
        outline: "border border-line text-steel",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({ className, tone, icon: Icon, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {Icon && <Icon size={11} strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </span>
  );
}
