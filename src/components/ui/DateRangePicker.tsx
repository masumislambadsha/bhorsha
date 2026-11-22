export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        From
        <input type="date" value={from} max={to || undefined} onChange={(e) => onFromChange(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        To
        <input type="date" value={to} min={from || undefined} onChange={(e) => onToChange(e.target.value)} className={inputClass} />
      </label>
    </div>
  );
}
