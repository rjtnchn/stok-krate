// stok-krate's mark: an inventory crate divided into a storage grid, with a
// signal trace cutting across it — storage plus electrical identity, drawn as
// one glyph. Original geometry; deliberately not a lightning bolt.

export function BrandMark({ size = 22, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* crate */}
      <rect
        x="3.25"
        y="4.25"
        width="17.5"
        height="15.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {/* storage grid divisions */}
      <path d="M3.25 9.25h17.5" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
      <path d="M12 4.25v5" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
      {/* signal trace */}
      <path
        d="M6 16.4h3.1l1.9-3.4 2.1 5 1.6-2.4H18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLockup({ className }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-signal-bright/15 text-signal-bright">
        <BrandMark size={18} />
      </span>
      <span className="font-display text-[13px] font-bold leading-none tracking-tight text-onshell">
        stok<span className="text-signal-bright">·</span>krate
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-onshell-dim">
          WalangBrownout
        </span>
      </span>
    </span>
  );
}
