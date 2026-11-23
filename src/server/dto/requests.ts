import type { IDepositWithdrawalRequest } from "@/server/db/models";
import type { RequestDto } from "@/features/requests/types";

export function toRequestDto(request: IDepositWithdrawalRequest): RequestDto {
  return {
    id: String(request._id),
    kind: request.kind,
    accountId: String(request.accountId),
    customerId: request.customerId,
    amountMinor: request.amountMinor,
    description: request.description ?? null,
    status: request.status,
    holdMinor: request.holdMinor,
    transactionId: request.transactionId ? String(request.transactionId) : null,
    reviewedBy: request.reviewedBy ?? null,
    reviewedAt: request.reviewedAt ? new Date(request.reviewedAt).toISOString() : null,
    reviewNote: request.reviewNote ?? null,
    rejectionReason: request.rejectionReason ?? null,
    requestDate: request.requestDate ? new Date(request.requestDate).toISOString() : new Date().toISOString(),
    createdAt: request.createdAt ? request.createdAt.toISOString() : new Date().toISOString(),
  };
}
