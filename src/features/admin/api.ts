import { baseApi } from "@/store/baseApi";
import type { AuditLogEntry, StaffUser } from "./types";

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListAuditArgs {
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<Record<string, unknown>, void>({
      query: () => "/admin/settings",
      providesTags: [{ type: "Settings", id: "LIST" }],
    }),
    updateSettings: build.mutation<Record<string, unknown>, Record<string, unknown>>({
      query: (body) => ({ url: "/admin/settings", method: "PUT", body }),
      invalidatesTags: [{ type: "Settings", id: "LIST" }, { type: "Stats", id: "LIST" }],
    }),
    listStaff: build.query<{ items: StaffUser[] }, void>({
      query: () => "/admin/staff",
      providesTags: [{ type: "Customer", id: "LIST" }],
    }),
    createStaff: build.mutation<StaffUser, { name: string; email: string; password: string }>({
      query: (body) => ({ url: "/admin/staff", method: "POST", body }),
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
    }),
    listAuditLogs: build.query<Page<AuditLogEntry>, ListAuditArgs | void>({
      query: (params) => ({
        url: "/admin/audit-logs",
        params: Object.fromEntries(
          Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== ""),
        ),
      }),
      providesTags: [{ type: "AuditLog", id: "LIST" }],
    }),
    runIntegrityCheck: build.mutation<{
      passed: boolean;
      checkedAt: string;
      checks: { name: string; passed: boolean; failures: string[] }[];
    }, void>({
      query: () => ({ url: "/admin/integrity-check", method: "POST", body: {} }),
      invalidatesTags: [{ type: "AuditLog", id: "LIST" }],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useListStaffQuery,
  useCreateStaffMutation,
  useListAuditLogsQuery,
  useRunIntegrityCheckMutation,
} = adminApi;
