"use client";

import Link from "next/link";
import { useState } from "react";
import { Banknote, ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react";
import { useGetCustomerStatsQuery } from "@/features/stats/api";
import { useListAccountsQuery } from "@/features/accounts/api";
import { useAppSelector } from "@/store/hooks";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatementCard } from "@/components/ui/StatementCard";
import { StatCard } from "@/components/ui/StatCard";

export default function CustomerHomePage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const selectedId = useAppSelector((state) => state.accounts.selectedAccountId);
  const [months, setMonths] = useState(12);
  const { data: accountsData } = useListAccountsQuery({});
  const { data, isLoading, refetch } = useGetCustomerStatsQuery({ ...(selectedId ? { accountId: selectedId } : {}), months });
  const selected = (accountsData?.items ?? []).find((account) => account.id === selectedId) ?? accountsData?.items?.[0];
  if (role !== "customer") return null;

  return (
    <>
      <PageHeader
        title="Your banking"
        description="Money in, money out, and what is still on track."
        actions={
          <label className="flex items-center gap-2 text-sm text-muted">
            Period
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </label>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted">Loading your banking…</p>
      ) : !data ? (
        <div className="card p-6">
          <p className="text-sm text-muted">Could not load your overview.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 text-sm text-link underline">Try again</button>
        </div>
      ) : (
        <>
          {selected ? <StatementCard /> : (
            <div className="card p-6">
              <h2 className="font-display text-xl">No accounts yet</h2>
              <p className="mt-2 text-sm text-muted">We are verifying your details. A staff member will open your first account.</p>
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total deposits" value={formatBDT(data.totalDeposits)} icon={ArrowDownToLine} tone="success" />
            <StatCard label="Total withdrawals" value={formatBDT(data.totalWithdrawals)} icon={ArrowUpFromLine} tone="neutral" />
            <StatCard label="Active loans" value={String(data.activeLoans.count)} hint="Outstanding balance" icon={Banknote} />
            <StatCard label="Outstanding" value={formatBDT(data.activeLoans.outstandingMinor)} icon={Wallet} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-display text-lg font-medium">Monthly spending</h2>
              <ul className="mt-4 space-y-2">
                {data.monthlySpending.filter((row) => row.amountMinor > 0).slice(-6).map((row) => (
                  <li key={row.month} className="flex justify-between text-sm">
                    <span className="text-muted">{row.month}</span>
                    <span className="amount">{formatBDT(row.amountMinor)}</span>
                  </li>
                ))}
                {data.monthlySpending.every((row) => row.amountMinor === 0) && <li className="text-sm text-muted">No spending in this period.</li>}
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="font-display text-lg font-medium">Recent activity</h2>
              {data.recentTransactions.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No transactions yet. Send money or request a deposit to get started.</p>
              ) : (
                <ul className="mt-4 divide-y divide-separator">
                  {data.recentTransactions.map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <Link href={`/customer/transactions/${tx.id}`} className="truncate text-link hover:underline">{tx.reference}</Link>
                        <span className="ml-2 text-muted">{tx.type.replace(/_/g, " ")} · {formatDateTime(tx.createdAt)}</span>
                      </span>
                      <span className="amount shrink-0">{formatBDT(tx.amountMinor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
