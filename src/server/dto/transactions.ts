import type { ITransaction } from "@/server/db/models";
import type { TransactionDto } from "@/features/transactions/types";

export type { TransactionDto };

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
    review: {
      required: transaction.review?.required ?? false,
      reason: transaction.review?.reason ?? null,
      decision: transaction.review?.decision ?? null,
      note: transaction.review?.note ?? null,
      reviewedBy: transaction.review?.reviewedBy ?? null,
      reviewedAt: transaction.review?.reviewedAt ? new Date(transaction.review.reviewedAt).toISOString() : null,
    },
    flags: (transaction.flags ?? []).map((flag) => ({
      source: flag.source,
      rule: flag.rule ?? null,
      severity: flag.severity,
      reason: flag.reason,
      raisedBy: flag.raisedBy ?? null,
      raisedAt: new Date(flag.raisedAt).toISOString(),
      status: flag.status,
      resolvedBy: flag.resolvedBy ?? null,
      resolvedAt: flag.resolvedAt ? new Date(flag.resolvedAt).toISOString() : null,
      resolution: flag.resolution ?? null,
    })),
    flagStatus: transaction.flagStatus ?? "none",
  };
}
