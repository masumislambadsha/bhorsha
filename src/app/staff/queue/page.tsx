"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatBDT } from "@/lib/money";
import { useListTransactionsQuery, useReviewTransferMutation } from "@/features/transactions/api";
import type { TransactionDto } from "@/features/transactions/types";

const TABS = [
  { key: "held", label: "Held transfers" },
  { key: "flags", label: "Flags" },
  { key: "requests", label: "Requests" },
] as const;

type Tab = (typeof TABS)[number]["key"];

function isHeld(txn: TransactionDto): boolean {
  return txn.status === "pending" && txn.review.required;
}

export default function StaffQueuePage() {
  const [tab, setTab] = useState<Tab>("held");
  const [dialog, setDialog] = useState<{ id: string; action: "approve" | "reject"; note: string } | null>(null);
  const [note] = useState("");
  const { data: heldData } = useListTransactionsQuery({ status: "pending" });
  const { data: flagsData } = useListTransactionsQuery({ flagStatus: "open" });
  const [review, reviewResult] = useReviewTransferMutation();
  const held = (heldData?.items ?? []).filter(isHeld);
  const flags = flagsData?.items ?? [];

  return (
    <>
      <PageHeader title="Queue" description="Held transfers and open flags" />
      <div className="mb-5 flex gap-1" role="tablist" aria-label="Queue tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${tab === item.key ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted"}`}
          >
            {item.label} {tab === item.key ? `(${tab === "held" ? held.length : flags.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "held" && (
        <div className="card p-5">
          {held.length === 0 ? (
            <p className="text-sm text-muted">Nothing is held for review.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-secondary text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Reference</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">From → To</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Reason</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {held.map((txn) => (
                  <tr key={txn.id} className="border-b border-separator last:border-0">
                    <td className="px-4 py-3.5 font-medium">{txn.reference}</td>
                    <td className="px-4 py-3.5">{txn.fromAccountNumber ?? ""} → {txn.toAccountNumber ?? ""}</td>
                    <td className="px-4 py-3.5 text-right font-medium">{formatBDT(txn.amountMinor)}</td>
                    <td className="px-4 py-3.5 text-muted">{txn.review.reason ?? ""}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <Button variant="primary" isPending={reviewResult.status === "pending"} onPress={() => setDialog({ id: txn.id, action: "approve", note: "" })}>Approve</Button>
                        <Button variant="danger" isPending={reviewResult.status === "pending"} onPress={() => setDialog({ id: txn.id, action: "reject", note: "" })}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "flags" && (
        <div className="card p-5">
          {flags.length === 0 ? (
            <p className="text-sm text-muted">No open flags.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {flags.map((txn) => (
                <li key={txn.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3.5">
                  <div>
                    <p className="font-medium">{txn.reference}</p>
                    <p className="text-xs text-muted">
                      {txn.type} · {formatBDT(txn.amountMinor)} · {txn.flags.length} flag(s): {txn.flags.map((f) => f.reason).join("; ")}
                    </p>
                  </div>
                  <Link href={`/staff/transactions/${txn.id}`} className="text-sm text-link hover:underline">View</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="card p-5 text-sm text-muted">
          <p>Deposit and withdrawal requests are reviewed from the Queue in a later phase.</p>
        </div>
      )}

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.action === "approve" ? "Approve transfer" : "Reject transfer"}
        confirmLabel={dialog?.action === "approve" ? "Approve" : "Reject"}
        destructive={dialog?.action === "reject"}
        isPending={reviewResult.status === "pending"}
        onConfirm={() => {
          if (dialog) review({ id: dialog.id, decision: dialog.action, note: note });
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
