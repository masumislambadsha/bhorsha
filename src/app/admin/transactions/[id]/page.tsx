"use client";

import { use } from "react";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { useGetTransactionQuery, useResolveFlagsMutation } from "@/features/transactions/api";
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

export default function AdminTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idOrReference } = use(params);
  const { data } = useGetTransactionQuery(idOrReference);
  const [dialog, setDialog] = useState<"clear" | "reverse" | "freeze_sender" | null>(null);
  const [note, setNote] = useState("");
  const [resolve, resolveResult] = useResolveFlagsMutation();

  if (!data) return <div className="py-20 text-center text-sm text-muted">Loading…</div>;

  const hasOpenFlags = data.flags.some((f) => f.status === "open");

  return (
    <>
      <PageHeader
        title="Transaction"
        description={`Reference ${data.reference} · ${data.status}`}
      />
      <div className="card p-6">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Reference</dt><dd className="mt-0.5 font-medium">{data.reference}</dd></div>
          <div><dt className="text-muted">From → To</dt><dd className="mt-0.5">{data.fromAccountNumber ?? ""} → {data.toAccountNumber ?? ""}</dd></div>
          <div><dt className="text-muted">Status</dt><dd className="mt-0.5"><StatusBadge kind={`transaction:${data.status}` as StatusKind} /></dd></div>
          <div><dt className="text-muted">Amount</dt><dd className="mt-0.5 font-medium">{formatBDT(data.amountMinor)}</dd></div>
          <div><dt className="text-muted">Date</dt><dd className="mt-0.5">{formatDateTime(data.createdAt)}</dd></div>
          <div><dt className="text-muted">Flags</dt><dd className="mt-0.5">{data.flags.length > 0 ? `${data.flags.length} open` : "None"}</dd></div>
        </dl>
        {data.flags.length > 0 && <h3 className="mt-6 text-sm font-medium">Flags</h3>}
        <FlagList flags={data.flags} />
        {hasOpenFlags && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="primary" isPending={resolveResult.status === "pending"} onPress={() => setDialog("clear")}>Clear flags</Button>
            <Button variant="primary" isPending={resolveResult.status === "pending"} onPress={() => setDialog("reverse")}>Reverse transfer</Button>
            <Button variant="danger" isPending={resolveResult.status === "pending"} onPress={() => setDialog("freeze_sender")}>Freeze sender</Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={dialog === "clear"}
        title="Clear flags"
        confirmLabel="Clear flags"
        isPending={resolveResult.status === "pending"}
        onConfirm={() => { resolve({ id: idOrReference, action: "clear", note }); setDialog(null); }}
        onCancel={() => setDialog(null)}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "reverse"}
        title="Reverse transfer"
        confirmLabel="Reverse transfer"
        destructive
        isPending={resolveResult.status === "pending"}
        onConfirm={() => { resolve({ id: idOrReference, action: "reverse", note }); setDialog(null); }}
        onCancel={() => setDialog(null)}
      >
        <p className="text-sm text-muted">
          Money moves back: the sender is credited {formatBDT(data.amountMinor + data.feeMinor)} and the recipient is debited {formatBDT(data.amountMinor)}.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "freeze_sender"}
        title="Freeze sender"
        confirmLabel="Freeze sender"
        destructive
        isPending={resolveResult.status === "pending"}
        onConfirm={() => { resolve({ id: idOrReference, action: "freeze_sender", note }); setDialog(null); }}
        onCancel={() => setDialog(null)}
      >
        <p className="text-sm text-muted">The sender account will be frozen.</p>
      </ConfirmDialog>
    </>
  );
}
