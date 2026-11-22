"use client";

import { useState } from "react";
import { ArrowDownUp, Building2 } from "lucide-react";
import { useListAccountsQuery } from "@/features/accounts/api";
import { formatBDT } from "@/lib/money";
import { maskAccountNumber } from "@/lib/mask";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { accountsSlice } from "@/store/slices/accounts";

export function AccountSwitcher() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((s) => s.accounts.selectedAccountId);
  const { data: accounts = [] } = useListAccountsQuery(undefined);
  const [open, setOpen] = useState(false);

  const selected = accounts.find((a) => a.id === selectedId);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium"
      >
        <Building2 aria-hidden="true" className="size-4.5 text-muted" />
        {selected ? `${selected.nickname} — ৳${formatBDT(selected.availableMinor)}` : "All accounts"}
        <ArrowDownUp aria-hidden="true" className="size-4 text-muted" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Select account"
          className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-sm"
        >
          <li>
            <button
              role="option"
              aria-selected={!selectedId}
              className="w-full rounded-lg px-2 py-2 text-left text-sm"
              onClick={() => {
                dispatch(accountsSlice.actions.setSelectedAccountId(null));
                setOpen(false);
              }}
            >
              All accounts
            </button>
          </li>
          {accounts.map((a) => (
            <li key={a.id}>
              <button
                role="option"
                aria-selected={a.id === selectedId}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm"
                onClick={() => {
                  dispatch(accountsSlice.actions.setSelectedAccountId(a.id));
                  setOpen(false);
                }}
              >
                <span className="truncate">{a.nickname}</span>
                <span className="shrink-0 text-muted">{maskAccountNumber(a.accountNumber)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
