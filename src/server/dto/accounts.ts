import { groupAccountNumber, maskAccountNumber } from "@/lib/mask";
import type { IBankAccount } from "@/server/db/models";
import type { AccountDto } from "@/features/accounts/types";

export function toAccountDto(account: IBankAccount): AccountDto {
  return {
    id: String(account._id),
    accountNumber: groupAccountNumber(account.accountNumber),
    maskedAccountNumber: maskAccountNumber(account.accountNumber),
    type: account.type,
    nickname: account.nickname ?? "",
    status: account.status,
    ownerId: account.ownerId,
    balanceMinor: account.balanceMinor,
    holdMinor: account.holdMinor,
    availableMinor: account.balanceMinor - account.holdMinor,
    limits: {
      perTransactionMinor: account.limits.perTransactionMinor,
      dailyTransferMinor: account.limits.dailyTransferMinor,
      minimumBalanceMinor: account.limits.minimumBalanceMinor,
    },
    dailyOutflow: {
      date: account.dailyOutflow.date,
      amountMinor: account.dailyOutflow.amountMinor,
    },
  };
}
