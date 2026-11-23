export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  reason: string | null;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
}

export interface IntegrityReport {
  passed: boolean;
  checkedAt: string;
  checks: { name: string; passed: boolean; failures: string[] }[];
}

export interface BankSettingsDto {
  key: "default";
  limits: Record<string, { perTransactionMinor: number; dailyTransferMinor: number; minimumBalanceMinor: number }>;
  transferFeeMinor: number;
  reviewThresholdMinor: number;
  staffApprovalLimitMinor: number;
  loanProducts: Record<string, { annualRateBps: number; minMonths: number; maxMonths: number; maxPrincipalMinor: number }>;
  risk: Record<string, number>;
  updatedBy?: string;
  updatedAt: string;
}
