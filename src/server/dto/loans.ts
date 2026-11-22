import type { ILoan } from "@/server/db/models";

export interface LoanDto {
  id: string;
  loanType: string;
  status: string;
  principalMinor: number;
  outstandingMinor: number;
  durationMonths: number;
}

export function toLoanDto(loan: ILoan): LoanDto {
  return {
    id: String(loan._id),
    loanType: loan.loanType,
    status: loan.status,
    principalMinor: loan.principalMinor,
    outstandingMinor: loan.outstandingMinor,
    durationMonths: loan.durationMonths,
  };
}
