import "server-only";

import type { ClientSession } from "mongoose";
import { BankAccount, DepositWithdrawalRequest, TransactionModel } from "@/server/db/models";
import { runInTransaction } from "@/server/db/transaction";
import { AppError } from "@/server/http/errors";
import { paginate, type Page } from "@/server/http/pagination";
import { toMinor, formatBDT } from "@/lib/money";
import { generateReference } from "@/lib/ids";
import { toRequestDto } from "@/server/dto/requests";
import type { RequestDto } from "@/features/requests/types";
import { writeLedgerEntries, assertLedgerBalanced, type LedgerEntryDraft } from "@/server/services/ledger";
import { createNotification } from "@/server/services/notifications";
import { writeAuditLog } from "@/server/services/audit";
import { getSettings } from "@/server/services/settings";
import { systemAccountId } from "@/server/services/system-accounts";
import type { Actor } from "@/server/auth/guards";
import { assertRole, assertNotSelf, assertWithinApprovalLimit } from "@/server/auth/guards";

export type RequestKind = "deposit" | "withdrawal";

export interface CreateRequestInput {
  kind: RequestKind;
  accountId: string;
  amount: string;
  description?: string;
}

export interface ListRequestsInput {
  kind?: RequestKind;
  status?: string;
  accountId?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}

async function findRequest(requestId: string) {
  return DepositWithdrawalRequest.findById(requestId).lean();
}

export async function listRequests(actor: Actor | null, input: ListRequestsInput): Promise<Page<RequestDto>> {
  assertRole(actor, ["customer", "staff", "admin"]);
  const where: Record<string, unknown> = {};
  if (actor.role === "customer") {
    where.customerId = actor.id;
  } else if (input.customerId) {
    where.customerId = input.customerId;
  }
  if (input.kind) where.kind = input.kind;
  if (input.status) where.status = input.status;
  if (input.accountId) where.accountId = input.accountId;
  const total = await DepositWithdrawalRequest.countDocuments(where);
  const docs = await DepositWithdrawalRequest.find(where)
    .sort({ createdAt: -1 })
    .skip((input.page - 1) * input.pageSize)
    .limit(input.pageSize)
    .lean();
  return paginate(docs.map(toRequestDto), total, input.page, input.pageSize);
}

/** §8.5: a customer requests a deposit or withdrawal on their own active account. */
export async function createRequest(actor: Actor | null, input: CreateRequestInput): Promise<RequestDto> {
  assertRole(actor, ["customer"]);
  const amountMinor = toMinor(input.amount.trim());
  const account = await BankAccount.findOne({ _id: input.accountId, kind: "customer" }).lean();
  if (!account || String(account.ownerId) !== actor.id) throw new AppError("NOT_FOUND", "Account not found.");
  if (account.status !== "active") throw new AppError("ACCOUNT_NOT_ACTIVE", "Your account is not active.");
  const description = input.description?.trim().slice(0, 500) || undefined;

  if (input.kind === "deposit") {
    const [req] = await DepositWithdrawalRequest.create([
      { kind: "deposit", accountId: account._id, customerId: actor.id, amountMinor, description },
    ]);
    if (!req) throw new AppError("INTERNAL_ERROR", "Could not create the request.");
    await createNotification(actor.id, {
      type: "deposit_requested",
      title: "Deposit requested",
      body: `You requested a deposit of ${formatBDT(amountMinor)} to ${account.nickname}.`,
      link: "/customer/requests",
    });
    await writeAuditLog(actor, {
      action: "DEPOSIT_REQUESTED",
      entityType: "deposit_withdrawal_request",
      entityId: String(req._id),
      summary: `Deposit of ${formatBDT(amountMinor)} requested on ${account.accountNumber}.`,
    });
    return toRequestDto(req);
  }

  // Withdrawal: check the per-transaction limit, then place a hold on the account.
  if (amountMinor > account.limits.perTransactionMinor) {
    throw new AppError("LIMIT_PER_TRANSACTION", "This would go over your per-transaction limit.", {
      details: { limit: account.limits.perTransactionMinor },
    });
  }
  let req!: Awaited<ReturnType<typeof DepositWithdrawalRequest.create>>[number];
  await runInTransaction(async (session: ClientSession) => {
    const updated = await BankAccount.findOneAndUpdate(
      {
        _id: account._id,
        status: "active",
        balanceMinor: { $gte: amountMinor + account.limits.minimumBalanceMinor + account.holdMinor },
      },
      { $inc: { holdMinor: amountMinor } },
      { session, new: true },
    ).lean();
    if (!updated) {
      throw new AppError("INSUFFICIENT_FUNDS", "Not enough available balance. You can withdraw up to the maximum and keep the minimum balance.", {
        details: {
          maxWithdrawable: Math.max(0, account.balanceMinor - account.holdMinor - account.limits.minimumBalanceMinor),
        },
      });
    }
    [req] = await DepositWithdrawalRequest.create(
      [{ kind: "withdrawal", accountId: account._id, customerId: actor.id, amountMinor, description, holdMinor: amountMinor }],
      { session },
    );
    await writeAuditLog(actor, {
      action: "WITHDRAWAL_REQUESTED",
      entityType: "deposit_withdrawal_request",
      entityId: String(req._id),
      summary: `Withdrawal of ${formatBDT(amountMinor)} requested on ${account.accountNumber}; hold placed.`,
    });
  });
  await createNotification(actor.id, {
    type: "withdrawal_requested",
    title: "Withdrawal requested",
    body: `You requested a withdrawal of ${formatBDT(amountMinor)} from ${account.nickname}.`,
    link: "/customer/requests",
  });
  return toRequestDto(req);
}

/** §8.5: staff or admin approves a pending request (never the requester). */
export async function approveRequest(actor: Actor | null, requestId: string, input: { note?: string }): Promise<void> {
  assertRole(actor, ["staff", "admin"]);
  const req = await findRequest(requestId);
  if (!req) throw new AppError("NOT_FOUND", "Request not found.");
  if (req.status !== "pending") throw new AppError("INVALID_STATE", "This request is not pending.");
  assertNotSelf(actor.id, req.customerId);
  const settings = await getSettings();
  if (actor.role === "staff") assertWithinApprovalLimit(actor, req.amountMinor, settings.staffApprovalLimitMinor);
  const accountNumber = req.accountId ? await BankAccount.findOne({ _id: req.accountId }).select("accountNumber").lean() : null;
  const holder = accountNumber?.accountNumber ?? "";

  await runInTransaction(async (session) => {
    const account = await BankAccount.findOne({ _id: req.accountId, kind: "customer", status: "active" }).lean();
    if (!account) throw new AppError("ACCOUNT_NOT_ACTIVE", "The account is not active.");

    const [txn] = await TransactionModel.create(
      [
        {
          reference: generateReference(),
          type: req.kind,
          status: "completed",
          amountMinor: req.amountMinor,
          fromAccountId: req.kind === "withdrawal" ? req.accountId : null,
          toAccountId: req.kind === "deposit" ? req.accountId : null,
          initiatedBy: req.customerId,
          initiatedByRole: "customer",
          description: req.description ?? undefined,
          completedAt: new Date(),
          flags: [],
          flagStatus: "none",
        },
      ],
      { session },
    );
    if (!txn) throw new AppError("INTERNAL_ERROR", "Could not create the transaction.");
    const txnId = String(txn._id);

    const entries: LedgerEntryDraft[] = [];
    const cashId = await systemAccountId("CASH_CLEARING", session);
    if (req.kind === "deposit") {
      const cash = await BankAccount.findOne({ _id: cashId }).lean();
      await BankAccount.findOneAndUpdate({ _id: cashId, status: "active" }, { $inc: { balanceMinor: req.amountMinor } }, { session, new: true });
      const accountUpdated = await BankAccount.findOneAndUpdate(
        { _id: req.accountId, status: "active" },
        { $inc: { balanceMinor: req.amountMinor } },
        { session, new: true },
      ).lean();
      if (!accountUpdated) throw new AppError("ACCOUNT_NOT_ACTIVE", "The account is not active.");
      entries.push({ transactionId: txnId, accountId: String(cashId), direction: "debit", amountMinor: req.amountMinor, balanceAfterMinor: (cash?.balanceMinor ?? 0) + req.amountMinor, entryType: "principal" });
      entries.push({ transactionId: txnId, accountId: String(req.accountId), direction: "credit", amountMinor: req.amountMinor, balanceAfterMinor: accountUpdated.balanceMinor, entryType: "principal" });
    } else {
      const accountUpdated = await BankAccount.findOneAndUpdate(
        { _id: req.accountId, status: "active", holdMinor: { $gte: req.amountMinor } },
        { $inc: { holdMinor: -req.amountMinor, balanceMinor: -req.amountMinor } },
        { session, new: true },
      ).lean();
      if (!accountUpdated) throw new AppError("CONFLICT", "The account changed during approval.");
      const cash = await BankAccount.findOne({ _id: cashId }).lean();
      await BankAccount.findOneAndUpdate({ _id: cashId, status: "active" }, { $inc: { balanceMinor: req.amountMinor } }, { session, new: true });
      entries.push({ transactionId: txnId, accountId: String(req.accountId), direction: "debit", amountMinor: req.amountMinor, balanceAfterMinor: accountUpdated.balanceMinor, entryType: "principal" });
      entries.push({ transactionId: txnId, accountId: String(cashId), direction: "credit", amountMinor: req.amountMinor, balanceAfterMinor: (cash?.balanceMinor ?? 0) + req.amountMinor, entryType: "principal" });
    }
    assertLedgerBalanced(entries);
    await writeLedgerEntries(entries, session);

    await DepositWithdrawalRequest.updateOne(
      { _id: req._id, status: "pending" },
      { $set: { status: "approved", reviewedBy: actor.id, reviewedAt: new Date(), reviewNote: input.note ?? "", transactionId: txn._id, updatedAt: new Date() } },
      { session },
    );

    await createNotification(req.customerId, {
      type: req.kind === "deposit" ? "deposit_approved" : "withdrawal_approved",
      title: req.kind === "deposit" ? "Deposit approved" : "Withdrawal approved",
      body: req.kind === "deposit" ? `Your deposit of ${formatBDT(req.amountMinor)} was approved.` : `Your withdrawal of ${formatBDT(req.amountMinor)} was approved.`,
    });
    await writeAuditLog(actor, {
      action: "REQUEST_APPROVED",
      entityType: "deposit_withdrawal_request",
      entityId: String(req._id),
      summary: `${req.kind === "deposit" ? "Deposit" : "Withdrawal"} of ${formatBDT(req.amountMinor)} on ${holder} approved.`,
    });
  });
}

/** §8.5: staff or admin rejects a pending request and releases any hold. */
export async function rejectRequest(actor: Actor | null, requestId: string, input: { reason: string }): Promise<void> {
  assertRole(actor, ["staff", "admin"]);
  const req = await findRequest(requestId);
  if (!req) throw new AppError("NOT_FOUND", "Request not found.");
  if (req.status !== "pending") throw new AppError("INVALID_STATE", "This request is not pending.");
  assertNotSelf(actor.id, req.customerId);

  await runInTransaction(async (session) => {
    if (req.kind === "withdrawal" && req.holdMinor > 0) {
      const released = await BankAccount.findOneAndUpdate(
        { _id: req.accountId, status: "active" },
        { $inc: { holdMinor: -req.holdMinor } },
        { session, new: true },
      ).lean();
      if (!released) throw new AppError("CONFLICT", "The account changed during rejection.");
    }
    await DepositWithdrawalRequest.updateOne(
      { _id: req._id, status: "pending" },
      { $set: { status: "rejected", rejectionReason: input.reason, reviewedBy: actor.id, reviewedAt: new Date(), updatedAt: new Date() } },
      { session },
    );
  });

  await createNotification(req.customerId, {
    type: "request_rejected",
    title: "Request rejected",
    body: `Your ${req.kind} request of ${formatBDT(req.amountMinor)} was rejected.`,
  });
  await writeAuditLog(actor, {
    action: "REQUEST_REJECTED",
    entityType: "deposit_withdrawal_request",
    entityId: String(req._id),
    summary: `${req.kind === "deposit" ? "Deposit" : "Withdrawal"} request rejected: ${input.reason}`.slice(0, 200),
    reason: input.reason,
  });
}
