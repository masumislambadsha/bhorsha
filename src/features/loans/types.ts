export interface LoanDto {
  id: string;
  loanType: string;
  status: string;
  principalMinor: number;
  outstandingMinor: number;
  durationMonths: number;
}
