import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Banknote,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  FlagOff,
  Lock,
  PauseCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Snowflake,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type StatusKind =
  | "transaction:completed"
  | "transaction:pending"
  | "transaction:failed"
  | "transaction:reversed"
  | "request:pending"
  | "request:approved"
  | "request:rejected"
  | "loan:pending"
  | "loan:under_review"
  | "loan:approved"
  | "loan:rejected"
  | "loan:active"
  | "loan:completed"
  | "account:active"
  | "account:frozen"
  | "account:closed"
  | "customer:active"
  | "customer:inactive"
  | "customer:blocked"
  | "kyc:pending"
  | "kyc:verified"
  | "kyc:rejected"
  | "flag:open"
  | "flag:resolved"
  | "installment:due"
  | "installment:paid"
  | "installment:overdue";

interface BadgeStyle {
  label: string;
  tone: string;
  icon: LucideIcon;
}

const map: Record<StatusKind, BadgeStyle> = {
  "transaction:completed": { label: "Completed", tone: "bg-success-soft text-success-soft-foreground", icon: CheckCircle2 },
  "transaction:pending": { label: "Pending", tone: "bg-warning-soft text-warning-soft-foreground", icon: Clock3 },
  "transaction:failed": { label: "Failed", tone: "bg-danger-soft text-danger-soft-foreground", icon: XCircle },
  "transaction:reversed": { label: "Reversed", tone: "bg-default text-default-foreground", icon: Undo2 },
  "request:pending": { label: "Pending", tone: "bg-warning-soft text-warning-soft-foreground", icon: Clock3 },
  "request:approved": { label: "Approved", tone: "bg-success-soft text-success-soft-foreground", icon: Check },
  "request:rejected": { label: "Rejected", tone: "bg-danger-soft text-danger-soft-foreground", icon: XCircle },
  "loan:pending": { label: "Pending", tone: "bg-warning-soft text-warning-soft-foreground", icon: Clock3 },
  "loan:under_review": { label: "Under review", tone: "bg-info-soft text-info-soft-foreground", icon: Eye },
  "loan:approved": { label: "Approved", tone: "bg-success-soft text-success-soft-foreground", icon: BadgeCheck },
  "loan:rejected": { label: "Rejected", tone: "bg-danger-soft text-danger-soft-foreground", icon: XCircle },
  "loan:active": { label: "Active", tone: "bg-brand-soft text-brand-soft-foreground", icon: Banknote },
  "loan:completed": { label: "Completed", tone: "bg-default text-default-foreground", icon: CheckCheck },
  "account:active": { label: "Active", tone: "bg-success-soft text-success-soft-foreground", icon: Check },
  "account:frozen": { label: "Frozen", tone: "bg-frozen-soft text-frozen-soft-foreground", icon: Snowflake },
  "account:closed": { label: "Closed", tone: "bg-default text-default-foreground", icon: Lock },
  "customer:active": { label: "Active", tone: "bg-success-soft text-success-soft-foreground", icon: Check },
  "customer:inactive": { label: "Inactive", tone: "bg-default text-default-foreground", icon: PauseCircle },
  "customer:blocked": { label: "Blocked", tone: "bg-danger-soft text-danger-soft-foreground", icon: Ban },
  "kyc:pending": { label: "Pending", tone: "bg-warning-soft text-warning-soft-foreground", icon: ShieldQuestion },
  "kyc:verified": { label: "Verified", tone: "bg-success-soft text-success-soft-foreground", icon: ShieldCheck },
  "kyc:rejected": { label: "Rejected", tone: "bg-danger-soft text-danger-soft-foreground", icon: ShieldAlert },
  "flag:open": { label: "Open", tone: "bg-warning-soft text-warning-soft-foreground", icon: Flag },
  "flag:resolved": { label: "Resolved", tone: "bg-default text-default-foreground", icon: FlagOff },
  "installment:due": { label: "Due", tone: "bg-default text-default-foreground", icon: CalendarDays },
  "installment:paid": { label: "Paid", tone: "bg-success-soft text-success-soft-foreground", icon: Check },
  "installment:overdue": { label: "Overdue", tone: "bg-danger-soft text-danger-soft-foreground", icon: AlertTriangle },
};

export function StatusBadge({ kind, label }: { kind: StatusKind; label?: string }) {
  const badge = map[kind];
  const Icon = badge.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.tone}`}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {label ?? badge.label}
    </span>
  );
}
