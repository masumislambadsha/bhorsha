import "server-only";

import type { AccountType } from "@/lib/domain";
import type { Actor } from "@/server/auth/guards";
import { assertRole } from "@/server/auth/guards";
import { AuthUser, BankAccount, CustomerProfile, LedgerEntry } from "@/server/db/models";
import type { AccountDto, AccountStatus } from "@/features/accounts/types";
import { escapeRegExp } from "@/lib/domain";
import type { Page } from "@/server/http/pagination";
import { paginate } from "@/server/http/pagination";
import { AppError } from "@/server/http/errors";
import { toAccountDto } from "@/server/dto/accounts";
import { writeAuditLog } from "./audit";
import { createNotification } from "./notifications";
import { getSettings } from "./settings";
import { nextAccountSequence } from "./counters";
import { buildAccountNumber } from "@/lib/ids";
import { dayKey } from "@/lib/time";

export interface OpenAccountInput {
  customerId: string;
  type: AccountType;
  nickname?: string;
}

export async function openAccount(actor: Actor | null, input: OpenAccountInput): Promise<string> {
  assertRole(actor, ["staff", "admin"]);
  const profile = await CustomerProfile.findOne({ userId: input.customerId }).lean();
  if (!profile) throw new AppError("NOT_FOUND", "Customer not found.");
  if (profile.kycStatus !== "verified") throw new AppError("KYC_REQUIRED", "The customer is not KYC-verified yet.");
  if (profile.status !== "active") throw new AppError("CUSTOMER_INACTIVE", "The customer is inactive.");
  const sequence = await nextAccountSequence();
  const accountNumber = buildAccountNumber(input.type, sequence);
  const settings = await getSettings();
  const nickname = input.nickname?.trim() || `My ${input.type}`;
  const created = await BankAccount.create([
    {
      accountNumber,
      kind: "customer",
      ownerId: input.customerId,
      type: input.type,
      nickname,
      currency: "BDT",
      balanceMinor: 0,
      holdMinor: 0,
      status: "active",
      limits: { ...settings.limits[input.type] },
      dailyOutflow: { date: "", amountMinor: 0 },
      openedBy: actor.id,
    },
  ]);
  const account = Array.isArray(created) ? created[0] : created;
  if (!account) throw new AppError("INTERNAL_ERROR", "Could not create the account.");
  const accountId = String(account._id);
  await writeAuditLog(actor, {
    action: "ACCOUNT_OPENED",
    entityType: "bank_account",
    entityId: accountId,
    summary: `Account opened for ${input.customerId} (${input.type}).`,
    after: { accountNumber, nickname },
  });
  await createNotification(input.customerId, {
    type: "account_opened",
    title: "Account opened",
    body: `Your ${input.type} account ${accountNumber} is ready.`,
    link: `/customer/accounts/${accountId}`,
  });
  return accountId;
}

export interface ListAccountsInput {
  page: number;
  pageSize: number;
  customerId?: string;
  type?: AccountType;
  status?: AccountStatus;
  q?: string;
}

export async function listAccounts(actor: Actor | null, input: ListAccountsInput): Promise<Page<AccountDto>> {
  if (actor?.role === "customer") {
    const docs = await BankAccount.find({ kind: "customer", ownerId: actor.id }).sort({ createdAt: -1 }).lean();
    const filtered = docs.filter(
      (doc) => (!input.type || doc.type === input.type) && (!input.status || doc.status === input.status),
    );
    const page = filtered.slice((input.page - 1) * input.pageSize, input.page * input.pageSize);
    return paginate(page.map(toAccountDto), filtered.length, input.page, input.pageSize);
  }
  assertRole(actor, ["staff", "admin"]);
  const query: Record<string, unknown> = { kind: "customer" };
  if (input.customerId) query.ownerId = input.customerId;
  if (input.type) query.type = input.type;
  if (input.status) query.status = input.status;
  if (input.q) query.accountNumber = new RegExp(escapeRegExp(input.q), "i");
  const docs = await BankAccount.find(query).sort({ createdAt: -1 }).lean();
  const page = docs.slice((input.page - 1) * input.pageSize, input.page * input.pageSize);
  return paginate(page.map(toAccountDto), docs.length, input.page, input.pageSize);
}

export async function getAccount(actor: Actor | null, id: string): Promise<AccountDto> {
  const doc = await BankAccount.findById(id).lean();
  if (!doc || doc.kind !== "customer") throw new AppError("NOT_FOUND", "Account not found.");
  if (actor?.role === "customer" && doc.ownerId !== actor.id) throw new AppError("NOT_FOUND", "Account not found.");
  return toAccountDto(doc);
}

export async function updateAccount(actor: Actor | null, id: string, input: { nickname: string }): Promise<void> {
  assertRole(actor, ["admin"]);
  const doc = await BankAccount.findById(id).lean();
  if (!doc) throw new AppError("NOT_FOUND", "Account not found.");
  const nickname = input.nickname.trim();
  if (nickname) await BankAccount.updateOne({ _id: id }, { $set: { nickname } });
  await writeAuditLog(actor, { action: "ACCOUNT_UPDATED", entityType: "bank_account", entityId: id, summary: "Account nickname updated.", after: { nickname } });
}

export interface AccountLookup {
  maskedName: string;
  accountType: string;
  isOwn: boolean;
}

export async function lookupAccount(actor: Actor | null, accountNumber: string): Promise<AccountLookup> {
  const doc = await BankAccount.findOne({ kind: "customer", accountNumber }).lean();
  if (!doc) throw new AppError("NOT_FOUND", "No active account has that number. Check it and try again.");
  const owner = doc.ownerId ? await AuthUser.findOne({ _id: doc.ownerId }).lean() : null;
  return {
    maskedName: owner?.name ? maskName(owner.name) : "Unknown",
    accountType: doc.type,
    isOwn: actor?.role === "customer" && doc.ownerId === actor?.id,
  };
}

export async function updateLimits(
  actor: Actor | null,
  id: string,
  input: {
    perTransactionMinor?: number;
    dailyTransferMinor?: number;
    minimumBalanceMinor?: number;
    confirmMinimumBalance?: boolean;
  },
): Promise<void> {
  assertRole(actor, ["admin"]);
  const doc = await BankAccount.findById(id).lean();
  if (!doc) throw new AppError("NOT_FOUND", "Account not found.");
  const $set: Record<string, number> = {};
  if (input.perTransactionMinor !== undefined) {
    if (input.perTransactionMinor < 0) throw new AppError("VALIDATION_ERROR", "Per-transaction limit cannot be negative.", { fieldErrors: { perTransactionMinor: ["Per-transaction limit cannot be negative."] } });
    $set["limits.perTransactionMinor"] = input.perTransactionMinor;
  }
  if (input.dailyTransferMinor !== undefined) {
    if (input.dailyTransferMinor < 0) throw new AppError("VALIDATION_ERROR", "Daily transfer limit cannot be negative.", { fieldErrors: { dailyTransferMinor: ["Daily transfer limit cannot be negative."] } });
    $set["limits.dailyTransferMinor"] = input.dailyTransferMinor;
  }
  if (input.minimumBalanceMinor !== undefined && input.minimumBalanceMinor > doc.balanceMinor && !input.confirmMinimumBalance) {
    throw new AppError("INVALID_STATE", "The minimum balance exceeds the current balance. Confirm the change.", {
      details: { currentBalance: doc.balanceMinor, requestedMinimum: input.minimumBalanceMinor },
    });
  }
  if (input.minimumBalanceMinor !== undefined) $set["limits.minimumBalanceMinor"] = input.minimumBalanceMinor;
  await BankAccount.updateOne({ _id: id }, { $set });
  await writeAuditLog(actor, {
    action: "ACCOUNT_LIMITS_UPDATED",
    entityType: "bank_account",
    entityId: id,
    summary: "Limits updated.",
    before: { limits: doc.limits },
    after: { limits: { ...doc.limits, ...(input.perTransactionMinor !== undefined ? { perTransactionMinor: input.perTransactionMinor } : {}), ...(input.dailyTransferMinor !== undefined ? { dailyTransferMinor: input.dailyTransferMinor } : {}), ...(input.minimumBalanceMinor !== undefined ? { minimumBalanceMinor: input.minimumBalanceMinor } : {}) } },
  });
}

export interface BalanceHistoryPoint {
  date: string;
  balance: number;
}

export async function getBalanceHistory(actor: Actor | null, id: string, days = 90): Promise<BalanceHistoryPoint[]> {
  const doc = await BankAccount.findById(id).lean();
  if (!doc) throw new AppError("NOT_FOUND", "Account not found.");
  if (actor?.role === "customer" && doc.ownerId !== actor.id) throw new AppError("NOT_FOUND", "Account not found.");
  const since = new Date(Date.now() - days * 86_400_000);
  const entries = await LedgerEntry.find({ accountId: id, createdAt: { $gte: since } }).sort({ createdAt: 1 }).lean();
  const result: BalanceHistoryPoint[] = [];
  let balance = 0;
  let i = 0;
  const now = new Date();
  for (let cursor = since; cursor <= now; cursor = new Date(cursor.getTime() + 86_400_000)) {
    const key = dayKey(cursor);
    while (i < entries.length && dayKey(new Date(entries[i].createdAt)) <= key) {
      balance += entries[i].direction === "credit" ? entries[i].amountMinor : -entries[i].amountMinor;
      i += 1;
    }
    result.push({ date: key, balance });
  }
  return result;
}

async function setAccountStatus(actor: Actor | null, id: string, status: "frozen" | "active", reason: string): Promise<void> {
  assertRole(actor, ["admin"]);
  const doc = await BankAccount.findById(id).lean();
  if (!doc) throw new AppError("NOT_FOUND", "Account not found.");
  if (status === "frozen" && doc.status !== "active" && doc.status !== "frozen") {
    throw new AppError("INVALID_STATE", "Only active accounts can be frozen.");
  }
  if (status === "active" && doc.status !== "frozen") {
    throw new AppError("INVALID_STATE", "Only frozen accounts can be unfrozen.");
  }
  const previous = doc.status;
  await BankAccount.updateOne({ _id: id }, {
    $set: { status, statusReason: reason, statusChangedBy: actor.id, statusChangedAt: new Date() },
  });
  await writeAuditLog(actor, {
    action: status === "frozen" ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN",
    entityType: "bank_account",
    entityId: id,
    summary: `Account ${status === "frozen" ? "frozen" : "unfrozen"}.`,
    before: { status: previous },
    after: { status },
  });
  if (doc.ownerId) {
    await createNotification(doc.ownerId, {
      type: status === "frozen" ? "account_frozen" : "account_unfrozen",
      title: status === "frozen" ? "Account frozen" : "Account unfrozen",
      body: `Your ${doc.type} account ${doc.accountNumber} is ${status === "frozen" ? "frozen" : "unfrozen"}. ${reason}`,
      link: `/customer/accounts/${id}`,
    });
  }
}

export async function freezeAccount(actor: Actor | null, id: string, input: { reason: string }): Promise<void> {
  await setAccountStatus(actor, id, "frozen", input.reason);
}

export async function unfreezeAccount(actor: Actor | null, id: string): Promise<void> {
  await setAccountStatus(actor, id, "active", "Reopened by admin.");
}

export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 3);
  return parts.map((part) => `${part.slice(0, 2)}***`).join(" ");
}
