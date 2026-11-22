import { ACCOUNT_STATUSES, type AccountType } from "@/lib/domain";

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface AccountDto {
  id: string;
  accountNumber: string;
  type: AccountType;
  nickname: string;
  status: AccountStatus;
  ownerId: string | null;
  balanceMinor: number;
  holdMinor: number;
  availableMinor: number;
}
