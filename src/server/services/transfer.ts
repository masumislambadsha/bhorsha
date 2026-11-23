import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { toMinor, formatBDT } from "@/lib/money";
import { dayKey } from "@/lib/time";
import { generateReference } from "@/lib/ids";
import type { Actor } from "@/server/auth/guards";
import { assertRole } from "@/server/auth/guards";
import { AuthUser, BankAccount, CustomerProfile, TransactionModel } from "@/server/db/models";
import { runInTransaction } from "@/server/db/transaction";
import { AppError, isAppError } from "@/server/http/errors";
import { toTransactionDto, type TransactionDto } from "@/server/dto/transactions";
import { writeLedgerEntries, assertLedgerBalanced, type LedgerEntryDraft } from "@/server/services/ledger";
import { createNotification } from "@/server/services/notifications";
import { writeAuditLog } from "@/server/services/audit";
import { verifyPin } from "@/server/services/pin";
import { evaluateRisk } from "@/server/services/risk";
import { getSettings } from "@/server/services/settings";
import { systemAccountId } from "@/server/services/system-accounts";

export interface TransferInput {
  fromAccountId: string;
  toAccountNumber: string;
  amount: string;
  description?: string;
  pin: string;
  confirmDuplicate?: boolean;
  idempotencyKey: string;
}

const POSSIBLE_DUPLICATE_WINDOW_MS = 2 * 60_000;
const FAILED_RECORD_CODES = ["INSUFFICIENT_FUNDS", "LIMIT_PER_TRANSACTION", "LIMIT_DAILY", "RECIPIENT_NOT_ACTIVE", "ACCOUNT_NOT_ACTIVE"];

function requestHashOf(input: TransferInput, amountMinor: number, description: string | null): string {
  return createHash("sha256").update(`${input.fromAccountId}|${input.toAccountNumber}|${amountMinor}|${description ?? ""}`).digest("hex");
}

export async function transfer(
  actor: Actor | null,
  input: TransferInput,
): Promise<{ transaction: TransactionDto; idempotentReplay: boolean }> {
  assertRole(actor, ["customer"]);
  const accountNumber = input.toAccountNumber.replace(/\s+/g, "");
  let amountMinor: number;
  try {
    amountMinor = toMinor(input.amount.trim());
  } catch (error) {
    throw new AppError("VALIDATION_ERROR", error instanceof Error ? error.message : "Enter an amount in taka.");
  }
  const description = input.description?.trim().slice(0, 140) || null;

  const profile = await CustomerProfile.findOne({ userId: actor.id }).lean();
  if (!profile) throw new AppError("NOT_FOUND", "Customer not found.");
  if (profile.status !== "active") throw new AppError("CUSTOMER_INACTIVE", "Your account is inactive.");
  if (profile.kycStatus !== "verified") throw new AppError("KYC_REQUIRED", "You need a verified account before you can transfer.");

  await verifyPin(actor, actor.id, input.pin);

  const requestHash = requestHashOf(input, amountMinor, description);

  const existing = await TransactionModel.findOne({ initiatedBy: actor.id, idempotencyKey: input.idempotencyKey }).lean();
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new AppError("IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used for a different request.");
    }
    return { transaction: toTransactionDto(existing), idempotentReplay: true };
  }

  const duplicate = await TransactionModel.findOne({
    fromAccountId: input.fromAccountId,
    toAccountNumber: accountNumber,
    amountMinor,
    type: "transfer",
    status: "completed",
    createdAt: { $gte: new Date(Date.now() - POSSIBLE_DUPLICATE_WINDOW_MS) },
  }).lean();
  if (duplicate && !input.confirmDuplicate) {
    throw new AppError("POSSIBLE_DUPLICATE", "You sent money to this account recently. Confirm to send again.", {
      details: { timeOfEarlier: duplicate.createdAt },
    });
  }

  const reference = generateReference();
  const requestId = randomUUID();

  try {
    const txn = await runInTransaction(async (session) => {
      const sender = await BankAccount.findOne({ _id: input.fromAccountId, ownerId: actor.id }).lean();
      if (!sender) throw new AppError("NOT_FOUND", "Sender account not found.");
      if (sender.status !== "active") throw new AppError("ACCOUNT_NOT_ACTIVE", "Your account is not active.");

      const receiver = await BankAccount.findOne({ kind: "customer", accountNumber }).lean();
      if (!receiver) throw new AppError("RECIPIENT_NOT_FOUND", "No active account has that number. Check it and try again.");
      if (receiver.status !== "active") throw new AppError("RECIPIENT_NOT_ACTIVE", "The recipient account is not active.");
      if (String(receiver._id) === String(sender._id)) throw new AppError("SAME_ACCOUNT", "That account is already yours.");

      const settings = await getSettings(session);
      const ownTransfer = String(receiver.ownerId) === actor.id;
      const fee = ownTransfer ? 0 : settings.transferFeeMinor;
      const total = amountMinor + fee;

      if (amountMinor > sender.limits.perTransactionMinor) {
        throw new AppError("LIMIT_PER_TRANSACTION", "This would go over your per-transaction limit.", {
          details: { limit: sender.limits.perTransactionMinor },
        });
      }
      const today = dayKey();
      const outflowToday = sender.dailyOutflow.date === today ? sender.dailyOutflow.amountMinor : 0;
      if (outflowToday + amountMinor > sender.limits.dailyTransferMinor) {
        throw new AppError("LIMIT_DAILY", "This would go over your daily transfer limit.", {
          details: { remaining: Math.max(0, sender.limits.dailyTransferMinor - outflowToday) },
        });
      }
      const available = sender.balanceMinor - sender.holdMinor;
      if (available - total < sender.limits.minimumBalanceMinor) {
        throw new AppError("INSUFFICIENT_FUNDS", "Not enough available balance. You can send up to the maximum and keep the minimum balance.", {
          details: { maxSendable: Math.max(0, available - sender.limits.minimumBalanceMinor) },
        });
      }

      const riskFlags = ownTransfer ? [] : await evaluateRisk(settings.risk, sender, available, receiver, amountMinor, new Date());
      const needsReview =
        !ownTransfer && (amountMinor >= settings.reviewThresholdMinor || riskFlags.some((f) => f.severity === "high"));
      if (process.env.DEBUG_TRANSFER) {
        console.log("DEBUG", { amountMinor, reviewThreshold: settings.reviewThresholdMinor, needsReview, riskFlags, balance: sender.balanceMinor, dailyOutflow: sender.dailyOutflow, total });
      }

      if (needsReview) {
        const [doc] = await TransactionModel.create(
          [
            {
              reference,
              type: "transfer",
              status: "pending",
              amountMinor,
              feeMinor: fee,
              fromAccountId: input.fromAccountId,
              toAccountId: receiver._id,
              fromAccountNumber: sender.accountNumber,
              toAccountNumber: receiver.accountNumber,
              fromOwnerId: sender.ownerId,
              toOwnerId: receiver.ownerId,
              initiatedBy: actor.id,
              initiatedByRole: "customer",
              description: description ?? undefined,
              idempotencyKey: input.idempotencyKey,
              requestHash,
              requestId,
              review: { required: true, reason: "amount threshold or risk" },
              flags: riskFlags.map((f) => ({
                source: "rule" as const,
                rule: f.rule,
                severity: f.severity,
                reason: f.reason,
                raisedAt: new Date(),
                status: "open" as const,
              })),
              flagStatus: "open",
            },
          ],
          { session },
        );
        if (!doc) throw new AppError("INTERNAL_ERROR", "Could not create the transfer.");

        const held = await BankAccount.findOneAndUpdate(
          {
            _id: sender._id,
            status: "active",
            balanceMinor: { $gte: total + sender.limits.minimumBalanceMinor + sender.holdMinor },
          },
          { $inc: { holdMinor: total }, $set: { dailyOutflow: { date: today, amountMinor: outflowToday + amountMinor } } },
          { session, new: true },
        ).lean();
        if (!held) throw new AppError("CONFLICT", "Something changed while you transferred. Try again.");

        await createNotification(actor.id, {
          type: "transfer_sent",
          title: "Transfer held for review",
          body: `Your transfer of ${formatBDT(amountMinor)} to ${accountNumber} is held for review.`,
        });
        await writeAuditLog(actor, {
          action: "TRANSFER_HELD",
          entityType: "transaction",
          entityId: String(doc._id),
          summary: `Transfer of ${formatBDT(amountMinor)} to ${accountNumber} held for review.`,
        });
        return doc;
      }

      const [doc] = await TransactionModel.create(
        [
          {
            reference,
            type: "transfer",
            status: "completed",
            amountMinor,
            feeMinor: fee,
            fromAccountId: input.fromAccountId,
            toAccountId: receiver._id,
            fromAccountNumber: sender.accountNumber,
            toAccountNumber: receiver.accountNumber,
            fromOwnerId: sender.ownerId,
            toOwnerId: receiver.ownerId,
            initiatedBy: actor.id,
            initiatedByRole: "customer",
            description: description ?? undefined,
            idempotencyKey: input.idempotencyKey,
            requestHash,
            requestId,
            flags: riskFlags.map((f) => ({
              source: "rule" as const,
              rule: f.rule,
              severity: f.severity,
              reason: f.reason,
              raisedAt: new Date(),
              status: "open" as const,
            })),
            flagStatus: riskFlags.length > 0 ? "open" : "none",
            completedAt: new Date(),
          },
        ],
        { session },
      );
      if (!doc) throw new AppError("INTERNAL_ERROR", "Could not create the transfer.");

      const senderUpdated = await BankAccount.findOneAndUpdate(
        {
          _id: sender._id,
          status: "active",
          balanceMinor: { $gte: total + sender.limits.minimumBalanceMinor + sender.holdMinor },
        },
        { $inc: { balanceMinor: -total }, $set: { dailyOutflow: { date: today, amountMinor: outflowToday + amountMinor } } },
        { session, new: true },
      ).lean();
      if (!senderUpdated) throw new AppError("CONFLICT", "Something changed while you transferred. Try again.");

      const receiverUpdated = await BankAccount.findOneAndUpdate(
        { _id: receiver._id, status: "active" },
        { $inc: { balanceMinor: amountMinor } },
        { session, new: true },
      ).lean();
      if (!receiverUpdated) throw new AppError("RECIPIENT_NOT_ACTIVE", "The recipient account is not active.");

      const entries: LedgerEntryDraft[] = [
        { transactionId: String(doc._id), accountId: String(sender._id), direction: "debit" as const, amountMinor: total, balanceAfterMinor: senderUpdated.balanceMinor, entryType: "principal" as const },
        { transactionId: String(doc._id), accountId: String(receiver._id), direction: "credit" as const, amountMinor: amountMinor, balanceAfterMinor: receiverUpdated.balanceMinor, entryType: "principal" as const },
      ];
      if (fee > 0) {
        const feeId = await systemAccountId("FEE_INCOME", session);
        const feeDoc = await BankAccount.findOne({ _id: feeId }).lean();
        entries.push({
          transactionId: String(doc._id),
          accountId: feeId,
          direction: "credit" as const,
          amountMinor: fee,
          balanceAfterMinor: (feeDoc?.balanceMinor ?? 0) + fee,
          entryType: "fee" as const,
        });
        await BankAccount.findOneAndUpdate({ _id: feeId }, { $inc: { balanceMinor: fee } }, { session, new: true });
      }
      assertLedgerBalanced(entries);
      await writeLedgerEntries(entries, session);

      await createNotification(actor.id, {
        type: "transfer_sent",
        title: "Transfer completed",
        body: `You sent ${formatBDT(amountMinor)} to ${receiver.accountNumber}.`,
      });
      if (receiver.ownerId) {
        await createNotification(receiver.ownerId, {
          type: "money_received",
          title: "Money received",
          body: `You received ${formatBDT(amountMinor)} from ${sender.accountNumber}.`,
        });
      }
      if (riskFlags.length > 0) {
        const admins = await AuthUser.find({ role: "admin" }).select("_id").lean();
        for (const admin of admins) {
          await createNotification(String(admin._id), {
            type: "flag_raised",
            title: "Transaction flagged",
            body: `A transfer of ${formatBDT(amountMinor)} was flagged: ${riskFlags.map((f) => f.rule).join(", ")}.`,
          });
        }
      }
      return doc;
    });

    return { transaction: toTransactionDto(txn), idempotentReplay: false };
  } catch (error) {
    if (isAppError(error) && FAILED_RECORD_CODES.includes(error.code)) {
      // Record the failure outside the aborted transaction so the customer can retry.
      await TransactionModel.create([
        {
          reference: generateReference(),
          type: "transfer",
          status: "failed",
          amountMinor,
          fromAccountId: input.fromAccountId,
          toAccountNumber: accountNumber,
          initiatedBy: actor.id,
          initiatedByRole: "customer",
          description: description ?? undefined,
          failureCode: error.code,
          failureReason: error.message,
          flags: [],
          flagStatus: "none",
        },
      ]);
    }
    throw error;
  }
}

/** §8.7 reversal of a completed transfer. */
export async function reverseTransfer(actor: Actor | null, transactionId: string, reason?: string): Promise<void> {
  assertRole(actor, ["admin"]);
  const txn = await TransactionModel.findById(transactionId).lean();
  if (!txn) throw new AppError("NOT_FOUND", "Transaction not found.");
  if (txn.status !== "completed") throw new AppError("INVALID_STATE", "Only completed transfers can be reversed.");
  if (txn.reversal) throw new AppError("INVALID_STATE", "This transaction is already reversed.");
  if (!txn.fromAccountId || !txn.toAccountId) throw new AppError("INVALID_STATE", "This transaction cannot be reversed.");

  const sender = await BankAccount.findOne({ _id: txn.fromAccountId, kind: "customer" }).lean();
  if (!sender) throw new AppError("NOT_FOUND", "Account not found.");
  const receiver = await BankAccount.findOne({ _id: txn.toAccountId, kind: "customer" }).lean();
  if (!receiver) throw new AppError("NOT_FOUND", "Account not found.");
  const receiverAvailable = receiver.balanceMinor - receiver.holdMinor;
  if (receiverAvailable < txn.amountMinor) {
    throw new AppError("REVERSAL_INSUFFICIENT_FUNDS", "The recipient has insufficient funds to cover the reversal.", {
      details: { amount: txn.amountMinor, available: receiverAvailable },
    });
  }

  await runInTransaction(async (session) => {
    const senderUpdated = await BankAccount.findOneAndUpdate(
      { _id: sender._id, status: "active", balanceMinor: { $gte: 0 } },
      { $inc: { balanceMinor: txn.amountMinor + txn.feeMinor } },
      { session, new: true },
    ).lean();
    if (!senderUpdated) throw new AppError("CONFLICT", "The sender account changed during reversal.");
    const receiverUpdated = await BankAccount.findOneAndUpdate(
      { _id: receiver._id, status: "active" },
      { $inc: { balanceMinor: -txn.amountMinor } },
      { session, new: true },
    ).lean();
    if (!receiverUpdated) throw new AppError("RECIPIENT_NOT_ACTIVE", "The recipient account is not active.");

    const entries: LedgerEntryDraft[] = [
      { transactionId: String(txn._id), accountId: String(receiver._id), direction: "debit" as const, amountMinor: txn.amountMinor, balanceAfterMinor: receiverUpdated.balanceMinor, entryType: "principal" as const },
    ];
    if (txn.feeMinor > 0) {
      const feeId = await systemAccountId("FEE_INCOME", session);
      const feeDoc = await BankAccount.findOne({ _id: feeId }).lean();
      entries.push({
        transactionId: String(txn._id),
        accountId: feeId,
        direction: "debit" as const,
        amountMinor: txn.feeMinor,
        balanceAfterMinor: (feeDoc?.balanceMinor ?? 0) - txn.feeMinor,
        entryType: "fee" as const,
      });
      await BankAccount.findOneAndUpdate({ _id: feeId, status: { $ne: "closed" } }, { $inc: { balanceMinor: -txn.feeMinor } }, { session, new: true });
    }
    entries.push({
      transactionId: String(txn._id),
      accountId: String(sender._id),
      direction: "credit" as const,
      amountMinor: txn.amountMinor + txn.feeMinor,
      balanceAfterMinor: senderUpdated.balanceMinor,
      entryType: "principal" as const,
    });
    assertLedgerBalanced(entries);
    await writeLedgerEntries(entries, session);

    await TransactionModel.updateOne(
      { _id: txn._id, status: "completed" },
      { $set: { status: "reversed", reversal: { by: actor.id, at: new Date(), reason: reason ?? "Admin reversal" } } },
      { session },
    );

    if (txn.initiatedBy) {
      await createNotification(txn.initiatedBy, {
        type: "transfer_reversed",
        title: "Transfer reversed",
        body: `Your transfer of ${formatBDT(txn.amountMinor)} was reversed.`,
      });
    }
    if (txn.toOwnerId) {
      await createNotification(txn.toOwnerId, {
        type: "money_returned",
        title: "Money returned",
        body: `You received ${formatBDT(txn.amountMinor)} back from ${txn.fromAccountNumber}.`,
      });
    }
  });

  await writeAuditLog(actor, {
    action: "TRANSFER_REVERSED",
    entityType: "transaction",
    entityId: String(txn._id),
    summary: `Transfer ${txn.reference} reversed.`,
  });
}
