import "server-only";

import { BankAccount, AuthUser, LedgerEntry, TransactionModel } from "@/server/db/models";
import { findAuthUserById } from "@/server/db/models/user";
import { AppError } from "@/server/http/errors";
import { fromMinor } from "@/lib/money";
import { formatDate } from "@/lib/time";
import type { Actor } from "@/server/auth/guards";

export interface StatementRow {
  date: string;
  reference: string;
  description: string;
  type: string;
  debitMinor: number;
  creditMinor: number;
  balanceMinor: number;
}

export interface StatementData {
  account: { number: string; type: string; nickname: string };
  customerName: string;
  from: string;
  to: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  totalDebitsMinor: number;
  totalCreditsMinor: number;
  rows: StatementRow[];
}

/** §8.11: build a statement from ledger entries within an inclusive date range (max 366 days). */
export async function buildStatement(
  actor: Actor | null,
  accountId: string,
  from: string,
  to: string,
): Promise<StatementData> {
  const account = await BankAccount.findOne({ _id: accountId, kind: "customer" }).lean();
  if (!account) throw new AppError("NOT_FOUND", "Account not found.");
  if (actor?.role === "customer" && account.ownerId !== actor.id) {
    throw new AppError("NOT_FOUND", "Account not found.");
  }
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  if (toDate.getTime() - fromDate.getTime() > 366 * 86_400_000) {
    throw new AppError("VALIDATION_ERROR", "Choose a period of 366 days or less.");
  }

  const entries = await LedgerEntry.find({
    accountId,
    createdAt: { $gte: fromDate, $lte: toDate },
  })
    .sort({ createdAt: 1 })
    .lean();

  const prior = await LedgerEntry.find({ accountId, createdAt: { $lt: fromDate } })
    .sort({ createdAt: -1 })
    .limit(1)
    .lean();
  const opening = prior[0]?.balanceAfterMinor ?? 0;

  const transactionIds = [...new Set(entries.map((e) => String(e.transactionId)))];
  const transactions = await TransactionModel.find({ _id: { $in: transactionIds } }).lean();
  const byId = new Map(transactions.map((tx) => [String(tx._id), tx]));

  let running = opening;
  let totalDebits = 0;
  let totalCredits = 0;
  const rows: StatementRow[] = entries.map((entry) => {
    const debit = entry.direction === "debit" ? entry.amountMinor : 0;
    const credit = entry.direction === "credit" ? entry.amountMinor : 0;
    totalDebits += debit;
    totalCredits += credit;
    running = entry.balanceAfterMinor;
    const tx = byId.get(String(entry.transactionId));
    return {
      date: formatDate(entry.createdAt),
      reference: tx?.reference ?? "",
      description: tx?.description ?? "",
      type: tx?.type ?? entry.entryType,
      debitMinor: debit,
      creditMinor: credit,
      balanceMinor: running,
    };
  });

  const customer = account.ownerId ? await findAuthUserById(String(account.ownerId)) : null;
  return {
    account: { number: account.accountNumber, type: account.type, nickname: account.nickname ?? "" },
    customerName: customer?.name ?? "",
    from,
    to,
    openingBalanceMinor: opening,
    closingBalanceMinor: running,
    totalDebitsMinor: totalDebits,
    totalCreditsMinor: totalCredits,
    rows,
  };
}

/** RFC 4180 quoting with a UTF-8 BOM; plain decimals (no ৳ glyph). */
export function statementCsv(data: StatementData): string {
  const quote = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines: (string | number)[][] = [
    ["Bhorsa statement"],
    ["Account", data.account.number, data.account.type],
    ["Customer", data.customerName],
    ["Period", `${data.from} to ${data.to}`],
    ["Opening balance (BDT)", fromMinor(data.openingBalanceMinor)],
    ["Closing balance (BDT)", fromMinor(data.closingBalanceMinor)],
    ["Total debits (BDT)", fromMinor(data.totalDebitsMinor)],
    ["Total credits (BDT)", fromMinor(data.totalCreditsMinor)],
    [],
    ["Date", "Reference", "Description", "Type", "Debit (BDT)", "Credit (BDT)", "Balance (BDT)"],
    ...data.rows.map((row) => [
      row.date, row.reference, row.description, row.type,
      row.debitMinor ? fromMinor(row.debitMinor) : "",
      row.creditMinor ? fromMinor(row.creditMinor) : "",
      fromMinor(row.balanceMinor),
    ]),
    ["Simulated statement — no real money moved."],
  ];
  return `\uFEFF${lines.map((line) => line.map(quote).join(",")).join("\r\n")}\r\n`;
}
