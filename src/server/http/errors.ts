import "server-only";

const STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 422,
  INSUFFICIENT_FUNDS: 422,
  LIMIT_PER_TRANSACTION: 422,
  LIMIT_DAILY: 422,
  INVALID_PIN: 422,
  PIN_LOCKED: 422,
  PIN_NOT_SET: 422,
  RECIPIENT_NOT_FOUND: 422,
  RECIPIENT_NOT_ACTIVE: 422,
  ACCOUNT_NOT_ACTIVE: 422,
  SAME_ACCOUNT: 422,
  KYC_REQUIRED: 422,
  CUSTOMER_INACTIVE: 422,
  POSSIBLE_DUPLICATE: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  SELF_APPROVAL_NOT_ALLOWED: 422,
  APPROVAL_LIMIT_EXCEEDED: 422,
  INVALID_STATE: 422,
  REVERSAL_INSUFFICIENT_FUNDS: 422,
};

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: string,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      fieldErrors?: Record<string, string[]>;
      status?: number;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? STATUS[code] ?? 422;
    this.details = options?.details;
    this.fieldErrors = options?.fieldErrors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
