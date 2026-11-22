import { createSlice, type AnyAction, type PayloadAction } from "@reduxjs/toolkit";

const isQueryPending = (action: AnyAction): boolean =>
  typeof action.type === "string" && action.type.endsWith("/pending");
const isQueryFulfilled = (action: AnyAction): boolean =>
  typeof action.type === "string" && action.type.endsWith("/fulfilled");
const isQueryRejected = (action: AnyAction): boolean =>
  typeof action.type === "string" && action.type.endsWith("/rejected");

export interface UIState {
  /** > 0 while any RTK Query request is in flight; a thin progress bar watches this. */
  pendingRequests: number;
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
}

const initialState: UIState = { pendingRequests: 0, sidebarOpen: false, mobileNavOpen: false };

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    incrementPendingRequests: (state) => {
      state.pendingRequests += 1;
    },
    decrementPendingRequests: (state) => {
      if (state.pendingRequests > 0) state.pendingRequests -= 1;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setMobileNavOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileNavOpen = action.payload;
    },
    toggleMobileNav: (state) => {
      state.mobileNavOpen = !state.mobileNavOpen;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(isQueryPending, (state) => {
        state.pendingRequests += 1;
      })
      .addMatcher(isQueryFulfilled, (state) => {
        if (state.pendingRequests > 0) state.pendingRequests -= 1;
      })
      .addMatcher(isQueryRejected, (state) => {
        if (state.pendingRequests > 0) state.pendingRequests -= 1;
      });
  },
});
