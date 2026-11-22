import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TxStatus, TxType } from "@/lib/domain";

export interface TransactionFilters {
  q: string;
  type: TxType | "";
  status: TxStatus | "";
  from: string;
  to: string;
  accountId: string | null;
}

export interface TransactionsState {
  filters: TransactionFilters;
  page: number;
  pageSize: number;
}

const emptyFilters: TransactionFilters = {
  q: "",
  type: "",
  status: "",
  from: "",
  to: "",
  accountId: null,
};

const initialState: TransactionsState = { filters: { ...emptyFilters }, page: 1, pageSize: 20 };

export const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setTransactionFilters: (
      state,
      action: PayloadAction<Partial<TransactionFilters> & { resetPage?: boolean }>,
    ) => {
      const { resetPage, ...partial } = action.payload;
      Object.assign(state.filters, partial);
      if (resetPage) state.page = 1;
    },
    clearTransactionFilters: (state) => {
      state.filters = { ...emptyFilters };
      state.page = 1;
    },
    setTransactionPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
});
