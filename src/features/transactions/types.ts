export interface TransactionFlagDto {
  source: string;
  rule: string | null;
  severity: string;
  reason: string;
  raisedBy: string | null;
  raisedAt: string;
  status: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
}

export interface TransactionDto {
  id: string;
  reference: string;
  type: string;
  status: string;
  amountMinor: number;
  feeMinor: number;
  fromAccountNumber: string | null;
  toAccountNumber: string | null;
  description: string | null;
  createdAt: string;
  review: {
    required: boolean;
    reason: string | null;
    decision: string | null;
    note: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
  };
  flags: TransactionFlagDto[];
  flagStatus: string;
}
