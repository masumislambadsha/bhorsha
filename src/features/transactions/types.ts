export interface TransactionDto {
  id: string;
  reference: string;
  type: string;
  status: string;
  amountMinor: number;
  feeMinor: number;
  fromAccountNumber: string | null;
  toAccountNumber: string | null;
  description: string | null;
  createdAt: string;
}
