export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-bold leading-tight text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] leading-snug text-steel">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
