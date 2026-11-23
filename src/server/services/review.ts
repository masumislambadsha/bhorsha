import "server-only";

import type { Actor } from "@/server/auth/guards";
import { assertRole, assertNotSelf, assertWithinApprovalLimit } from "@/server/auth/guards";
import { BankAccount, TransactionModel } from "@/server/db/models";
import { runInTransaction } from "@/server/db/transaction";
import { AppError } from "@/server/http/errors";
import { formatBDT } from "@/lib/money";
import { dayKey } from "@/lib/time";
import { freezeAccount } from "@/server/services/accounts";
import { writeLedgerEntries, assertLedgerBalanced, type LedgerEntryDraft } from "@/server/services/ledger";
import { createNotification } from "@/server/services/notifications";
import { writeAuditLog } from "@/server/services/audit";
import { getSettings } from "@/server/services/settings";
import { reverseTransfer } from "@/server/services/transfer";
import { systemAccountId } from "@/server/services/system-accounts";
import { AuthUser } from "@/server/db/models";

/** §8.4: staff approve or reject a held transfer (initiator can't review their own). */
export async function reviewTransfer(
  actor: Actor | null,
  transactionId: string,
  input: { decision: "approve" | "reject"; note?: string },
): Promise<void> {
  assertRole(actor, ["staff", "admin"]);
  const txn = await TransactionModel.findById(transactionId).lean();
  if (!txn) throw new AppError("NOT_FOUND", "Transaction not found.");
  if (txn.status !== "pending") throw new AppError("INVALID_STATE", "Only held transfers can be reviewed.");
  assertNotSelf(actor.id, txn.initiatedBy);

  if (txn.fromAccountId && txn.toAccountId) {
    const receiver = await BankAccount.findOne({ _id: txn.toAccountId, kind: "customer" }).lean();
    if (receiver && receiver.status !== "active") {
      throw new AppError("RECIPIENT_NOT_ACTIVE", "The recipient account is not active.");
    }
  }

  const settings = await getSettings();
  if (input.decision === "approve") {
    assertWithinApprovalLimit(actor, txn.amountMinor, settings.staffApprovalLimitMinor);

    await runInTransaction(async (session) => {
      const sender = await BankAccount.findOne({
        _id: txn.fromAccountId,
        status: "active",
        holdMinor: { $gte: txn.amountMinor + txn.feeMinor },
      }).lean();
      if (!sender) throw new AppError("CONFLICT", "The sender account changed during review.");

      const senderUpdated = await BankAccount.findOneAndUpdate(
        { _id: sender._id, status: "active", holdMinor: { $gte: txn.amountMinor + txn.feeMinor } },
        { $inc: { holdMinor: -(txn.amountMinor + txn.feeMinor), balanceMinor: -(txn.amountMinor + txn.feeMinor) } },
        { session, new: true },
      ).lean();
      if (!senderUpdated) throw new AppError("CONFLICT", "The sender account changed during review.");

      const receiver = await BankAccount.findOne({ _id: txn.toAccountId, status: "active" }).lean();
      if (!receiver) throw new AppError("RECIPIENT_NOT_ACTIVE", "The recipient account is not active.");
      const receiverUpdated = await BankAccount.findOneAndUpdate(
        { _id: receiver._id, status: "active" },
        { $inc: { balanceMinor: txn.amountMinor } },
        { session, new: true },
      ).lean();
      if (!receiverUpdated) throw new AppError("RECIPIENT_NOT_ACTIVE", "The recipient account is not active.");

      const fee = txn.feeMinor > 0 ? txn.feeMinor : 0;
      const entries: LedgerEntryDraft[] = [
        { transactionId: String(txn._id), accountId: String(sender._id), direction: "debit" as const, amountMinor: txn.amountMinor + fee, balanceAfterMinor: senderUpdated.balanceMinor, entryType: "principal" as const },
        { transactionId: String(txn._id), accountId: String(receiver._id), direction: "credit" as const, amountMinor: txn.amountMinor, balanceAfterMinor: receiverUpdated.balanceMinor, entryType: "principal" as const },
      ];
      if (fee > 0) {
        const feeId = await systemAccountId("FEE_INCOME", session);
        const feeDoc = await BankAccount.findOne({ _id: feeId }).lean();
        entries.push({
          transactionId: String(txn._id),
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

      await TransactionModel.updateOne(
        { _id: txn._id },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            "review.decision": input.decision,
            "review.reviewedBy": actor.id,
            "review.reviewedAt": new Date(),
            "review.note": input.note ?? "",
          },
        },
        { session },
      );

      if (txn.initiatedBy) {
        await createNotification(txn.initiatedBy, {
          type: "transfer_sent",
          title: "Transfer completed",
          body: `Your transfer of ${formatBDT(txn.amountMinor)} is now completed.`,
        });
      }
      if (txn.toOwnerId) {
        await createNotification(txn.toOwnerId, {
          type: "money_received",
          title: "Money received",
          body: `You received ${formatBDT(txn.amountMinor)} from ${txn.fromAccountNumber}.`,
        });
      }
      await writeAuditLog(actor, { action: "TRANSFER_REVIEWED", entityType: "transaction", entityId: String(txn._id), summary: `Transfer approved by ${actor.role}.` });
    });
    return;
  }

  // Reject: release the hold and mark the transfer failed.
  await runInTransaction(async (session) => {
    const sender = await BankAccount.findOne({ _id: txn.fromAccountId, status: "active" }).lean();
    if (!sender) throw new AppError("NOT_FOUND", "Account not found.");
    const heldTotal = txn.amountMinor + txn.feeMinor;
    const inc: Record<string, number> = { holdMinor: -heldTotal };
    if (sender.dailyOutflow.date === dayKey() && sender.dailyOutflow.amountMinor > 0) {
      inc["dailyOutflow.amountMinor"] = -txn.amountMinor;
    }
    const released = await BankAccount.findOneAndUpdate(
      { _id: sender._id, status: "active" },
      { $inc: inc },
      { session, new: true },
    ).lean();
    if (!released) throw new AppError("CONFLICT", "The sender account changed during review.");

    await TransactionModel.updateOne(
      { _id: txn._id, status: "pending" },
      {
        $set: {
          status: "failed",
          failureCode: "REJECTED_BY_REVIEW",
          "review.decision": input.decision,
          "review.reviewedBy": actor.id,
          "review.reviewedAt": new Date(),
          "review.note": input.note ?? "",
        },
      },
      { session },
    );

    if (txn.initiatedBy) {
      await createNotification(txn.initiatedBy, {
        type: "transfer_sent",
        title: "Transfer rejected",
        body: "Your transfer was rejected and the money was returned to your account.",
      });
    }
    await writeAuditLog(actor, { action: "TRANSFER_REVIEWED", entityType: "transaction", entityId: String(txn._id), summary: "Transfer rejected by reviewer." });
  });
}

/** §8.7: admin resolves flags — clear, reverse, or freeze the sender's account. */
export async function resolveFlags(
  actor: Actor | null,
  transactionId: string,
  input: { action: "clear" | "reverse" | "freeze_sender"; note?: string },
): Promise<void> {
  assertRole(actor, ["admin"]);
  const txn = await TransactionModel.findById(transactionId).lean();
  if (!txn) throw new AppError("NOT_FOUND", "Transaction not found.");

  if (input.action === "clear") {
    await TransactionModel.updateOne(
      { _id: txn._id },
      {
        $set: {
          flags: txn.flags.map((f) => ({ ...f, status: "cleared", resolvedBy: actor.id, resolvedAt: new Date(), resolution: input.note ?? "" })),
          flagStatus: "resolved",
        },
      },
    );
    await writeAuditLog(actor, {
      action: "FLAG_RESOLVED",
      entityType: "transaction",
      entityId: String(txn._id),
      summary: `Flags cleared on ${txn.reference}: ${input.note ?? ""}`.trim(),
    });
    return;
  }

  if (input.action === "reverse") {
    await reverseTransfer(actor, transactionId, input.note);
    return;
  }

  // freeze_sender
  if (!txn.fromOwnerId) throw new AppError("INVALID_STATE", "This transaction has no sender to freeze.");
  const senderAccount = await BankAccount.findOne({ ownerId: txn.fromOwnerId, kind: "customer" }).lean();
  if (senderAccount) {
    await freezeAccount(actor, String(senderAccount._id), { reason: "Frozen after flag resolution" });
  }
  await TransactionModel.updateOne(
    { _id: txn._id },
    {
      $set: {
        flagStatus: "resolved",
        flags: txn.flags.map((f) => ({ ...f, status: "actioned", resolvedBy: actor.id, resolvedAt: new Date(), resolution: input.note ?? "" })),
      },
    },
  );
  await writeAuditLog(actor, {
    action: "FLAG_RESOLVED",
    entityType: "transaction",
    entityId: String(txn._id),
    summary: `Sender of ${txn.reference} frozen after flag resolution.`,
  });
}

/** §8.7: staff flag any transaction manually. */
export async function flagTransaction(actor: Actor | null, transactionId: string, reason: string): Promise<void> {
  assertRole(actor, ["staff", "admin"]);
  const txn = await TransactionModel.findById(transactionId).lean();
  if (!txn) throw new AppError("NOT_FOUND", "Transaction not found.");
  const now = new Date();
  await TransactionModel.updateOne(
    { _id: txn._id },
    {
      $push: {
        flags: { source: "staff", severity: "medium", reason, raisedBy: actor.id, raisedAt: now, status: "open" },
      },
      $set: { flagStatus: "open" },
    },
  );
  const admins = await AuthUser.find({ role: "admin" }).select("_id").lean();
  for (const admin of admins) {
    await createNotification(String(admin._id), {
      type: "flag_raised",
      title: "Transaction flagged",
      body: `A transaction was flagged by staff: ${reason}`,
    });
  }
  await writeAuditLog(actor, { action: "TRANSACTION_FLAGGED", entityType: "transaction", entityId: String(txn._id), summary: reason });
}
