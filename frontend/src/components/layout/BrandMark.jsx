// stok-krate's mark: an inventory crate divided into a storage grid, with a
// signal trace cutting across it — storage plus electrical identity, drawn as
// one glyph. Original geometry; deliberately not a lightning bolt.

export function BrandMark({ size = 22, className }) {
  return (
    <img
      src="/assets/stok-krate-logo.png"
      alt="stok-krate logo"
      width={size}
      height={size}
      className={`object-contain rounded ${className ?? ""}`}
    />
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
