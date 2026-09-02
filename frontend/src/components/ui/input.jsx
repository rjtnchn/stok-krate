import { cn } from "@/lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-steel-soft outline-none focus:border-ink focus:ring-2 focus:ring-signal/40",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-ink focus:ring-2 focus:ring-signal/40",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }) {
  return (
    <label className={cn("mb-1.5 block text-xs font-semibold text-steel", className)} {...props} />
  );
}

export function Field({ className, children }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function FieldError({ children }) {
  if (!children) return null;
  return <span className="mt-1 block text-xs font-medium text-rust">{children}</span>;
}

export function Checkbox({ className, label, ...props }) {
  return (
    <label className={cn("flex items-center gap-2 text-sm text-ink", className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-line text-ink accent-ink"
        {...props}
      />
      {label}
    </label>
  );
}
