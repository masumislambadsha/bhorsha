"use client";

import { use } from "react";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { useFlagTransactionMutation, useGetTransactionQuery, useReviewTransferMutation } from "@/features/transactions/api";
import type { TransactionDto } from "@/features/transactions/types";

function FlagList({ flags }: { flags: TransactionDto["flags"] }) {
  return (
    <div className="mt-4 space-y-3">
      {flags.map((flag, index) => (
        <div key={index} className="rounded-xl border border-border bg-surface-secondary p-4 text-sm">
          <StatusBadge kind={`flag:${flag.status}` as StatusKind} label={flag.severity} />
          <p className="mt-1.5 text-foreground">{flag.reason}</p>
          <p className="mt-1 text-xs text-muted">
            Raised {flag.source === "rule" ? "automatically" : "by staff"} at {formatDateTime(flag.raisedAt)}
            {flag.rule ? ` (rule: ${flag.rule})` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function StaffTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idOrReference } = use(params);
  const { data } = useGetTransactionQuery(idOrReference);
  const [dialog, setDialog] = useState<{ action: "approve" | "reject"; note: string } | null>(null);
  const [flagDialog, setFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [review, reviewResult] = useReviewTransferMutation();
  const [flag, flagResult] = useFlagTransactionMutation();

  if (!data) return <div className="py-20 text-center text-sm text-muted">Loading…</div>;

  return (
    <>
      <PageHeader
        title="Transaction"
        description={`Reference ${data.reference} · ${data.status}`}
        actions={<Button variant="ghost" onPress={() => setFlagDialog(true)}>Flag</Button>}
      />
      <div className="card p-6">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Reference</dt><dd className="mt-0.5 font-medium">{data.reference}</dd></div>
          <div><dt className="text-muted">From → To</dt><dd className="mt-0.5">{data.fromAccountNumber ?? ""} → {data.toAccountNumber ?? ""}</dd></div>
          <div><dt className="text-muted">Status</dt><dd className="mt-0.5"><StatusBadge kind={`transaction:${data.status}` as StatusKind} /></dd></div>
          <div><dt className="text-muted">Amount</dt><dd className="mt-0.5 font-medium">{formatBDT(data.amountMinor)}</dd></div>
          <div><dt className="text-muted">Date</dt><dd className="mt-0.5">{formatDateTime(data.createdAt)}</dd></div>
          <div><dt className="text-muted">Review required</dt><dd className="mt-0.5">{data.review.required ? "Yes" : "No"}</dd></div>
          {data.review.required && (
            <>
              <div><dt className="text-muted">Review reason</dt><dd className="mt-0.5">{data.review.reason ?? "—"}</dd></div>
              {data.review.decision && <div><dt className="text-muted">Decision</dt><dd className="mt-0.5">{data.review.decision}</dd></div>}
              {data.review.reviewedAt && <div><dt className="text-muted">Reviewed at</dt><dd className="mt-0.5">{formatDateTime(data.review.reviewedAt)}</dd></div>}
            </>
          )}
        </dl>
        {data.flags.length > 0 && <h3 className="mt-6 text-sm font-medium">Flags</h3>}
        <FlagList flags={data.flags} />
        {data.status === "pending" && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="primary" isPending={reviewResult.status === "pending"} onPress={() => setDialog({ action: "approve", note: "" })}>Approve</Button>
            <Button variant="danger" isPending={reviewResult.status === "pending"} onPress={() => setDialog({ action: "reject", note: "" })}>Reject</Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!dialog}
        title={dialog?.action === "approve" ? "Approve transfer" : "Reject transfer"}
        confirmLabel={dialog?.action === "approve" ? "Approve" : "Reject"}
        destructive={dialog?.action === "reject"}
        isPending={reviewResult.status === "pending"}
        onConfirm={() => {
          if (dialog) review({ id: idOrReference, decision: dialog.action, note: dialog.note });
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={flagDialog}
        title="Flag transaction"
        confirmLabel="Flag"
        isPending={flagResult.status === "pending"}
        onConfirm={() => {
          flag({ id: idOrReference, reason: flagReason });
          setFlagDialog(false);
        }}
        onCancel={() => setFlagDialog(false)}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Reason
          <input value={flagReason} onChange={(event) => setFlagReason(event.target.value.slice(0, 200))} placeholder="Why does this need review?" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </ConfirmDialog>
    </>
  );
}
