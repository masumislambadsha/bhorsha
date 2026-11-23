import "server-only";

import type { ClientSession } from "mongoose";
import { LedgerEntry } from "@/server/db/models";
import { AppError } from "@/server/http/errors";

export interface LedgerEntryDraft {
  transactionId: string;
  accountId: string;
  direction: "debit" | "credit";
  amountMinor: number;
  balanceAfterMinor: number;
  entryType: "principal" | "fee" | "reversal";
}

/** Every entry pair must balance: Σ debit == Σ credit. */
export function assertLedgerBalanced(entries: LedgerEntryDraft[]): void {
  const debits = entries.filter((e) => e.direction === "debit").reduce((sum, e) => sum + e.amountMinor, 0);
  const credits = entries.filter((e) => e.direction === "credit").reduce((sum, e) => sum + e.amountMinor, 0);
  if (debits !== credits) throw new AppError("INTERNAL_ERROR", "Ledger imbalance detected.");
}

export async function writeLedgerEntries(entries: LedgerEntryDraft[], session: ClientSession): Promise<void> {
  if (entries.length === 0) return;
  await LedgerEntry.create(
    entries.map((e) => ({
      transactionId: e.transactionId,
      accountId: e.accountId,
      direction: e.direction,
      amountMinor: e.amountMinor,
      balanceAfterMinor: e.balanceAfterMinor,
      entryType: e.entryType,
    })),
    { session, ordered: true },
  );
}
