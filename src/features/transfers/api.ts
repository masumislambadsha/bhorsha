import { baseApi } from "@/store/baseApi";
import type { TransactionDto } from "@/features/transactions/types";

export const transfersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    transfer: build.mutation<
      TransactionDto,
      { fromAccountId: string; toAccountNumber: string; amount: string; description?: string; pin: string; confirmDuplicate?: boolean }
    >({
      query: ({ fromAccountId, toAccountNumber, amount, description, pin, confirmDuplicate }) => ({
        url: "/transfers",
        method: "POST",
        body: { fromAccountId, toAccountNumber, amount, description, pin, confirmDuplicate },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
      invalidatesTags: [{ type: "Account", id: "LIST" }, { type: "Transaction", id: "LIST" }],
    }),
  }),
});

export const { useTransferMutation } = transfersApi;
