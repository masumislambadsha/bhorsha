import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { BankAccount, CustomerProfile, LedgerEntry, TransactionModel } from "@/server/db/models";
import { connectDB } from "@/server/db/mongoose";
import { openAccount } from "@/server/services/accounts";
import { ensureSettings } from "@/server/services/settings";
import { ensureSystemAccounts } from "@/server/services/system-accounts";
import { setPin } from "@/server/services/pin";
import { addLoanNote, applyForLoan, approveLoan, disburseLoan, getLoan, repayLoan, forwardLoan, rejectLoan } from "@/server/services/loans";

const admin = { id: "l9-admin", role: "admin" as const };
const staff = { id: "l9-staff", role: "staff" as const };
const customer = (id: string) => ({ id, role: "customer" as const });

describe("loans (§13.9)", () => {
  let accountId: string;
  let loanId: string;

  beforeAll(async () => {
    await connectDB();
    await ensureSettings();
    await ensureSystemAccounts();
    await CustomerProfile.insertMany([{ userId: "l9-a", kycStatus: "verified", status: "active" }]);
    await setPin(customer("l9-a"), "l9-a", "1234");
    accountId = await openAccount(admin, { customerId: "l9-a", type: "savings" });
    await BankAccount.updateOne({ _id: accountId }, { $set: { balanceMinor: 5_000_000 } });
  });

  it("§13.9: applies, forwards, approves, disburses (ledger written), repays everything → completed", async () => {
    const applied = await applyForLoan(customer("l9-a"), {
      loanType: "personal",
      amount: "10000.00",
      durationMonths: 6,
      monthlyIncome: "5000.00",
      employmentStatus: "salaried",
      description: "Funds for home renovation of our apartment building.",
      disbursementAccountId: accountId,
    });
    expect(applied.status).toBe("pending");
    loanId = applied.id;

    // Staff can't approve; nobody can act on their own loan.
    await expect(approveLoan(staff, loanId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(approveLoan(customer("l9-a"), loanId)).rejects.toMatchObject({ code: "FORBIDDEN" });

    await forwardLoan(staff, loanId, { recommendation: "approve", note: "OK" });
    expect((await getLoan(customer("l9-a"), loanId)).status).toBe("under_review");
    await addLoanNote(staff, loanId, "Reviewed income statements; background is clean.");

    await approveLoan(admin, loanId);
    const approved = await getLoan(customer("l9-a"), loanId);
    expect(approved.status).toBe("approved");
    expect(approved.emiMinor).toBeGreaterThan(0);
    expect(approved.totalInterestMinor).toBeGreaterThan(0);
    expect(approved.schedule.length).toBe(6);

    await disburseLoan(admin, loanId);
    const disbursed = await getLoan(customer("l9-a"), loanId);
    expect(disbursed.status).toBe("active");
    const txn = await TransactionModel.findOne({ type: "loan_disbursement" }).lean();
    expect(txn?.status).toBe("completed");
    const entries = await LedgerEntry.find({ transactionId: String(txn!._id) }).lean();
    expect(entries.length).toBeGreaterThanOrEqual(2);
    const account = await BankAccount.findById(accountId).lean();
    expect(account?.balanceMinor).toBeGreaterThanOrEqual(disbursed.outstandingMinor);
    await expect(disburseLoan(admin, loanId)).rejects.toMatchObject({ code: "INVALID_STATE" });

    const result = await repayLoan(customer("l9-a"), loanId, { fromAccountId: accountId, pin: "1234", mode: "payoff", idempotencyKey: randomUUID() });
    expect(result.status).toBe("completed");
    expect(result.outstandingMinor).toBe(0);
    expect((await getLoan(customer("l9-a"), loanId)).repayments.length).toBeGreaterThan(0);
  });

  it("§13.9: rejects a loan with a reason", async () => {
    const applied2 = await applyForLoan(customer("l9-a"), {
      loanType: "car",
      amount: "30000.00",
      durationMonths: 24,
      monthlyIncome: "5000.00",
      employmentStatus: "salaried",
      description: "Funds to buy a new car for my family member's use.",
      disbursementAccountId: accountId,
    });
    await rejectLoan(admin, applied2.id, { reason: "Insufficient income documentation." });
    expect((await getLoan(customer("l9-a"), applied2.id)).status).toBe("rejected");
  });
});
