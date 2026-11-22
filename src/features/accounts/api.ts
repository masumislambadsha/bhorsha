import { baseApi } from "@/store/baseApi";
import type { AccountDto, AccountLimits } from "./types";

interface ListAccountsResponse {
  items: AccountDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function accountTagId(arg: unknown): string | undefined {
  return (arg as { id?: string } | null | undefined)?.id;
}

export interface ListAccountsArgs {
  status?: string;
  type?: string;
  customerId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const accountsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    openAccount: build.mutation<string, { customerId: string; type: string; nickname?: string }>({
      query: (body) => ({ url: "/accounts", method: "POST", body }),
      invalidatesTags: [{ type: "Account", id: "LIST" }],
    }),
    listAccounts: build.query<ListAccountsResponse, ListAccountsArgs | undefined>({
      query: (params) => ({
        url: "/accounts",
        params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")),
      }),
      providesTags: (result) => (result ? result.items.map((a) => ({ type: "Account" as const, id: a.id })) : []),
    }),
    getAccount: build.query<AccountDto, string>({
      query: (id) => `/accounts/${id}`,
      providesTags: (result) => (result ? [{ type: "Account" as const, id: result.id }] : []),
    }),
    updateAccount: build.mutation<void, { id: string; nickname: string }>({
      query: ({ id, nickname }) => ({ url: `/accounts/${id}`, method: "PATCH", body: { nickname } }),
      invalidatesTags: (_result, arg) => {
        const id = accountTagId(arg);
        return id ? [{ type: "Account" as const, id }] : [];
      },
    }),
    freezeAccount: build.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/accounts/${id}/freeze`, method: "POST", body: { reason } }),
      invalidatesTags: (_result, arg) => {
        const id = accountTagId(arg);
        return id ? [{ type: "Account" as const, id }] : [];
      },
    }),
    unfreezeAccount: build.mutation<void, string>({
      query: (id) => ({ url: `/accounts/${id}/unfreeze`, method: "POST" }),
      invalidatesTags: (_result, arg) => {
        const id = accountTagId(arg);
        return id ? [{ type: "Account" as const, id }] : [];
      },
    }),
    updateLimits: build.mutation<
      void,
      { id: string; limits: Partial<AccountLimits> & { confirmMinimumBalance?: boolean } }
    >({
      query: ({ id, limits }) => ({ url: `/accounts/${id}/limits`, method: "PATCH", body: limits }),
      invalidatesTags: (_result, arg) => {
        const id = accountTagId(arg);
        return id ? [{ type: "Account" as const, id }] : [];
      },
    }),
    getBalanceHistory: build.query<{ date: string; balance: number }[], string>({
      query: (id) => `/accounts/${id}/balance-history`,
    }),
    accountLookup: build.query<{ maskedName: string; accountType: string; isOwn: boolean }, string>({
      query: (number) => `/accounts/lookup?number=${encodeURIComponent(number)}`,
    }),
  }),
});

export const {
  useOpenAccountMutation,
  useListAccountsQuery,
  useGetAccountQuery,
  useUpdateAccountMutation,
  useFreezeAccountMutation,
  useUnfreezeAccountMutation,
  useUpdateLimitsMutation,
  useGetBalanceHistoryQuery,
  useAccountLookupQuery,
} = accountsApi;
