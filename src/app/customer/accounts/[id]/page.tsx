"use client";

import { use } from "react";
import { Button } from "@heroui/react";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { AccountBalanceChart } from "@/components/charts/AccountBalanceChart";
import { formatBDT } from "@/lib/money";
import { dayKey } from "@/lib/time";
import { useGetAccountQuery } from "@/features/accounts/api";

export default function CustomerAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useGetAccountQuery(id);
  const [copied, setCopied] = useState(false);

  if (!data) return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  const account = data;
  const remaining = Math.max(
    0,
    account.limits.dailyTransferMinor - (account.dailyOutflow.date === dayKey() ? account.dailyOutflow.amountMinor : 0),
  );

  function copy() {
    void navigator.clipboard
      .writeText(account.accountNumber)
      .then(() => setCopied(true))
      .catch(() => undefined);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <PageHeader
        title={account.nickname || "Account"}
        description="Full account number — copy it when you need to paste it for a transfer"
        actions={<Button variant="ghost" onPress={copy}>{copied ? "Copied!" : "Copy number"}</Button>}
      />
      <div className="card p-5">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Account number</dt><dd className="mt-0.5 font-medium font-mono">{account.accountNumber}</dd></div>
          <div><dt className="text-muted">Type</dt><dd className="mt-0.5">{account.type}</dd></div>
          <div><dt className="text-muted">Status</dt><dd className="mt-0.5"><StatusBadge kind={`account:${account.status}` as StatusKind} /></dd></div>
          <div><dt className="text-muted">Balance</dt><dd className="mt-0.5 font-medium">{formatBDT(account.balanceMinor)}</dd></div>
          <div><dt className="text-muted">Available</dt><dd className="mt-0.5 font-medium">{formatBDT(account.availableMinor)}</dd></div>
          <div><dt className="text-muted">On hold</dt><dd className="mt-0.5 font-medium">{formatBDT(account.holdMinor)}</dd></div>
          <div><dt className="text-muted">Daily transfer limit</dt><dd className="mt-0.5">{formatBDT(account.limits.dailyTransferMinor)}</dd></div>
          <div><dt className="text-muted">Today&apos;s remaining limit</dt><dd className="mt-0.5">{formatBDT(remaining)}</dd></div>
        </dl>
      </div>
      <AccountBalanceChart accountId={id} />
    </>
  );
}
