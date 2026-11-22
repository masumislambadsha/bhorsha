import "server-only";

import type { ClientSession } from "mongoose";
import { BankAccount } from "@/server/db/models";

export const SYSTEM_ACCOUNTS = [
  { code: "CASH_CLEARING", number: "000000000001", label: "Cash clearing" },
  { code: "LOAN_PORTFOLIO", number: "000000000002", label: "Loan portfolio" },
  { code: "FEE_INCOME", number: "000000000003", label: "Transfer fees" },
] as const;

export type SystemCode = (typeof SYSTEM_ACCOUNTS)[number]["code"];

/** Idempotent: creates the three system counterparties if they are missing. */
export async function ensureSystemAccounts(session?: ClientSession): Promise<void> {
  for (const account of SYSTEM_ACCOUNTS) {
    const exists = await BankAccount.exists({ systemCode: account.code }).session(session ?? null);
    if (exists) continue;
    await BankAccount.create(
      [
        {
          accountNumber: account.number,
          kind: "system",
          systemCode: account.code,
          ownerId: null,
          type: "savings",
          nickname: account.label,
          currency: "BDT",
          balanceMinor: 0,
          holdMinor: 0,
          status: "active",
          limits: {
            perTransactionMinor: 0,
            dailyTransferMinor: 0,
            minimumBalanceMinor: 0,
          },
          dailyOutflow: { date: "", amountMinor: 0 },
        },
      ],
      { session },
    );
  }
}

export async function systemAccountId(code: SystemCode, session: ClientSession): Promise<string> {
  const account = await BankAccount.findOne({ systemCode: code }).session(session).lean();
  if (!account) throw new Error(`System account ${code} is missing.`);
  return String(account._id);
}
