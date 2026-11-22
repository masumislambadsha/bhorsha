import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const STORAGE_KEY = "bhorsa:selectedAccountId";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // not browser yet or storage unavailable
  }
}

export interface AccountsState {
  /** Account switcher selection; null = "All accounts". */
  selectedAccountId: string | null;
}

const initialState: AccountsState = { selectedAccountId: readStored() };

export const accountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    setSelectedAccountId: (state, action: PayloadAction<string | null>) => {
      state.selectedAccountId = action.payload;
    },
  },
});
