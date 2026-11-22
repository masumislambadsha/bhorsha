import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  type AnyAction,
  type Reducer,
} from "@reduxjs/toolkit";
import { baseApi } from "./baseApi";
import { errorMiddleware } from "./errorMiddleware";
import { accountsSlice } from "./slices/accounts";
import { authSlice } from "./slices/auth";
import { loansSlice } from "./slices/loans";
import { transactionsSlice } from "./slices/transactions";
import { uiSlice } from "./slices/ui";

export const listenerMiddleware = createListenerMiddleware();

const appReducer = combineReducers({
  api: baseApi.reducer,
  auth: authSlice.reducer,
  ui: uiSlice.reducer,
  accounts: accountsSlice.reducer,
  transactions: transactionsSlice.reducer,
  loans: loansSlice.reducer,
});

export type RootState = ReturnType<typeof appReducer>;
export type AppStore = ReturnType<typeof makeStore>;

/** `signedOut` resets the whole store; other actions use the slices normally. */
const rootReducer: Reducer<RootState> = (state, action: AnyAction) => {
  if (action.type === authSlice.actions.signedOut.type) {
    return appReducer(undefined, { type: "@@bhorsa/reset" }) as RootState;
  }
  return appReducer(state, action);
};

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware, errorMiddleware, listenerMiddleware.middleware),
  });
}
