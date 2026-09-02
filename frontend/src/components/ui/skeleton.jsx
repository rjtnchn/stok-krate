// components/ui/skeleton.jsx
// Loading placeholders shaped like the content that's about to arrive, so the
// layout doesn't jump when data lands. The shimmer is Tailwind's animate-pulse,
// which index.css disables under prefers-reduced-motion — the placeholders stay
// visible, they just hold still.

import { cn } from "@/lib/utils";
import { Table, THead, TBody, Tr, Th, Td } from "./table";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded bg-paper-dim", className)} aria-hidden="true" />;
}

// Widths cycle so rows read as text of varying length rather than a grid of
// identical bars.
const CELL_WIDTHS = ["w-24", "w-16", "w-20", "w-12", "w-28", "w-16", "w-20", "w-14", "w-16"];

export function TableSkeleton({ columns = 5, rows = 4, headers }) {
  return (
    <div className="animate-skeleton" role="status" aria-label="Loading table data">
      <Table>
        <THead>
          <Tr>
            {Array.from({ length: columns }).map((_, i) => (
              <Th key={i}>
                {headers?.[i] ?? <Skeleton className="h-3 w-16" />}
              </Th>
            ))}
          </Tr>
        </THead>
        <TBody>
          {Array.from({ length: rows }).map((_, r) => (
            <Tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <Td key={c}>
                  <Skeleton className={cn("h-3.5", CELL_WIDTHS[c % CELL_WIDTHS.length])} />
                </Td>
              ))}
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

export function CardsSkeleton({ count = 3 }) {
  return (
    <div
      className="animate-skeleton mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
      role="status"
      aria-label="Loading summary"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-line bg-white px-5 py-4">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

// Stacked bars for the dashboard alert panel and other narrow list blocks.
export function ListSkeleton({ rows = 4, className }) {
  return (
    <div className={cn("animate-skeleton flex flex-col gap-2", className)} role="status" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-md border border-line bg-white p-3">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
      ))}
    </div>
  );
}

// Label + input pairs, for a form whose record is still loading.
export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="animate-skeleton" role="status" aria-label="Loading form">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="mb-4">
          <Skeleton className="mb-1.5 h-3 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
