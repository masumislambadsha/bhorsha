import { baseApi } from "@/store/baseApi";
import type { AdminStats, CustomerStats, StaffStats } from "./types";

export const statsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminStats: build.query<AdminStats, number | void>({
      query: (months) => `/stats/admin${months ? `?months=${months}` : ""}`,
      providesTags: [{ type: "Stats", id: "LIST" }],
    }),
    getStaffStats: build.query<StaffStats, void>({
      query: () => "/stats/staff",
      providesTags: [{ type: "Stats", id: "LIST" }],
    }),
    getCustomerStats: build.query<CustomerStats, { accountId?: string; months?: number } | void>({
      query: (params) => ({
        url: "/stats/customer",
        params: Object.fromEntries(
          Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ""),
        ),
      }),
      providesTags: [{ type: "Stats", id: "LIST" }],
    }),
  }),
});

export const { useGetAdminStatsQuery, useGetStaffStatsQuery, useGetCustomerStatsQuery } = statsApi;
