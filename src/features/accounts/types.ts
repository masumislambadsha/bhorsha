import { ACCOUNT_STATUSES, type AccountType } from "@/lib/domain";

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface AccountLimits {
  perTransactionMinor: number;
  dailyTransferMinor: number;
  minimumBalanceMinor: number;
}

export interface AccountDto {
  id: string;
  accountNumber: string;
  maskedAccountNumber: string;
  type: AccountType;
  nickname: string;
  status: AccountStatus;
  ownerId: string | null;
  balanceMinor: number;
  holdMinor: number;
  availableMinor: number;
  limits: AccountLimits;
  dailyOutflow: { date: string; amountMinor: number };
}
