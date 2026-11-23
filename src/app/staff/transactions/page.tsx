"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { useFlagTransactionMutation, useListTransactionsQuery } from "@/features/transactions/api";

export default function StaffTransactionsPage() {
  const [q, setQ] = useState("");
  const [flagDialogId, setFlagDialogId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const { data } = useListTransactionsQuery({ q: q || undefined });
  const [flag, flagResult] = useFlagTransactionMutation();
  const items = data?.items ?? [];

  function openFlagDialog(id: string) {
    setFlagDialogId(id);
    setFlagReason("");
  }

  return (
    <>
      <PageHeader title="Transactions" description="Search and flag transactions that need review" />
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
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
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
                  <td className="px-4 py-3.5 text-muted">{formatDateTime(txn.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <Button variant="ghost" isPending={flagResult.status === "pending"} onPress={() => openFlagDialog(txn.id)}>Flag</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog
        open={flagDialogId !== null}
        title="Flag transaction"
        confirmLabel="Flag"
        isPending={flagResult.status === "pending"}
        onConfirm={() => {
          if (flagDialogId) flag({ id: flagDialogId, reason: flagReason });
          setFlagDialogId(null);
        }}
        onCancel={() => setFlagDialogId(null)}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Reason
          <input
            value={flagReason}
            onChange={(event) => setFlagReason(event.target.value.slice(0, 200))}
            placeholder="Why does this need review?"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
      </ConfirmDialog>
    </>
  );
}
