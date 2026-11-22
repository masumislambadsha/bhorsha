import "server-only";

import {
  BankAccount,
  DepositWithdrawalRequest,
  LedgerEntry,
  TransactionModel,
} from "@/server/db/models";

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  failures: string[];
}

export interface IntegrityReport {
  passed: boolean;
  checkedAt: string;
  checks: IntegrityCheck[];
}

const id = (value: unknown) => String(value);

/** The five invariants from BUILD_PROMPT §6.4, checked against live data. */
export async function checkLedgerInvariants(): Promise<IntegrityReport> {
  const checks: IntegrityCheck[] = [];
  const add = (name: string, failures: string[]) => checks.push({ name, passed: failures.length === 0, failures });

  const balances = await LedgerEntry.aggregate<{
    _id: string;
    debits: number;
    credits: number;
  }>([
    {
      $group: {
        _id: "$accountId",
        debits: { $sum: { $cond: [{ $eq: ["$direction", "debit"] }, "$amountMinor", 0] } },
        credits: { $sum: { $cond: [{ $eq: ["$direction", "credit"] }, "$amountMinor", 0] } },
      },
    },
  ]);
  const byAccount = new Map(balances.map((row) => [id(row._id), row]));

  const txTotals = await LedgerEntry.aggregate<{
    _id: string;
    debits: number;
    credits: number;
  }>([
    {
      $group: {
        _id: "$transactionId",
        debits: { $sum: { $cond: [{ $eq: ["$direction", "debit"] }, "$amountMinor", 0] } },
        credits: { $sum: { $cond: [{ $eq: ["$direction", "credit"] }, "$amountMinor", 0] } },
      },
    },
  ]);
  const byTransaction = new Map(txTotals.map((row) => [id(row._id), row]));

  add(
    "Each transaction has balanced debits and credits",
    txTotals.filter((row) => row.debits !== row.credits).map((row) => `${row._id}: ${row.debits} ≠ ${row.credits}`),
  );

  const accounts = await BankAccount.find().lean();
  add(
    "Each account balance equals its ledger net",
    accounts
      .filter((account) => (byAccount.get(id(account._id))?.credits ?? 0) - (byAccount.get(id(account._id))?.debits ?? 0) !== account.balanceMinor)
      .map((account) => `${account.accountNumber}: stored ${account.balanceMinor}`),
  );

  const holds = await DepositWithdrawalRequest.aggregate<{ _id: string; total: number }>([
    { $match: { status: "pending", kind: "withdrawal" } },
    { $group: { _id: "$accountId", total: { $sum: "$holdMinor" } } },
  ]);
  const heldTransfers = await TransactionModel.aggregate<{ _id: string; total: number }>([
    { $match: { status: "pending", "review.required": true } },
    { $group: { _id: "$fromAccountId", total: { $sum: { $add: ["$amountMinor", "$feeMinor"] } } } },
  ]);
  const holdByAccount = new Map(holds.map((row) => [id(row._id), row.total]));
  for (const row of heldTransfers) {
    holdByAccount.set(id(row._id), (holdByAccount.get(id(row._id)) ?? 0) + row.total);
  }

  add(
    "Customer balances and holds are non-negative and holds match open holds",
    accounts
      .filter((account) => account.kind === "customer")
      .filter(
        (account) =>
          account.balanceMinor < 0 ||
          account.holdMinor < 0 ||
          account.holdMinor !== (holdByAccount.get(id(account._id)) ?? 0),
      )
      .map((account) => `${account.accountNumber}: balance ${account.balanceMinor}, hold ${account.holdMinor}`),
  );

  const transactions = await TransactionModel.find().select("_id status type").lean();
  const withEntries = new Set(byTransaction.keys());
  add(
    "Completed transactions have entries; failed and pending ones do not",
    transactions
      .filter((tx) =>
        (tx.status === "completed" && !withEntries.has(id(tx._id))) ||
        ((tx.status === "failed" || tx.status === "pending") && withEntries.has(id(tx._id))),
      )
      .map((tx) => `${id(tx._id)}: ${tx.status}`),
  );

  const reversed = await LedgerEntry.aggregate<{ _id: { tx: string; account: string }; net: number }>([
    { $group: { _id: { tx: "$transactionId", account: "$accountId" }, net: { $sum: { $cond: [{ $eq: ["$direction", "credit"] }, "$amountMinor", { $subtract: [0, "$amountMinor"] }] } } } },
    { $match: { net: { $ne: 0 } } },
  ]);
  const reversedIds = new Set(
    transactions.filter((tx) => tx.status === "reversed").map((tx) => id(tx._id)),
  );
  add(
    "Reversed transactions net to zero for every account",
    reversed
      .filter((row) => reversedIds.has(id(row._id.tx)))
      .map((row) => `${id(row._id.tx)}: net ${row.net}`),
  );

  return {
    passed: checks.every((check) => check.passed),
    checkedAt: new Date().toISOString(),
    checks,
  };
}
