export type RequestKind = "deposit" | "withdrawal";

export type RequestStatus = "pending" | "approved" | "rejected";

export interface RequestDto {
  id: string;
  kind: RequestKind;
  accountId: string;
  customerId: string;
  amountMinor: number;
  description: string | null;
  status: RequestStatus;
  holdMinor: number;
  transactionId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionReason: string | null;
  requestDate: string;
  createdAt: string;
}
