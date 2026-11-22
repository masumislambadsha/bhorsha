import { describe, expect, it } from "vitest";
import { ADMIN_NAV, ADMIN_PRIMARY, CUSTOMER_NAV, CUSTOMER_PRIMARY, STAFF_NAV, STAFF_PRIMARY } from "@/store/nav";
import { accountsSlice } from "@/store/slices/accounts";
import { authSlice, type AuthUser } from "@/store/slices/auth";
import { loansSlice } from "@/store/slices/loans";
import { transactionsSlice } from "@/store/slices/transactions";
import { uiSlice } from "@/store/slices/ui";
import { makeStore } from "@/store/store";

const user: AuthUser = { id: "u1", name: "A", email: "a@example.com", role: "customer" };

describe("store", () => {
  it("primary hrefs are present in each role's nav", () => {
    expect(CUSTOMER_PRIMARY.every((h) => CUSTOMER_NAV.some((n) => n.href === h))).toBe(true);
    expect(STAFF_PRIMARY.every((h) => STAFF_NAV.some((n) => n.href === h))).toBe(true);
    expect(ADMIN_PRIMARY.every((h) => ADMIN_NAV.some((n) => n.href === h))).toBe(true);
  });

  it("signedOut resets the whole store", () => {
    const store = makeStore({ auth: { user, status: "signedIn" } });
    store.dispatch(uiSlice.actions.incrementPendingRequests());
    store.dispatch(accountsSlice.actions.setSelectedAccountId("acct-1"));
    store.dispatch(transactionsSlice.actions.setTransactionFilters({ q: "abc" }));
    store.dispatch(loansSlice.actions.setLoanFilters({ status: "pending" }));

    expect(store.getState().ui.pendingRequests).toBe(1);

    store.dispatch(authSlice.actions.signedOut());

    const s = store.getState();
    expect(s.auth.user).toBeNull();
    expect(s.auth.status).toBe("idle");
    expect(s.ui.pendingRequests).toBe(0);
    expect(s.accounts.selectedAccountId).toBeNull();
    expect(s.transactions.filters.q).toBe("");
    expect(s.loans.listFilters.status).toBe("");
  });

  it("transactionsSlice merges partial filters and supports resetPage", () => {
    const store = makeStore();
    store.dispatch(transactionsSlice.actions.setTransactionPage(3));
    store.dispatch(transactionsSlice.actions.setTransactionFilters({ q: "t", resetPage: true }));
    expect(store.getState().transactions.filters.q).toBe("t");
    expect(store.getState().transactions.page).toBe(1);
    store.dispatch(transactionsSlice.actions.clearTransactionFilters());
    expect(store.getState().transactions.filters.q).toBe("");
  });

  it("loansSlice defaults are stable", () => {
    const store = makeStore();
    expect(store.getState().loans.applyForm.loanType).toBe("personal");
    expect(store.getState().loans.emi.annualRateBps).toBe(1200);
  });
});
