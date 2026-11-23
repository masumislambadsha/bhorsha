import { describe, expect, it, beforeAll } from "vitest";
import { BankAccount, BankSettings, CustomerProfile, DepositWithdrawalRequest, LedgerEntry, TransactionModel } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { openAccount } from "@/server/services/accounts";
import { ensureSettings } from "@/server/services/settings";
import { ensureSystemAccounts } from "@/server/services/system-accounts";
import { setPin } from "@/server/services/pin";
import { approveRequest, createRequest, listRequests, rejectRequest } from "@/server/services/requests";
import { transfer } from "@/server/services/transfer";

const adminActor = { id: "w8-admin", role: "admin" as const };
const staffActor = { id: "w8-staff", role: "staff" as const };
const customer = (id: string) => ({ id, role: "customer" as const });
const actor = customer("w8-cust");

describe("deposit/withdrawal requests (§8.5, §13.8)", () => {
  let accountId: string;
  let secondAccountId: string;
  let secondAccountNumber: string;

  beforeAll(async () => {
    await connectDB();
    await ensureSettings();
    await ensureSystemAccounts();
    await BankSettings.updateOne({ key: "default" }, { $set: { "risk.velocityCount": 1000 } });
    await CustomerProfile.insertMany([
      { userId: "w8-cust", kycStatus: "verified", status: "active" },
      { userId: "w8-b", kycStatus: "verified", status: "active" },
    ]);
    await setPin(actor, "w8-cust", "1234");
    accountId = await openAccount(adminActor, { customerId: "w8-cust", type: "savings" });
    secondAccountId = await openAccount(adminActor, { customerId: "w8-b", type: "savings" });
    secondAccountNumber = (await BankAccount.findById(secondAccountId).lean())?.accountNumber ?? "";
    await BankAccount.updateOne({ _id: accountId }, { $set: { balanceMinor: 10_000_000 } }); // ৳100,000
    await BankAccount.updateOne({ _id: secondAccountId }, { $set: { balanceMinor: 100_000_000 } }); // ৳1,000,000
  });

  it("§13.8: creates and approves a deposit request (staff, never the requester)", async () => {
    const deposit = await createRequest(actor, { kind: "deposit", accountId, amount: "5.00" });
    expect(deposit.status).toBe("pending");
    expect(deposit.holdMinor).toBe(0);

    const before = await BankAccount.findById(accountId).lean();
    await approveRequest(staffActor, deposit.id, {});
    const after = await BankAccount.findById(accountId).lean();
    expect(after?.balanceMinor).toBe((before?.balanceMinor ?? 0) + 500);

    const txn = await TransactionModel.findOne({ _id: deposit.transactionId }).lean();
    expect(txn?.status).toBe("completed");
    expect(txn?.type).toBe("deposit");
    const entries = await LedgerEntry.find({ transactionId: String(deposit.transactionId) }).lean();
    expect(entries.length).toBeGreaterThanOrEqual(2);

    await expect(approveRequest(actor, deposit.id, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("§13.8: withdrawal request: hold blocks spending; approve converts it", async () => {
    const before = await BankAccount.findById(accountId).lean();
    // ৳99,500 withdrawal: leaves the account ৳50,500 available, under the ৳50,000 minimum.
    const request = await createRequest(actor, { kind: "withdrawal", accountId, amount: "99500.00" });
    expect(request.status).toBe("pending");
    expect(request.holdMinor).toBe(9_950_000);

    const during = await BankAccount.findById(accountId).lean();
    expect(during?.holdMinor).toBe(9_950_000);
    expect(during?.balanceMinor).toBe(before?.balanceMinor ?? 0);

    // The hold blocks spending: ৳100 to another account is insufficient.
    await expect(
      transfer(actor, { fromAccountId: accountId, toAccountNumber: secondAccountNumber, amount: "100.00", pin: "1234", idempotencyKey: "w8-blocked-1" }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });

    const balanceBeforeApprove = (await BankAccount.findById(accountId).lean())?.balanceMinor ?? 0;
    await approveRequest(adminActor, request.id, {});
    const afterApprove = await BankAccount.findById(accountId).lean();
    expect(afterApprove?.holdMinor).toBe(0);
    expect(afterApprove?.balanceMinor).toBe(balanceBeforeApprove - 9_950_000);
    const txn = await TransactionModel.findOne({ _id: request.transactionId }).lean();
    expect(txn?.status).toBe("completed");
    expect(txn?.type).toBe("withdrawal");
    const entries = await LedgerEntry.find({ transactionId: String(request.transactionId) }).lean();
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  it("§13.8: rejecting a withdrawal releases the hold and leaves the balance unchanged", async () => {
    const request = await createRequest(actor, { kind: "withdrawal", accountId: secondAccountId, amount: "500000.00" });
    const balanceBeforeReject = (await BankAccount.findById(secondAccountId).lean())?.balanceMinor ?? 0;
    await rejectRequest(adminActor, request.id, { reason: "not now" });
    const afterReject = await BankAccount.findById(secondAccountId).lean();
    expect(afterReject?.holdMinor).toBe(0);
    expect(afterReject?.balanceMinor).toBe(balanceBeforeReject);
    const rejected = await DepositWithdrawalRequest.findById(request.id).lean();
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.rejectionReason).toBe("not now");
  });

  it("§13.8: enforces per-transaction limit; staff approval limit is enforced, admins can approve above it", async () => {
    // Withdrawal above the savings per-transaction limit (৳10,00,000).
    await expect(
      createRequest(actor, { kind: "withdrawal", accountId, amount: "1000000.01" }),
    ).rejects.toMatchObject({ code: "LIMIT_PER_TRANSACTION" });

    // Staff approval limit is ৳500,000: ৳600,000 → APPROVAL_LIMIT_EXCEEDED for staff; admin ok.
    const above = await createRequest(actor, { kind: "withdrawal", accountId: secondAccountId, amount: "600000.00" });
    await expect(approveRequest(staffActor, above.id, {})).rejects.toMatchObject({ code: "APPROVAL_LIMIT_EXCEEDED" });
    await approveRequest(adminActor, above.id, {});
    const req = await DepositWithdrawalRequest.findById(above.id).lean();
    expect(req?.status).toBe("approved");
  });

  it("lists requests per role (§13.8)", async () => {
    const mine = await listRequests(actor, { page: 1, pageSize: 20 });
    expect(mine.items.some((r) => r.kind === "withdrawal")).toBe(true);
    expect(mine.items.every((r) => r.customerId === "w8-cust")).toBe(true);
    const all = await listRequests(staffActor, { page: 1, pageSize: 50 });
    expect(all.total).toBeGreaterThanOrEqual(mine.total);
    const approved = await listRequests(staffActor, { status: "approved", page: 1, pageSize: 20 });
    expect(approved.items.length).toBeGreaterThan(0);
    expect(approved.items.every((r) => r.status === "approved")).toBe(true);
  });
});
