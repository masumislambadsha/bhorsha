import { baseApi } from "@/store/baseApi";
import type { TransactionDto } from "./types";

interface ListTransactionsResponse {
  items: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListTransactionsArgs {
  accountId?: string;
  customerId?: string;
  type?: string;
  status?: string;
  flagStatus?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const transactionReceiptUrl = (id: string): string => `/transactions/${id}/receipt`;

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listTransactions: build.query<ListTransactionsResponse, ListTransactionsArgs | undefined>({
      query: (params) => ({
        url: "/transactions",
        params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")),
      }),
      providesTags: (result) => (result ? result.items.map((t) => ({ type: "Transaction" as const, id: t.id })) : []),
    }),
    getTransaction: build.query<TransactionDto, string>({
      query: (id) => `/transactions/${id}`,
      providesTags: (result) => (result ? [{ type: "Transaction" as const, id: result.id }] : []),
    }),
    reviewTransfer: build.mutation<void, { id: string; decision: "approve" | "reject"; note?: string }>({
      query: ({ id, decision, note }) => ({ url: `/transactions/${id}/review`, method: "POST", body: { decision, note } }),
      invalidatesTags: [{ type: "Transaction", id: "LIST" }],
    }),
    flagTransaction: build.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/transactions/${id}/flag`, method: "POST", body: { reason } }),
    }),
    resolveFlags: build.mutation<void, { id: string; action: "clear" | "reverse" | "freeze_sender"; note?: string }>({
      query: ({ id, action, note }) => ({ url: `/transactions/${id}/flags/resolve`, method: "POST", body: { action, note } }),
      invalidatesTags: [{ type: "Transaction", id: "LIST" }],
    }),
  }),
});

export const {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useReviewTransferMutation,
  useFlagTransactionMutation,
  useResolveFlagsMutation,
} = transactionsApi;
