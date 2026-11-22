"use client";

import { setupListeners } from "@reduxjs/toolkit/query";
import { useMemo } from "react";
import { Provider } from "react-redux";
import { GlobalProgress } from "@/components/layout/GlobalProgress";
import { ToastStack } from "@/components/layout/ToastStack";
import type { AuthUser } from "./slices/auth";
import { makeStore, type AppStore } from "./store";

interface StoreProviderProps {
  children: React.ReactNode;
  /** Session user passed in by the role layouts via `auth.api.getSession`. */
  user: AuthUser | null;
}

/** Creates the store once per role area and provides it to the subtree. */
export function StoreProvider({ children, user }: StoreProviderProps) {
  const store = useMemo<AppStore>(() => {
    const s = makeStore({ auth: { user, status: user ? "signedIn" : "idle" } });
    setupListeners(s.dispatch);
    return s;
  }, [user]);
  return (
    <Provider store={store}>
      <GlobalProgress />
      <ToastStack />
      {children}
    </Provider>
  );
}
