import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "brand" | "neutral" | "success" | "danger";
}) {
  const tones = {
    brand: "bg-brand-soft text-brand-soft-foreground",
    neutral: "bg-default text-default-foreground",
    success: "bg-success-soft text-success-soft-foreground",
    danger: "bg-danger-soft text-danger-soft-foreground",
  } as const;

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        {Icon && (
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
        )}
      </div>
      <span className="amount font-display text-[28px] font-medium leading-none text-foreground">
        {value}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
