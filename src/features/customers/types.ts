export interface CustomerDto {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  kycStatus: string;
  kycNote: string | null;
  kycReviewedBy: string | null;
  kycReviewedAt: string | null;
  status: string;
  statusReason: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  occupation: string | null;
  createdAt: string | null;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  occupation?: string;
}

export interface CustomerDetail {
  customer: CustomerDto;
  accounts: import("@/features/accounts/types").AccountDto[];
  recentTransactions: import("@/features/transactions/types").TransactionDto[];
  loans: import("@/features/loans/types").LoanDto[];
}
