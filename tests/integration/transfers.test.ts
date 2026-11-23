import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { BankAccount, BankSettings, CustomerProfile, LedgerEntry, Notification, TransactionModel } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { openAccount } from "@/server/services/accounts";
import { ensureSettings } from "@/server/services/settings";
import { ensureSystemAccounts } from "@/server/services/system-accounts";
import { setPin } from "@/server/services/pin";
import { reviewTransfer, resolveFlags } from "@/server/services/review";
import { transfer } from "@/server/services/transfer";

const adminActor = { id: "a1", role: "admin" as const };
const customer = (id: string) => ({ id, role: "customer" as const });

async function ledgerNet(transactionId: string): Promise<{ debits: number; credits: number }> {
  const entries = await LedgerEntry.find({ transactionId }).lean();
  return {
    debits: entries.filter((e) => e.direction === "debit").reduce((s, e) => s + e.amountMinor, 0),
    credits: entries.filter((e) => e.direction === "credit").reduce((s, e) => s + e.amountMinor, 0),
  };
}

describe("transfers (§13.1–§13.7, §13.10)", () => {
  let accountA: string;
  let accountB: string;
  let accountC: string;
  let accountD: string;
  const accountBNumber = () => accountBNumber_;
  let accountBNumber_: string;

  beforeAll(async () => {
    await connectDB();
    await ensureSettings();
    await ensureSystemAccounts();
    await CustomerProfile.insertMany([
      { userId: "tx-a", kycStatus: "verified", status: "active" },
      { userId: "tx-b", kycStatus: "verified", status: "active" },
      { userId: "tx-c", kycStatus: "verified", status: "active" },
      { userId: "tx-d", kycStatus: "verified", status: "active" },
    ]);
    await Promise.all([
      setPin(customer("tx-a"), "tx-a", "1234"),
      setPin(customer("tx-b"), "tx-b", "1234"),
      setPin(customer("tx-c"), "tx-c", "1234"),
      setPin(customer("tx-d"), "tx-d", "1234"),
    ]);
    accountA = await openAccount(adminActor, { customerId: "tx-a", type: "savings" });
    accountB = await openAccount(adminActor, { customerId: "tx-b", type: "savings" });
    accountC = await openAccount(adminActor, { customerId: "tx-c", type: "savings" });
    accountD = await openAccount(adminActor, { customerId: "tx-d", type: "savings" });
    accountBNumber_ = (await BankAccount.findById(accountB).lean())?.accountNumber ?? "";
    await BankAccount.updateOne({ _id: accountA }, { $set: { balanceMinor: 100_000 } });
  });

  it("§13.1: completed transfer updates balances, writes balanced ledger entries, creates notifications, and updates dailyOutflow", async () => {
    const before = await BankAccount.findById(accountA).lean();
    const result = await transfer(customer("tx-a"), {
      fromAccountId: accountA,
      toAccountNumber: accountBNumber(),
      amount: "100.00",
      pin: "1234",
      idempotencyKey: randomUUID(),
    });
    expect(result.idempotentReplay).toBe(false);
    expect(result.transaction.status).toBe("completed");

    const after = await BankAccount.findById(accountA).lean();
    const total = 11_000; // ৳100 + ৳10 fee
    expect(after?.balanceMinor).toBe(before!.balanceMinor - total);

    const { debits, credits } = await ledgerNet(result.transaction.id);
    expect(debits).toBe(credits);
    expect(credits).toBeGreaterThan(0);
    expect(await LedgerEntry.countDocuments({ transactionId: result.transaction.id })).toBeGreaterThanOrEqual(2);

    expect(after?.dailyOutflow.amountMinor).toBe(10_000);

    expect(await Notification.countDocuments({ type: "money_received", userId: "tx-b" })).toBeGreaterThan(0);
    expect(await Notification.countDocuments({ type: "transfer_sent", userId: "tx-a" })).toBeGreaterThan(0);
  });

  it("§13.2: insufficient funds produce a failed record with no ledger entries; min/per-txn/daily limits enforced", async () => {
    // Per-transaction limit: "25.00" = 2,500 > 2,000.
    await BankAccount.updateOne({ _id: accountA }, { $set: { "limits.perTransactionMinor": 2_000 } });
    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "25.00", pin: "1234", idempotencyKey: randomUUID() }),
    ).rejects.toMatchObject({ code: "LIMIT_PER_TRANSACTION" });

    // Daily limit: accountA already transferred ৳100 today; cap the daily transfer at ৳10.
    await BankAccount.updateOne({ _id: accountA }, { $set: { "limits.dailyTransferMinor": 10_000 } });
    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "1.00", pin: "1234", idempotencyKey: randomUUID() }),
    ).rejects.toMatchObject({ code: "LIMIT_DAILY" });

    // Insufficient: within limits but balance too low (200 − total 110 < 500).
    await BankAccount.updateOne({ _id: accountA }, {
      $set: { balanceMinor: 200, "limits.perTransactionMinor": 2_000, "limits.dailyTransferMinor": 20_000_000, "limits.minimumBalanceMinor": 500 },
    });
    const result = transfer(customer("tx-a"), {
      fromAccountId: accountA,
      toAccountNumber: accountBNumber(),
      amount: "1.00",
      pin: "1234",
      idempotencyKey: randomUUID(),
    });
    await expect(result).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });

    const failed = await TransactionModel.findOne({ status: "failed", failureCode: "INSUFFICIENT_FUNDS", initiatedBy: "tx-a" }).lean();
    expect(failed).toBeTruthy();
    expect(failed?.idempotencyKey).toBeFalsy();
    expect(await LedgerEntry.countDocuments({ transactionId: failed!._id })).toBe(0);

    const after = await BankAccount.findById(accountA).lean();
    expect(after?.balanceMinor).toBe(200);

    // Restore defaults for the later tests.
    await BankAccount.updateOne({ _id: accountA }, {
      $set: {
        balanceMinor: 100_000,
        "limits.perTransactionMinor": 10_000_000,
        "limits.dailyTransferMinor": 20_000_000,
        "limits.minimumBalanceMinor": 50_000,
      },
    });
  });

  it("§13.3: frozen sender, frozen receiver, inactive customer, unverified KYC are rejected", async () => {
    const key = randomUUID();

    await BankAccount.updateOne({ _id: accountA }, { $set: { status: "frozen" } });
    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "1.00", pin: "1234", idempotencyKey: key }),
    ).rejects.toMatchObject({ code: "ACCOUNT_NOT_ACTIVE" });
    await BankAccount.updateOne({ _id: accountA }, { $set: { status: "active" } });

    await BankAccount.updateOne({ _id: accountB }, { $set: { status: "frozen" } });
    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "1.00", pin: "1234", idempotencyKey: key }),
    ).rejects.toMatchObject({ code: "RECIPIENT_NOT_ACTIVE" });
    await BankAccount.updateOne({ _id: accountB }, { $set: { status: "active" } });

    await CustomerProfile.updateOne({ userId: "tx-a" }, { $set: { status: "inactive" } });
    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "1.00", pin: "1234", idempotencyKey: key }),
    ).rejects.toMatchObject({ code: "CUSTOMER_INACTIVE" });
    await CustomerProfile.updateOne({ userId: "tx-a" }, { $set: { status: "active" } });

    await CustomerProfile.updateOne({ userId: "tx-a" }, { $set: { kycStatus: "pending" } });
    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "1.00", pin: "1234", idempotencyKey: key }),
    ).rejects.toMatchObject({ code: "KYC_REQUIRED" });
    await CustomerProfile.updateOne({ userId: "tx-a" }, { $set: { kycStatus: "verified" } });
  });

  it("§13.5: idempotent replay returns the same transaction; reuse with a different payload is rejected; POSSIBLE_DUPLICATE fires within 2 minutes", async () => {
    const key = randomUUID();
    const first = await transfer(customer("tx-a"), {
      fromAccountId: accountA,
      toAccountNumber: accountBNumber(),
      amount: "3.33",
      pin: "1234",
      idempotencyKey: key,
      confirmDuplicate: true,
    });
    const second = await transfer(customer("tx-a"), {
      fromAccountId: accountA,
      toAccountNumber: accountBNumber(),
      amount: "3.33",
      pin: "1234",
      idempotencyKey: key,
      confirmDuplicate: true,
    });
    expect(second.idempotentReplay).toBe(true);
    expect(second.transaction.reference).toBe(first.transaction.reference);

    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "1.00", pin: "1234", idempotencyKey: key, confirmDuplicate: true }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });

    await expect(
      transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "3.33", pin: "1234", idempotencyKey: randomUUID(), confirmDuplicate: false }),
    ).rejects.toMatchObject({ code: "POSSIBLE_DUPLICATE" });
    // Confirming the duplicate re-sends it.
    const resend = await transfer(customer("tx-a"), { fromAccountId: accountA, toAccountNumber: accountBNumber(), amount: "3.33", pin: "1234", idempotencyKey: randomUUID(), confirmDuplicate: true });
    expect(resend.transaction.status).toBe("completed");
  });

  it("§13.6: 10 parallel transfers of Χ100 — exactly 5 complete, final balance correct, never negative", async () => {
    // Fresh account for a clean velocity slate.
    const total = 11_000; // ৳100 + ৳10 fee
    const min = 50_000; // savings minimum balance ৳500
    const target = 5 * total + min; // allows exactly 5 more transfers while keeping the minimum
    await BankSettings.updateOne({ key: "default" }, { $set: { "risk.velocityCount": 100 } }); // disable velocity holds for determinism
    await BankAccount.updateOne({ _id: accountD }, { $set: { balanceMinor: target, dailyOutflow: { date: "", amountMinor: 0 } } });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        transfer(customer("tx-d"), {
          fromAccountId: accountD,
          toAccountNumber: accountBNumber(),
          amount: "100.00",
          pin: "1234",
          idempotencyKey: randomUUID(),
          confirmDuplicate: true,
        }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(5);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected.length).toBeGreaterThan(0);

    const after = await BankAccount.findById(accountD).lean();
    expect(after?.balanceMinor).toBe(50_000);
    expect(after?.balanceMinor).toBeGreaterThanOrEqual(min);
    await BankSettings.updateOne({ key: "default" }, { $set: { "risk.velocityCount": 5 } });
  });

  it("§13.7: held transfers complete on approve and release on reject; initiator can't review their own", async () => {
    await BankSettings.updateOne({ key: "default" }, { $set: { reviewThresholdMinor: 2_000 } });
    await BankAccount.updateOne({ _id: accountC }, { $set: { balanceMinor: 60_000 } });

    const held = await transfer(customer("tx-c"), {
      fromAccountId: accountC,
      toAccountNumber: accountBNumber(),
      amount: "20.00",
      pin: "1234",
      idempotencyKey: randomUUID(),
    });
    expect(held.transaction.status).toBe("pending");
    expect(held.transaction.review.required).toBe(true);

    const afterHold = await BankAccount.findById(accountC).lean();
    expect(afterHold?.holdMinor).toBeGreaterThanOrEqual(3_000);

    // The initiator can't review their own transfer (staff-typed actor with the initiator's id).
    await expect(
      reviewTransfer({ id: "tx-c", role: "staff" }, held.transaction.id, { decision: "approve" }),
    ).rejects.toMatchObject({ code: "SELF_APPROVAL_NOT_ALLOWED" });

    const total = held.transaction.amountMinor + held.transaction.feeMinor;
    const beforeC = await BankAccount.findById(accountC).lean();
    await reviewTransfer(adminActor, held.transaction.id, { decision: "approve", note: "fine" });
    const txn = await TransactionModel.findOne({ reference: held.transaction.reference }).lean();
    expect(txn?.status).toBe("completed");
    const afterC = await BankAccount.findById(accountC).lean();
    expect(afterC?.balanceMinor).toBe(beforeC!.balanceMinor - total);
    expect(afterC?.holdMinor).toBe(0);
    const { debits, credits } = await ledgerNet(String(txn!._id));
    expect(debits).toBe(credits);

    // Reject path: another held transfer, then reject → failed with released hold.
    const held2 = await transfer(customer("tx-c"), {
      fromAccountId: accountC,
      toAccountNumber: accountBNumber(),
      amount: "20.00",
      pin: "1234",
      idempotencyKey: randomUUID(),
      confirmDuplicate: true,
    });
    expect(held2.transaction.status).toBe("pending");
    const beforeC2 = await BankAccount.findById(accountC).lean();
    await reviewTransfer(adminActor, held2.transaction.id, { decision: "reject", note: "not enough" });
    const txn2 = await TransactionModel.findOne({ reference: held2.transaction.reference }).lean();
    expect(txn2?.status).toBe("failed");
    expect(txn2?.failureCode).toBe("REJECTED_BY_REVIEW");
    const afterC2 = await BankAccount.findById(accountC).lean();
    expect(afterC2?.balanceMinor).toBe(beforeC2!.balanceMinor);
    expect(afterC2?.holdMinor).toBe(0);
  });

  it("§13.10: reversal of a completed transfer; REVERSAL_INSUFFICIENT_FUNDS when the receiver can't cover it", async () => {
    const t = await transfer(customer("tx-a"), {
      fromAccountId: accountA,
      toAccountNumber: accountBNumber(),
      amount: "5.00",
      pin: "1234",
      idempotencyKey: randomUUID(),
      confirmDuplicate: true,
    });
    const beforeA = await BankAccount.findById(accountA).lean();
    const beforeB = await BankAccount.findById(accountB).lean();

    await resolveFlags(adminActor, t.transaction.id, { action: "reverse" });
    const txn = await TransactionModel.findOne({ reference: t.transaction.reference }).lean();
    expect(txn?.status).toBe("reversed");

    const afterA = await BankAccount.findById(accountA).lean();
    const afterB = await BankAccount.findById(accountB).lean();
    expect(afterA?.balanceMinor).toBe(beforeA!.balanceMinor + t.transaction.amountMinor + t.transaction.feeMinor);
    expect(afterB?.balanceMinor).toBe(beforeB!.balanceMinor - t.transaction.amountMinor);

    const { debits, credits } = await ledgerNet(String(txn!._id));
    expect(debits).toBe(credits);

    // Insufficient receiver funds → REVERSAL_INSUFFICIENT_FUNDS: drain accountB after t2 lands.
    const t2 = await transfer(customer("tx-a"), {
      fromAccountId: accountA,
      toAccountNumber: accountBNumber(),
      amount: "5.00",
      pin: "1234",
      idempotencyKey: randomUUID(),
      confirmDuplicate: true,
    });
    await BankAccount.updateOne({ _id: accountB }, { $set: { balanceMinor: 0 } });
    await expect(resolveFlags(adminActor, t2.transaction.id, { action: "reverse" })).rejects.toMatchObject({
      code: "REVERSAL_INSUFFICIENT_FUNDS",
    });
  });
});
