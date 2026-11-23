export interface MonthlySeries extends SeriesPoint {
  month: string;
  deposit: number;
  withdrawal: number;
  transfer: number;
  loanDisbursement: number;
  loanRepayment: number;
}

export interface MonthlyPoint {
  month: string;
  amountMinor: number;
}

export interface SeriesPoint {
  month: string;
  [series: string]: number | string;
}

export interface AccountDistributionPoint {
  label: string;
  count: number;
  amountMinor: number;
}

export interface StatusCount {
  label: string;
  count: number;
}

export interface NeedsAttention {
  openFlags: number;
  heldTransfers: number;
  largeRequests: number;
  loansUnderReview: number;
}

export interface AdminStats {
  totalCustomers: number;
  totalAccounts: number;
  totalBankBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransactions: number;
  pendingLoanApplications: number;
  monthlyTransactionVolume: MonthlyPoint[];
  depositVsWithdrawal: SeriesPoint[];
  accountDistribution: AccountDistributionPoint[];
  loanApprovalStats: StatusCount[];
  monthlyBankingActivity: SeriesPoint[];
  needsAttention: NeedsAttention;
}

export interface StaffStats {
  kycPending: number;
  pendingRequests: number;
  heldTransfers: number;
  openFlags: number;
  loansAwaitingReview: number;
}

export interface CustomerStats {
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeLoans: { count: number; outstandingMinor: number };
  recentTransactions: {
    id: string;
    reference: string;
    type: string;
    status: string;
    amountMinor: number;
    description: string | null;
    createdAt: string;
  }[];
  monthlySpending: MonthlyPoint[];
  monthlyDeposits: MonthlyPoint[];
  transactionDistribution: StatusCount[];
}
