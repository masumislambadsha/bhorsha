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
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listTransactions: build.query<ListTransactionsResponse, ListTransactionsArgs | undefined>({
      query: (params) => ({
        url: "/transactions",
        params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")),
      }),
      providesTags: (result) => (result ? result.items.map((t) => ({ type: "Transaction", id: t.id })) : []),
    }),
  }),
});

export const { useListTransactionsQuery } = transactionsApi;
