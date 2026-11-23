"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { useListTransactionsQuery } from "@/features/transactions/api";

export default function AdminTransactionsPage() {
  const [q, setQ] = useState("");
  const { data } = useListTransactionsQuery({ q: q || undefined });
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader title="Activity" description="Search transactions. Flags can be resolved from each transaction page." />
      <input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Search reference or account number"
        aria-label="Search"
        className="mb-5 w-full max-w-xs rounded-xl border border-border bg-surface px-3 py-2 text-sm"
      />
      <div className="card p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted">No transactions.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-secondary text-left text-xs text-muted">
              <tr>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Reference</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">From → To</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Amount</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Flags</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((txn) => (
                <tr key={txn.id} className="border-b border-separator last:border-0">
                  <td className="px-4 py-3.5 font-medium">{txn.reference}</td>
                  <td className="px-4 py-3.5">{txn.fromAccountNumber ?? ""} → {txn.toAccountNumber ?? ""}</td>
                  <td className="px-4 py-3.5">{txn.type}</td>
                  <td className="px-4 py-3.5"><StatusBadge kind={`transaction:${txn.status}` as StatusKind} /></td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatBDT(txn.amountMinor)}</td>
                  <td className="px-4 py-3.5">
                    {txn.flags.length > 0 && (
                      <StatusBadge kind={txn.flags[0].status === "open" ? "flag:open" : "flag:resolved"} label={`${txn.flags.length} flag(s)`} />
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/transactions/${txn.id}`} className="text-sm text-link hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">{data?.total ?? 0} transactions · date range filtering comes with the filter bar in a later phase.</p>
    </>
  );
}
