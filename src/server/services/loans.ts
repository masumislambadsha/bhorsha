import "server-only";

import type { Actor } from "@/server/auth/guards";
import { assertRole, assertNotSelf } from "@/server/auth/guards";
import { BankAccount, AuthUser, CustomerProfile, Loan, TransactionModel, type LoanProduct } from "@/server/db/models";
import { runInTransaction } from "@/server/db/transaction";
import { AppError } from "@/server/http/errors";
import { paginate, type Page } from "@/server/http/pagination";
import { toMinor, formatBDT } from "@/lib/money";
import { emiOf, buildSchedule } from "@/lib/emi";
import { generateReference } from "@/lib/ids";
import { toLoanDto, type LoanDto } from "@/server/dto/loans";
import { writeLedgerEntries, assertLedgerBalanced, type LedgerEntryDraft } from "@/server/services/ledger";
import { createNotification } from "@/server/services/notifications";
import { writeAuditLog } from "@/server/services/audit";
import { getSettings } from "@/server/services/settings";
import { systemAccountId } from "@/server/services/system-accounts";
import { verifyPin } from "@/server/services/pin";

export interface ListLoansInput {
  customerId?: string;
  status?: string;
  page: number;
  pageSize: number;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function getLoanProducts(): Promise<{ loanType: string; product: LoanProduct }[]> {
  const settings = await getSettings();
  return Object.entries(settings.loanProducts).map(([loanType, product]) => ({ loanType, product }));
}

export interface ApplyLoanInput {
  loanType: string;
  amount: string;
  durationMonths: number;
  monthlyIncome: string;
  employmentStatus: string;
  description: string;
  disbursementAccountId: string;
}

/** §8.6: the customer applies for a loan (pending). */
export async function applyForLoan(actor: Actor | null, input: ApplyLoanInput): Promise<LoanDto> {
  assertRole(actor, ["customer"]);
  const profile = await CustomerProfile.findOne({ userId: actor.id }).lean();
  if (!profile) throw new AppError("NOT_FOUND", "Customer not found.");
  if (profile.status !== "active") throw new AppError("CUSTOMER_INACTIVE", "Your account is inactive.");
  if (profile.kycStatus !== "verified") throw new AppError("KYC_REQUIRED", "You need a verified account before you can apply for a loan.");

  const amountMinor = toMinor(input.amount.trim());
  const settings = await getSettings();
  const product: LoanProduct | undefined = settings.loanProducts[input.loanType as keyof typeof settings.loanProducts];
  if (!product) throw new AppError("VALIDATION_ERROR", "Unknown loan type.");
  if (amountMinor > product.maxPrincipalMinor) throw new AppError("VALIDATION_ERROR", `This loan product maxes at ${formatBDT(product.maxPrincipalMinor)}.`);
  if (!Number.isInteger(input.durationMonths) || input.durationMonths < product.minMonths || input.durationMonths > product.maxMonths) {
    throw new AppError("VALIDATION_ERROR", "Choose a duration between the product's minimum and maximum.");
  }
  const description = input.description.trim();
  if (description.length < 20 || description.length > 500) throw new AppError("VALIDATION_ERROR", "The description must be 20-500 characters.");
  const monthlyIncomeMinor = toMinor(input.monthlyIncome.trim());
  const disbursement = await BankAccount.findOne({ _id: input.disbursementAccountId, kind: "customer", ownerId: actor.id, status: "active" }).lean();
  if (!disbursement) throw new AppError("RECIPIENT_NOT_FOUND", "Choose your own active account for the disbursement.");

  const emi = emiOf(amountMinor, product.annualRateBps, input.durationMonths);
  const [loan] = await Loan.create([
    {
      applicantId: actor.id,
      loanType: input.loanType,
      principalMinor: amountMinor,
      durationMonths: input.durationMonths,
      annualRateBps: product.annualRateBps,
      monthlyIncomeMinor,
      employmentStatus: input.employmentStatus,
      description,
      disbursementAccountId: disbursement._id,
      status: "pending",
      debtToIncome: monthlyIncomeMinor > 0 ? emi / monthlyIncomeMinor : 0,
      schedule: [],
    },
  ]);
  const loanId = String(loan._id);
  await createNotification(actor.id, {
    type: "loan_submitted",
    title: "Loan application submitted",
    body: `Your ${input.loanType} loan of ${formatBDT(amountMinor)} was submitted for review.`,
    link: `/customer/loans/${loanId}`,
  });
  await writeAuditLog(actor, {
    action: "LOAN_APPLIED",
    entityType: "loan",
    entityId: loanId,
    summary: `Loan application for ${formatBDT(amountMinor)} submitted.`,
  });
  return toLoanDto(loan);
}

export async function listLoans(actor: Actor | null, input: ListLoansInput): Promise<Page<LoanDto>> {
  if (actor?.role === "customer") {
    const where = { applicantId: actor.id, ...(input.status ? { status: input.status } : {}) };
    const total = await Loan.countDocuments(where);
    const docs = await Loan.find(where).sort({ createdAt: -1 }).skip((input.page - 1) * input.pageSize).limit(input.pageSize).lean();
    return paginate(docs.map(toLoanDto), total, input.page, input.pageSize);
  }
  assertRole(actor, ["staff", "admin"]);
  const where: Record<string, unknown> = {};
  if (input.customerId) where.applicantId = input.customerId;
  if (input.status) where.status = input.status;
  const total = await Loan.countDocuments(where);
  const docs = await Loan.find(where).sort({ createdAt: -1 }).skip((input.page - 1) * input.pageSize).limit(input.pageSize).lean();
  return paginate(docs.map(toLoanDto), total, input.page, input.pageSize);
}

export async function getLoan(actor: Actor | null, loanId: string): Promise<LoanDto> {
  const loan = await Loan.findById(loanId).lean();
  if (!loan) throw new AppError("NOT_FOUND", "Loan not found.");
  if (actor?.role === "customer" && String(loan.applicantId) !== actor.id) throw new AppError("NOT_FOUND", "Loan not found.");
  return toLoanDto(loan);
}

/** §8.6: staff or admin add an internal note to a loan. */
export async function addLoanNote(actor: Actor | null, loanId: string, body: string): Promise<void> {
  assertRole(actor, ["staff", "admin"]);
  const loan = await Loan.findById(loanId).lean();
  if (!loan) throw new AppError("NOT_FOUND", "Loan not found.");
  await Loan.updateOne(
    { _id: loanId },
    { $push: { notes: { authorId: actor.id, authorRole: actor.role, body, createdAt: new Date() } } },
  );
  await writeAuditLog(actor, { action: "LOAN_NOTED", entityType: "loan", entityId: loanId, summary: body.slice(0, 120) });
}

/** §8.6: staff forward a pending loan to an admin. */
export async function forwardLoan(actor: Actor | null, loanId: string, input: { recommendation: "approve" | "reject"; note?: string }): Promise<void> {
  assertRole(actor, ["staff", "admin"]);
  const loan = await Loan.findById(loanId).lean();
  if (!loan) throw new AppError("NOT_FOUND", "Loan not found.");
  if (loan.status !== "pending") throw new AppError("INVALID_STATE", "Only pending loans can be forwarded.");
  assertNotSelf(actor.id, loan.applicantId);
  await Loan.updateOne(
    { _id: loanId, status: "pending" },
    { $set: { status: "under_review", forwarded: { by: actor.id, at: new Date(), recommendation: input.recommendation, note: input.note ?? "" } } },
  );
  const admins = await AuthUser.find({ role: "admin" }).select("_id").lean();
  for (const admin of admins) {
    await createNotification(String(admin._id), { type: "loan_forwarded", title: "Loan forwarded for review", body: `Loan ${loanId} is under review (recommended: ${input.recommendation}).` });
  }
  await writeAuditLog(actor, { action: "LOAN_FORWARDED", entityType: "loan", entityId: loanId, summary: `Loan forwarded for ${input.recommendation}.` });
}

/** §8.6: admin approve a pending or under-review loan. */
export async function approveLoan(actor: Actor | null, loanId: string): Promise<void> {
  assertRole(actor, ["admin"]);
  const loan = await Loan.findById(loanId).lean();
  if (!loan) throw new AppError("NOT_FOUND", "Loan not found.");
  if (loan.status !== "pending" && loan.status !== "under_review") throw new AppError("INVALID_STATE", "Only pending or under-review loans can be approved.");
  assertNotSelf(actor.id, loan.applicantId);

  await runInTransaction(async (session) => {
    const emi = emiOf(loan.principalMinor, loan.annualRateBps, loan.durationMonths);
    const schedule = buildSchedule(loan.principalMinor, emi, loan.durationMonths, loan.annualRateBps).map((i, idx) => ({
      n: idx + 1,
      dueDate: addMonths(new Date(), idx + 1),
      principalMinor: i.principalMinor,
      interestMinor: i.interestMinor,
      amountDueMinor: i.amountDueMinor,
      status: "due" as const,
    }));
    await Loan.updateOne(
      { _id: loanId, status: { $in: ["pending", "under_review"] } },
      {
        $set: {
          status: "approved",
          emiMinor: emi,
          totalInterestMinor: schedule.reduce((sum, i) => sum + i.interestMinor, 0),
          totalPayableMinor: schedule.reduce((sum, i) => sum + i.amountDueMinor, 0),
          schedule,
          debtToIncome: loan.monthlyIncomeMinor > 0 ? emi / loan.monthlyIncomeMinor : 0,
          decision: { by: actor.id, at: new Date() },
        },
      },
      { session },
    );
    await createNotification(loan.applicantId, {
      type: "loan_approved",
      title: "Loan approved",
      body: `Your ${loan.loanType} loan of ${formatBDT(loan.principalMinor)} was approved for disbursement.`,
    });
    await writeAuditLog(actor, { action: "LOAN_APPROVED", entityType: "loan", entityId: loanId, summary: `Loan approved at ${formatBDT(loan.principalMinor)}.` });
  });
}

/** §8.6: admin reject a pending, under-review, or approved loan. */
export async function rejectLoan(actor: Actor | null, loanId: string, input: { reason: string }): Promise<void> {
  assertRole(actor, ["admin"]);
  const loan = await Loan.findById(loanId).lean();
  if (!loan) throw new AppError("NOT_FOUND", "Loan not found.");
  if (loan.status !== "pending" && loan.status !== "under_review" && loan.status !== "approved") {
    throw new AppError("INVALID_STATE", "Only pending, under-review, or approved loans can be rejected.");
  }
  assertNotSelf(actor.id, loan.applicantId);
  await Loan.updateOne(
    { _id: loanId },
    { $set: { status: "rejected", decision: { by: actor.id, at: new Date(), reason: input.reason } } },
  );
  await createNotification(loan.applicantId, {
    type: "loan_rejected",
    title: "Loan rejected",
    body: `Your ${loan.loanType} loan application was rejected.`,
  });
  await writeAuditLog(actor, { action: "LOAN_REJECTED", entityType: "loan", entityId: loanId, summary: input.reason.slice(0, 120), reason: input.reason });
}

/** §8.6: admin disburse an approved loan (in one transaction, with ledger entries). */
export async function disburseLoan(actor: Actor | null, loanId: string): Promise<void> {
  assertRole(actor, ["admin"]);
  const loan = await Loan.findById(loanId).lean();
  if (!loan) throw new AppError("NOT_FOUND", "Loan not found.");
  if (loan.status !== "approved") throw new AppError("INVALID_STATE", "Only approved loans can be disbursed.");
  const account = await BankAccount.findOne({ _id: loan.disbursementAccountId, status: "active" }).lean();
  if (!account) throw new AppError("ACCOUNT_NOT_ACTIVE", "The disbursement account is not active.");

  await runInTransaction(async (session) => {
    const [txn] = await TransactionModel.create(
      [
        {
          reference: generateReference(),
          type: "loan_disbursement",
          status: "completed",
          amountMinor: loan.principalMinor,
          fromAccountId: null,
          toAccountId: loan.disbursementAccountId,
          initiatedBy: loan.applicantId,
          initiatedByRole: "customer",
          completedAt: new Date(),
          flags: [],
          flagStatus: "none",
        },
      ],
      { session },
    );
    if (!txn) throw new AppError("INTERNAL_ERROR", "Could not create the disbursement.");
    const accountUpdated = await BankAccount.findOneAndUpdate(
      { _id: loan.disbursementAccountId, status: "active" },
      { $inc: { balanceMinor: loan.principalMinor } },
      { session, new: true },
    ).lean();
    if (!accountUpdated) throw new AppError("CONFLICT", "The account changed during disbursement.");
    const portfolioId = await systemAccountId("LOAN_PORTFOLIO", session);
    const portfolio = await BankAccount.findOne({ _id: portfolioId }).lean();
    await BankAccount.findOneAndUpdate({ _id: portfolioId, status: { $ne: "closed" } }, { $inc: { balanceMinor: -loan.principalMinor } }, { session, new: true });

    const entries: LedgerEntryDraft[] = [
      { transactionId: String(txn._id), accountId: String(portfolioId), direction: "debit", amountMinor: loan.principalMinor, balanceAfterMinor: (portfolio?.balanceMinor ?? 0) - loan.principalMinor, entryType: "principal" },
      { transactionId: String(txn._id), accountId: String(loan.disbursementAccountId), direction: "credit", amountMinor: loan.principalMinor, balanceAfterMinor: accountUpdated.balanceMinor, entryType: "principal" },
    ];
    assertLedgerBalanced(entries);
    await writeLedgerEntries(entries, session);

    const firstDue = addMonths(new Date(), 1);
    const schedule = (loan.schedule.length > 0 ? loan.schedule : []).map((i, idx) => ({
      n: i.n,
      dueDate: addMonths(firstDue, idx),
      principalMinor: i.principalMinor,
      interestMinor: i.interestMinor,
      amountDueMinor: i.amountDueMinor,
      status: "due" as const,
    }));
    await Loan.updateOne(
      { _id: loanId, status: "approved" },
      {
        $set: {
          status: "active",
          outstandingMinor: loan.principalMinor,
          disbursement: { by: actor.id, at: new Date(), transactionId: txn._id },
          schedule,
        },
      },
      { session },
    );
    await createNotification(loan.applicantId, {
      type: "loan_disbursed",
      title: "Loan disbursed",
      body: `${formatBDT(loan.principalMinor)} was disbursed to your account.`,
    });
    await writeAuditLog(actor, { action: "LOAN_DISBURSED", entityType: "loan", entityId: loanId, summary: "Loan disbursed." });
  });
}

/** §8.6: customer repay a loan installment (or payoff); Idempotency-Key required. */
export async function repayLoan(
  actor: Actor | null,
  loanId: string,
  input: { fromAccountId: string; pin: string; mode: "next_installment" | "payoff"; idempotencyKey: string },
): Promise<LoanDto> {
  assertRole(actor, ["customer"]);
  const loan = await Loan.findById(loanId).lean();
  if (!loan || String(loan.applicantId) !== actor.id) throw new AppError("NOT_FOUND", "Loan not found.");
  if (loan.status !== "active") throw new AppError("INVALID_STATE", "Only active loans can be repaid.");
  if (!loan.outstandingMinor || loan.outstandingMinor <= 0) throw new AppError("INVALID_STATE", "The loan is already paid off.");

  const unpaid = (loan.schedule ?? []).filter((i) => i.status === "due");
  let amount: number;
  let paidNos: number[];
  if (input.mode === "next_installment") {
    const next = unpaid[0];
    if (!next) throw new AppError("INVALID_STATE", "No installments are due.");
    amount = next.amountDueMinor;
    paidNos = [next.n];
  } else {
    amount = loan.outstandingMinor;
    paidNos = unpaid.map((i) => i.n);
  }
  if (amount <= 0) throw new AppError("INVALID_STATE", "The loan is already paid off.");

  const existing = await TransactionModel.findOne({ initiatedBy: actor.id, idempotencyKey: input.idempotencyKey, type: "loan_repayment" }).lean();
  if (existing) {
    const replay = await Loan.findById(loanId).lean();
    return replay ? toLoanDto(replay) : toLoanDto(loan);
  }

  await verifyPin(actor, actor.id, input.pin);

  const reference = generateReference();
  const newOutstanding = Math.max(0, loan.outstandingMinor - amount);

  await runInTransaction(async (session) => {
    const account = await BankAccount.findOneAndUpdate(
      { _id: input.fromAccountId, kind: "customer", ownerId: actor.id, status: "active" },
      { $inc: { balanceMinor: -amount } },
      { session, new: true },
    ).lean();
    if (!account) throw new AppError("ACCOUNT_NOT_ACTIVE", "Your account is not active.");
    const portfolioId = await systemAccountId("LOAN_PORTFOLIO", session);
    const portfolio = await BankAccount.findOne({ _id: portfolioId }).lean();
    await BankAccount.findOneAndUpdate({ _id: portfolioId, status: { $ne: "closed" } }, { $inc: { balanceMinor: amount } }, { session, new: true });

    const [txn] = await TransactionModel.create(
      [
        {
          reference,
          type: "loan_repayment",
          status: "completed",
          amountMinor: amount,
          fromAccountId: input.fromAccountId,
          toAccountId: portfolioId,
          initiatedBy: actor.id,
          initiatedByRole: "customer",
          completedAt: new Date(),
          idempotencyKey: input.idempotencyKey,
          flags: [],
          flagStatus: "none",
        },
      ],
      { session },
    );
    if (!txn) throw new AppError("INTERNAL_ERROR", "Could not create the repayment.");

    const entries: LedgerEntryDraft[] = [
      { transactionId: String(txn._id), accountId: String(input.fromAccountId), direction: "debit", amountMinor: amount, balanceAfterMinor: account.balanceMinor, entryType: "principal" },
    ];
    if (portfolio) {
      entries.push({ transactionId: String(txn._id), accountId: String(portfolioId), direction: "credit", amountMinor: amount, balanceAfterMinor: portfolio.balanceMinor + amount, entryType: "principal" });
    }
    assertLedgerBalanced(entries);
    await writeLedgerEntries(entries, session);

    const schedule = loan.schedule.map((i) => (paidNos.includes(i.n) ? { ...i, status: "paid" as const, paidAt: new Date(), transactionId: txn._id } : i));
    const done = newOutstanding <= 0 || schedule.every((i) => i.status === "paid");
    await Loan.updateOne(
      { _id: loanId, status: "active" },
      {
        $set: { schedule, outstandingMinor: newOutstanding, status: done ? "completed" : "active", ...(done ? { completedAt: new Date() } : {}) },
        $push: { repayments: { transactionId: txn._id, amountMinor: amount, installments: paidNos, paidAt: new Date() } },
      },
      { session },
    );
  });

  await createNotification(actor.id, {
    type: "loan_repaid",
    title: "Loan repayment received",
    body: `You repaid ${formatBDT(amount)} toward your ${loan.loanType} loan.`,
  });
  await writeAuditLog(actor, { action: "LOAN_REPAID", entityType: "loan", entityId: loanId, summary: `Repayment of ${formatBDT(amount)} toward ${loan.loanType}.` });
  const updated = await Loan.findById(loanId).lean();
  return updated ? toLoanDto(updated) : toLoanDto(loan);
}
