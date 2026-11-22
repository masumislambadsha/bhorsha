import type { ITransaction } from "@/server/db/models";

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

export function toTransactionDto(transaction: ITransaction): TransactionDto {
  return {
    id: String(transaction._id),
    reference: transaction.reference,
    type: transaction.type,
    status: transaction.status,
    amountMinor: transaction.amountMinor,
    feeMinor: transaction.feeMinor,
    fromAccountNumber: transaction.fromAccountNumber ?? null,
    toAccountNumber: transaction.toAccountNumber ?? null,
    description: transaction.description ?? null,
    createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : new Date().toISOString(),
  };
}
