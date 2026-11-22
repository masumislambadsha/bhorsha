import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppRole } from "@/lib/domain";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

export type AuthStatus = "idle" | "signedIn" | "signedOut";

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
}

const initialState: AuthState = { user: null, status: "idle" };

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signedIn: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.status = "signedIn";
    },
    signedOut: (state) => {
      state.user = null;
      state.status = "signedOut";
    },
  },
});
