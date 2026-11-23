import { baseApi } from "@/store/baseApi";
import type { RequestDto } from "./types";

interface ListRequestsResponse {
  items: RequestDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRequests: build.query<
      ListRequestsResponse,
      { kind?: string; status?: string; accountId?: string; customerId?: string; page?: number; pageSize?: number } | undefined
    >({
      query: (params) => ({
        url: "/requests",
        params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")),
      }),
      providesTags: (result) => (result ? result.items.map((r) => ({ type: "Request" as const, id: r.id })) : []),
    }),
    createRequest: build.mutation<RequestDto, { kind: "deposit" | "withdrawal"; accountId: string; amount: string; description?: string }>({
      query: (body) => ({ url: "/requests", method: "POST", body }),
      invalidatesTags: [{ type: "Request", id: "LIST" }],
    }),
    approveRequest: build.mutation<void, string>({
      query: (id) => ({ url: `/requests/${id}/approve`, method: "POST", body: {} }),
      invalidatesTags: () => [
        { type: "Request", id: "LIST" },
        { type: "Account", id: "LIST" },
        { type: "Transaction", id: "LIST" },
        { type: "Stats", id: "LIST" },
      ],
    }),
    rejectRequest: build.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/requests/${id}/reject`, method: "POST", body: { reason } }),
      invalidatesTags: [{ type: "Request", id: "LIST" }],
    }),
  }),
});

export const {
  useListRequestsQuery,
  useCreateRequestMutation,
  useApproveRequestMutation,
  useRejectRequestMutation,
} = requestsApi;
