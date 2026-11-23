"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { useListTransactionsQuery } from "@/features/transactions/api";
import type { TransactionDto } from "@/features/transactions/types";

function startOfDay(date: Date): Date {
  const dhaka = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  return new Date(dhaka.getFullYear(), dhaka.getMonth(), dhaka.getDate());
}

function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.getTime() >= today.getTime()) return "Today";
  if (date.getTime() >= yesterday.getTime()) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(date);
}

export default function CustomerTransactionsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const { data } = useListTransactionsQuery({ q: q || undefined, type: type || undefined, status: status || undefined, page });
  const items = data?.items ?? [];

  const groups: { label: string; rows: TransactionDto[] }[] = [];
  for (const txn of items) {
    const label = dayLabel(txn.createdAt, new Date());
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(txn);
    else groups.push({ label, rows: [txn] });
  }

  return (
    <>
      <PageHeader title="Activity" description="Your transfers, withdrawals and repayments" />
      <div className="mb-5 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(event) => { setPage(1); setQ(event.target.value); }}
          placeholder="Search reference or account number"
          aria-label="Search"
          className="w-full sm:max-w-xs rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        />
        <select value={type} onChange={(event) => { setPage(1); setType(event.target.value); }} aria-label="Filter by type" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="transfer">Transfers</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="deposit">Deposits</option>
          <option value="loan_disbursement">Loan disbursements</option>
          <option value="loan_repayment">Loan repayments</option>
        </select>
        <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} aria-label="Filter by status" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No transactions yet" description="Send a transfer or withdraw to get started." />
      ) : (
        <div className="card p-5">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="sticky top-0 z-10 bg-surface-secondary py-2 text-xs font-medium text-muted">{group.label}</p>
              <ul className="divide-y divide-separator">
                {group.rows.map((txn) => (
                  <li key={txn.id}>
                    <Link
                      href={`/customer/transactions/${txn.id}`}
                      className="flex items-center justify-between gap-4 py-4 hover:bg-surface-secondary"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{txn.description ?? txn.reference}</p>
                        <p className="text-xs text-muted">
                          {txn.fromAccountNumber ?? ""} → {txn.toAccountNumber ?? ""} · {formatDateTime(txn.createdAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium">{formatBDT(txn.amountMinor)}</p>
                        <StatusBadge kind={`transaction:${txn.status}` as StatusKind} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Page {page} of {data?.totalPages ?? 1}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-xl border border-border px-3 py-1.5 text-sm disabled:opacity-40">
                Prev
              </button>
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!data || data.page >= data.totalPages} className="rounded-xl border border-border px-3 py-1.5 text-sm disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
