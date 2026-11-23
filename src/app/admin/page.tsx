"use client";

import Link from "next/link";
import { Banknote, Building2, CircleAlert, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useGetAdminStatsQuery } from "@/features/stats/api";
import { formatBDT } from "@/lib/money";
import { useAppSelector } from "@/store/hooks";

export default function AdminHomePage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { data, isLoading, refetch } = useGetAdminStatsQuery(12);
  if (role !== "admin") return null;

  return (
    <>
      <PageHeader title="Bank overview" description="Live figures from every ledger entry and account." />
      {isLoading ? (
        <p className="text-sm text-muted">Loading overview…</p>
      ) : !data ? (
        <div className="card p-6">
          <p className="text-sm text-muted">Could not load the overview.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 text-sm text-link underline">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Customers" value={String(data.totalCustomers)} icon={Users} hint="Registered customers" />
            <StatCard label="Accounts" value={String(data.totalAccounts)} icon={Building2} hint="Customer accounts" />
            <StatCard label="Bank balance" value={formatBDT(data.totalBankBalance)} icon={Banknote} hint="Sum of customer balances" />
            <StatCard label="Completed transactions" value={String(data.totalTransactions)} icon={CircleAlert} hint="All time" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-display text-lg font-medium">Needs attention</h2>
              <ul className="mt-4 divide-y divide-separator">
                {data.needsAttention.openFlags > 0 && (
                  <li className="py-2.5 text-sm"><Link className="text-link underline" href="/admin/transactions">{data.needsAttention.openFlags} open flag(s)</Link></li>
                )}
                {data.needsAttention.heldTransfers > 0 && (
                  <li className="py-2.5 text-sm"><Link className="text-link underline" href="/admin/transactions?status=pending">{data.needsAttention.heldTransfers} held transfer(s)</Link></li>
                )}
                {data.needsAttention.largeRequests > 0 && (
                  <li className="py-2.5 text-sm"><Link className="text-link underline" href="/admin/requests">{data.needsAttention.largeRequests} pending request(s)</Link></li>
                )}
                {data.needsAttention.loansUnderReview > 0 && (
                  <li className="py-2.5 text-sm"><Link className="text-link underline" href="/admin/loans">{data.needsAttention.loansUnderReview} loan(s) under review</Link></li>
                )}
                {data.needsAttention.openFlags + data.needsAttention.heldTransfers + data.needsAttention.largeRequests + data.needsAttention.loansUnderReview === 0 && (
                  <li className="py-2.5 text-sm text-muted">Nothing needs attention right now.</li>
                )}
              </ul>
            </div>

            <div className="card p-5">
              <h2 className="font-display text-lg font-medium">Activity by month</h2>
              <ul className="mt-4 space-y-2">
                {data.monthlyTransactionVolume.filter((row) => row.amountMinor > 0).slice(-6).map((row) => (
                  <li key={row.month} className="flex justify-between text-sm">
                    <span className="text-muted">{row.month}</span>
                    <span className="amount">{formatBDT(row.amountMinor)}</span>
                  </li>
                ))}
                {data.monthlyTransactionVolume.every((row) => row.amountMinor === 0) && (
                  <li className="text-sm text-muted">No transactions in this period.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="card mt-6 p-5">
            <h2 className="font-display text-lg font-medium">Account distribution</h2>
            <ul className="mt-4 divide-y divide-separator">
              {data.accountDistribution.map((row) => (
                <li key={row.label} className="flex justify-between py-2.5 text-sm">
                  <span className="capitalize">{row.label}</span>
                  <span className="amount">{row.count} · {formatBDT(row.amountMinor ?? 0)}</span>
                </li>
              ))}
              {data.accountDistribution.length === 0 && <li className="py-2.5 text-sm text-muted">No accounts yet.</li>}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
