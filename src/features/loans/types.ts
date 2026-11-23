export interface LoanInstallmentDto {
  n: number;
  dueDate: string;
  principalMinor: number;
  interestMinor: number;
  amountDueMinor: number;
  status: "due" | "paid";
  paidAt: string | null;
}

export interface LoanRepaymentDto {
  transactionId: string;
  amountMinor: number;
  installments: number[];
  paidAt: string;
}

export interface LoanNoteDto {
  authorId: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export interface LoanForwarded {
  by: string;
  at: string;
  recommendation: "approve" | "reject";
  note: string;
}

export interface LoanDecision {
  by: string;
  at: string;
  reason?: string;
}

export interface LoanDisbursement {
  by: string;
  at: string;
  transactionId: string;
}

export interface LoanDto {
  id: string;
  loanType: string;
  status: string;
  applicantId: string;
  principalMinor: number;
  outstandingMinor: number;
  durationMonths: number;
  rateBps: number;
  emiMinor: number | null;
  totalInterestMinor: number | null;
  totalPayableMinor: number | null;
  debtToIncome: number;
  monthlyIncomeMinor: number;
  description: string;
  disbursementAccountId: string;
  schedule: LoanInstallmentDto[];
  repayments: LoanRepaymentDto[];
  notes: LoanNoteDto[];
  forwarded: LoanForwarded | null;
  decision: LoanDecision | null;
  disbursement: LoanDisbursement | null;
}
