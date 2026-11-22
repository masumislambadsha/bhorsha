import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { showToast } from "@/lib/toast";
import type { ApiError } from "./baseApi";
import { authSlice } from "./slices/auth";

/**
 * Global query error handling:
 * - 401 → sign out and redirect to /login
 * - 403 → toast "You don't have access to that."
 * - 5xx → toast the server message
 * - 409/422 and anything else → left to feature components (forms handle inline)
 */
export const errorMiddleware: Middleware = (store) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const err = action.payload as ApiError;
    const status = typeof err.status === "number" ? err.status : 0;
    if (status === 401) {
      store.dispatch(authSlice.actions.signedOut());
      // Full page load: the layout of the target page re-checks the server session.
      window.location.assign(new URL("/login", window.location.origin).href);
    } else if (status === 403) {
      showToast("You don't have access to that.");
    } else if (status >= 500) {
      showToast(err.message || "Something went wrong.");
    }
  }
  return next(action);
};
