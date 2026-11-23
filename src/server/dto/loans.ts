import type { ILoan } from "@/server/db/models";
import type { LoanDto } from "@/features/loans/types";

export type { LoanDto };

export function toLoanDto(loan: ILoan): LoanDto {
  return {
    id: String(loan._id),
    loanType: loan.loanType,
    status: loan.status,
    applicantId: loan.applicantId,
    principalMinor: loan.principalMinor,
    outstandingMinor: loan.outstandingMinor,
    durationMonths: loan.durationMonths,
    rateBps: loan.annualRateBps,
    emiMinor: loan.emiMinor ?? null,
    totalInterestMinor: loan.totalInterestMinor ?? null,
    totalPayableMinor: loan.totalPayableMinor ?? null,
    debtToIncome: loan.debtToIncome,
    monthlyIncomeMinor: loan.monthlyIncomeMinor,
    description: loan.description,
    disbursementAccountId: String(loan.disbursementAccountId),
    schedule: (loan.schedule ?? []).map((i) => ({
      n: i.n,
      dueDate: i.dueDate.toISOString(),
      principalMinor: i.principalMinor,
      interestMinor: i.interestMinor,
      amountDueMinor: i.amountDueMinor,
      status: i.status,
      paidAt: i.paidAt ? i.paidAt.toISOString() : null,
    })),
    repayments: loan.repayments.map((r) => ({
      transactionId: String(r.transactionId),
      amountMinor: r.amountMinor,
      installments: r.installments,
      paidAt: r.paidAt.toISOString(),
    })),
    notes: loan.notes.map((n) => ({ authorId: n.authorId, authorRole: n.authorRole, body: n.body, createdAt: n.createdAt.toISOString() })),
    forwarded: loan.forwarded
      ? { by: loan.forwarded.by, at: loan.forwarded.at ? loan.forwarded.at.toISOString() : "", recommendation: loan.forwarded.recommendation, note: loan.forwarded.note ?? "" }
      : null,
    decision: loan.decision
      ? { by: loan.decision.by, at: loan.decision.at ? loan.decision.at.toISOString() : "", ...(loan.decision.reason ? { reason: loan.decision.reason } : {}) }
      : null,
    disbursement: loan.disbursement
      ? { by: loan.disbursement.by, at: loan.disbursement.at ? loan.disbursement.at.toISOString() : "", transactionId: String(loan.disbursement.transactionId) }
      : null,
  };
}
