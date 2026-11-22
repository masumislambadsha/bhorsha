import { baseApi } from "@/store/baseApi";
import type { CustomerDto, CreateCustomerInput, CustomerDetail } from "./types";

interface ListCustomersResponse {
  items: CustomerDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListCustomersArgs {
  q?: string;
  kyc?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ReviewKYCArgs {
  customerId: string;
  decision: "verified" | "rejected";
  note?: string;
}

export interface SetStatusArgs {
  customerId: string;
  status: "active" | "inactive";
  reason?: string;
}

export interface BlockArgs {
  customerId: string;
  reason: string;
  freezeAccounts?: boolean;
}

export const customersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCustomers: build.query<ListCustomersResponse, ListCustomersArgs | undefined>({
      query: (params) => ({
        url: "/customers",
        params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")),
      }),
      providesTags: (result) => (result ? result.items.map((c) => ({ type: "Customer", id: c.id })) : []),
    }),
    getCustomer: build.query<CustomerDetail, string>({
      query: (customerId) => `/customers/${customerId}`,
      providesTags: (result) => (result ? [{ type: "Customer", id: result.customer.id }] : []),
    }),
    createCustomer: build.mutation<{ userId: string; tempPassword: string }, CreateCustomerInput>({
      query: (input) => ({ url: "/customers", method: "POST", body: input }),
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
    }),
    reviewKYC: build.mutation<void, ReviewKYCArgs>({
      query: ({ customerId, decision, note }) => ({
        url: `/customers/${customerId}/kyc`,
        method: "POST",
        body: { decision, note },
      }),
      invalidatesTags: (_result, arg) => {
        const id = customerTagId(arg);
        return id ? [{ type: "Customer" as const, id }] : [];
      },
    }),
    setCustomerStatus: build.mutation<void, SetStatusArgs>({
      query: ({ customerId, status, reason }) => ({
        url: `/customers/${customerId}/status`,
        method: "PATCH",
        body: { status, reason },
      }),
      invalidatesTags: (_result, arg) => {
        const id = customerTagId(arg);
        return id ? [{ type: "Customer" as const, id }] : [];
      },
    }),
    blockCustomer: build.mutation<void, BlockArgs>({
      query: ({ customerId, reason, freezeAccounts }) => ({
        url: `/customers/${customerId}/block`,
        method: "POST",
        body: { reason, freezeAccounts },
      }),
      invalidatesTags: (_result, arg) => {
        const id = customerTagId(arg);
        return id ? [{ type: "Customer" as const, id }] : [];
      },
    }),
    unblockCustomer: build.mutation<void, string>({
      query: (customerId) => ({ url: `/customers/${customerId}/unblock`, method: "POST" }),
      invalidatesTags: (_result, arg) => {
        const id = customerTagId(arg);
        return id ? [{ type: "Customer" as const, id }] : [];
      },
    }),
  }),
});

export const {
  useListCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useReviewKYCMutation,
  useSetCustomerStatusMutation,
  useBlockCustomerMutation,
  useUnblockCustomerMutation,
} = customersApi;

function customerTagId(arg: unknown): string | undefined {
  return (arg as { customerId?: string } | null | undefined)?.customerId;
}
