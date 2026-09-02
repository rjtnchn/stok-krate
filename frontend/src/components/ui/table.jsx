import { cn } from "@/lib/utils";

// Compact ledger table: ~40px rows, thin rules, tabular figures.
// `minWidth` keeps code and quantity columns readable instead of letting them
// crush; pair it with <TableScrollHint> so the horizontal scroll is signposted.
export function Table({ className, minWidth, ...props }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table
        className={cn("w-full text-left text-[13px]", className)}
        style={minWidth ? { minWidth } : undefined}
        {...props}
      />
    </div>
  );
}

export function TableScrollHint({ className }) {
  return (
    <p className={cn("mb-1.5 text-[11px] text-steel-soft md:hidden", className)}>
      Scroll sideways to see all columns →
    </p>
  );
}

export function THead({ className, ...props }) {
  return (
    <thead
      className={cn(
        "border-b border-line bg-paper-dim text-[11px] font-semibold uppercase tracking-wide text-steel",
        className
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function Tr({ className, ...props }) {
  return <tr className={cn("hover:bg-paper/70", className)} {...props} />;
}

export function Th({ className, ...props }) {
  return <th className={cn("whitespace-nowrap px-3 py-2 font-semibold", className)} {...props} />;
}

export function Td({ className, ...props }) {
  return <td className={cn("px-3 py-2 align-middle text-ink", className)} {...props} />;
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-[13px] text-steel">
      {children}
    </div>
  );
}
