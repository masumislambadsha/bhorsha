import { createApi, fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react";

/** Normalized error shape used by components and the global error middleware. */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  details?: Record<string, unknown>;
  requestId?: string;
}

interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string[]>;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

const rawQuery = fetchBaseQuery({ baseUrl: "/api" });

/** Wraps fetchBaseQuery: normalizes every error to an {@link ApiError}. */
export const baseQuery: BaseQueryFn<string, unknown, ApiError> = async (arg, api, extra) => {
  const result = await rawQuery(arg, api, extra);
  if (!result.error) return result;
  const data = result.error.data;
  const body = (typeof data === "object" && data ? data : {}) as ErrorBody;
  const inner = body.error;
  return {
    error: {
      status: result.error.status as number,
      code: inner?.code ?? "UNKNOWN_ERROR",
      message: inner?.message ?? "Something went wrong.",
      ...(inner?.fieldErrors ? { fieldErrors: inner.fieldErrors } : {}),
      ...(inner?.details ? { details: inner.details } : {}),
      ...(inner?.requestId ? { requestId: inner.requestId } : {}),
    },
  };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Me",
    "Account",
    "Transaction",
    "Request",
    "Loan",
    "Notification",
    "Customer",
    "Stats",
    "Settings",
    "AuditLog",
  ] as const,
  endpoints: () => ({}),
});
