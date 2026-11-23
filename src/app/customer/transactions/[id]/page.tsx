"use client";

import { use } from "react";
import { Button } from "@heroui/react";
import { useGetTransactionQuery, transactionReceiptUrl } from "@/features/transactions/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { fromMinor } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export default function CustomerTransactionDetailPage({ params }: { params: Promise<{ idOrReference: string }> }) {
  const { idOrReference } = use(params);
  const { data } = useGetTransactionQuery(idOrReference);

  if (!data) return <div className="py-20 text-center text-sm text-muted">Loading…</div>;

  function print() {
    window.print();
  }

  return (
    <>
      <PageHeader
        title="Transaction receipt"
        description={`Reference ${data.reference} · ${formatDateTime(data.createdAt)}`}
        actions={<Button variant="ghost" onPress={print}>Print</Button>}
      />
      <div className="card p-6">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Reference</dt><dd className="mt-0.5 font-medium">{data.reference}</dd></div>
          <div><dt className="text-muted">Date & time</dt><dd className="mt-0.5 font-medium">{formatDateTime(data.createdAt)}</dd></div>
          <div><dt className="text-muted">Type</dt><dd className="mt-0.5">{data.type}</dd></div>
          <div><dt className="text-muted">Status</dt><dd className="mt-0.5"><StatusBadge kind={`transaction:${data.status}` as StatusKind} /></dd></div>
          <div><dt className="text-muted">From</dt><dd className="mt-0.5">{data.fromAccountNumber ?? "—"}</dd></div>
          <div><dt className="text-muted">To</dt><dd className="mt-0.5">{data.toAccountNumber ?? "—"}</dd></div>
          <div><dt className="text-muted">Amount</dt><dd className="mt-0.5 font-medium">BDT {fromMinor(data.amountMinor)}</dd></div>
          <div><dt className="text-muted">Fee</dt><dd className="mt-0.5">BDT {fromMinor(data.feeMinor)}</dd></div>
          <div><dt className="text-muted">Total</dt><dd className="mt-0.5 font-medium">BDT {fromMinor(data.amountMinor + data.feeMinor)}</dd></div>
          <div><dt className="text-muted">Description</dt><dd className="mt-0.5">{data.description ?? "—"}</dd></div>
        </dl>
        <div className="mt-6">
          <a href={transactionReceiptUrl(data.id)} className="text-link hover:underline">
            Download PDF receipt
          </a>
        </div>
      </div>
    </>
  );
}
