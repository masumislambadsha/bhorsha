import { baseApi } from "@/store/baseApi";
import type { LoanDto } from "./types";

export const loansApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLoanProducts: build.query<{ loanType: string; product: { annualRateBps: number; minMonths: number; maxMonths: number; maxPrincipalMinor: number } }[], void>({
      query: () => "/loans/products",
    }),
    listLoans: build.query<
      { items: LoanDto[]; total: number; page: number; pageSize: number; totalPages: number },
      { customerId?: string; status?: string; page?: number; pageSize?: number } | undefined
    >({
      query: (params) => ({
        url: "/loans",
        params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")),
      }),
      providesTags: (result) => (result ? result.items.map((l) => ({ type: "Loan" as const, id: l.id })) : []),
    }),
    getLoan: build.query<LoanDto, string>({
      query: (id) => `/loans/${id}`,
      providesTags: (result) => (result ? [{ type: "Loan" as const, id: result.id }] : []),
    }),
    applyForLoan: build.mutation<LoanDto, { loanType: string; amount: string; durationMonths: number; monthlyIncome: string; employmentStatus: string; description: string; disbursementAccountId: string }>({
      query: (body) => ({ url: "/loans", method: "POST", body }),
      invalidatesTags: [{ type: "Loan", id: "LIST" }],
    }),
    addLoanNote: build.mutation<void, { id: string; body: string }>({
      query: ({ id, body }) => ({ url: `/loans/${id}/notes`, method: "POST", body: { body } }),
      invalidatesTags: () => [{ type: "Loan", id: "LIST" }],
    }),
    forwardLoan: build.mutation<void, { id: string; recommendation: "approve" | "reject"; note?: string }>({
      query: ({ id, recommendation, note }) => ({ url: `/loans/${id}/forward`, method: "POST", body: { recommendation, note } }),
      invalidatesTags: () => [{ type: "Loan", id: "LIST" }],
    }),
    approveLoan: build.mutation<void, string>({
      query: (id) => ({ url: `/loans/${id}/approve`, method: "POST", body: {} }),
      invalidatesTags: () => [{ type: "Loan", id: "LIST" }, { type: "Transaction", id: "LIST" }, { type: "Stats", id: "LIST" }],
    }),
    rejectLoan: build.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/loans/${id}/reject`, method: "POST", body: { reason } }),
      invalidatesTags: () => [{ type: "Loan", id: "LIST" }],
    }),
    disburseLoan: build.mutation<void, string>({
      query: (id) => ({ url: `/loans/${id}/disburse`, method: "POST", body: {} }),
      invalidatesTags: () => [{ type: "Loan", id: "LIST" }, { type: "Account", id: "LIST" }, { type: "Transaction", id: "LIST" }, { type: "Stats", id: "LIST" }],
    }),
    repayLoan: build.mutation<LoanDto, { id: string; fromAccountId: string; pin: string; mode: "next_installment" | "payoff" }>({
      query: ({ id, fromAccountId, pin, mode }) => ({ url: `/loans/${id}/repay`, method: "POST", body: { fromAccountId, pin, mode } }),
      invalidatesTags: () => [{ type: "Loan", id: "LIST" }, { type: "Account", id: "LIST" }, { type: "Transaction", id: "LIST" }, { type: "Stats", id: "LIST" }],
    }),
  }),
});

export const {
  useGetLoanProductsQuery,
  useListLoansQuery,
  useGetLoanQuery,
  useApplyForLoanMutation,
  useAddLoanNoteMutation,
  useForwardLoanMutation,
  useApproveLoanMutation,
  useRejectLoanMutation,
  useDisburseLoanMutation,
  useRepayLoanMutation,
} = loansApi;
