import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-white hover:bg-ink-soft",
        // signal is the darkened teal so white label text clears AA.
        signal: "bg-signal text-white hover:bg-signal-dim",
        outline: "border border-line-strong bg-white text-ink hover:bg-paper-dim",
        ghost: "text-steel hover:bg-paper-dim hover:text-ink",
        destructive: "bg-rust text-white hover:bg-rust-dim",
      },
      size: {
        // Small controls 32px, primary controls 36px — compact but still
        // comfortable touch targets on mobile.
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3.5",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
