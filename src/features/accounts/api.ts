import { baseApi } from "@/store/baseApi";
import type { AccountType } from "@/lib/domain";
import type { AccountDto, AccountStatus } from "./types";

export interface ListAccountsParams {
  status?: AccountStatus | "";
  type?: AccountType | "";
  customerId?: string;
  q?: string;
}

export const accountsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAccounts: build.query<AccountDto[], ListAccountsParams | undefined>({
      query: (params) => {
        const qs = new URLSearchParams(
          Object.entries(params ?? {}).filter(([, v]) => v !== "" && v !== undefined),
        ).toString();
        return qs ? `/accounts?${qs}` : "/accounts";
      },
      providesTags: (result) => (result ? result.map((a) => ({ type: "Account", id: a.id })) : []),
    }),
  }),
});

export const { useListAccountsQuery } = accountsApi;
