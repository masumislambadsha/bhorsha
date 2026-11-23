"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { useListTransactionsQuery, useReviewTransferMutation } from "@/features/transactions/api";
import { useApproveRequestMutation, useListRequestsQuery, useRejectRequestMutation } from "@/features/requests/api";
import type { TransactionDto } from "@/features/transactions/types";

const TABS = [
  { key: "held", label: "Held transfers" },
  { key: "flags", label: "Flags" },
  { key: "requests", label: "Requests" },
] as const;

type Tab = (typeof TABS)[number]["key"];

type Dialog =
  | { kind: "transfer"; id: string; action: "approve" | "reject"; note: string }
  | { kind: "request"; id: string; action: "approve" | "reject"; note: string };

function isHeld(txn: TransactionDto): boolean {
  return txn.status === "pending" && txn.review.required;
}

export default function StaffQueuePage() {
  const [tab, setTab] = useState<Tab>("held");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note] = useState("");
  const { data: heldData } = useListTransactionsQuery({ status: "pending" });
  const { data: flagsData } = useListTransactionsQuery({ flagStatus: "open" });
  const { data: requestsData } = useListRequestsQuery({ status: "pending" });
  const [review, reviewResult] = useReviewTransferMutation();
  const [approveRequest, approveRequestResult] = useApproveRequestMutation();
  const [rejectRequest, rejectRequestResult] = useRejectRequestMutation();
  const held = (heldData?.items ?? []).filter(isHeld);
  const flags = flagsData?.items ?? [];
  const requests = requestsData?.items ?? [];
  const pendingCount = held.length + flags.length + requests.length;

  return (
    <>
      <PageHeader title="Queue" description="Held transfers, open flags and requests to review" />
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
            {item.label} {tab === item.key ? `(${pendingCount})` : ""}
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
                        <Button variant="primary" isPending={reviewResult.status === "pending"} onPress={() => setDialog({ kind: "transfer", id: txn.id, action: "approve", note: "" })}>Approve</Button>
                        <Button variant="danger" isPending={reviewResult.status === "pending"} onPress={() => setDialog({ kind: "transfer", id: txn.id, action: "reject", note: "" })}>Reject</Button>
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
        <div className="card p-5">
          {requests.length === 0 ? (
            <p className="text-sm text-muted">No pending requests.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-secondary text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-separator last:border-0">
                    <td className="px-4 py-3.5 text-muted">#{request.customerId.slice(-4)}</td>
                    <td className="px-4 py-3.5"><StatusBadge kind="request:pending" /> <span className="ml-1">{request.kind === "deposit" ? "Deposit" : "Withdrawal"}</span></td>
                    <td className="px-4 py-3.5 text-right font-medium">{formatBDT(request.amountMinor)}</td>
                    <td className="px-4 py-3.5 text-muted">{new Date(request.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <Button variant="primary" isPending={approveRequestResult.status === "pending"} onPress={() => setDialog({ kind: "request", id: request.id, action: "approve", note: "" })}>Approve</Button>
                        <Button variant="danger" isPending={rejectRequestResult.status === "pending"} onPress={() => setDialog({ kind: "request", id: request.id, action: "reject", note: "" })}>Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.kind === "transfer" ? (dialog.action === "approve" ? "Approve transfer" : "Reject transfer") : (dialog?.action === "approve" ? "Approve request" : "Reject request")}
        confirmLabel={dialog?.action === "approve" ? "Approve" : "Reject"}
        destructive={dialog?.action === "reject"}
        isPending={dialog?.kind === "transfer" ? reviewResult.status === "pending" : rejectRequestResult.status === "pending"}
        onConfirm={() => {
          if (dialog?.kind === "request") {
            if (dialog.action === "approve") approveRequest(dialog.id);
            else rejectRequest({ id: dialog.id, reason: dialog.note || "Rejected by staff" });
          } else if (dialog) {
            review({ id: dialog.id, decision: dialog.action, note: note });
          }
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
