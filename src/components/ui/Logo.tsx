import { APP_NAME } from "@/config/app";

export function Logo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg aria-hidden="true" viewBox="0 0 36 36" className="size-9 shrink-0">
        <rect x="1" y="1" width="34" height="34" rx="10" fill="var(--brand)" />
        <rect x="9" y="9" width="12" height="12" rx="4" fill="var(--brand-foreground)" opacity="0.25" />
        <circle cx="24" cy="23" r="5" fill="var(--accent)" />
      </svg>
      {!compact && (
        <span
          className="font-display text-xl font-medium tracking-tight"
          style={{ color: inverse ? "var(--brand-foreground)" : "var(--foreground)" }}
        >
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
