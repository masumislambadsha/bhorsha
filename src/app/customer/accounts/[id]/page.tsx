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
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthAgo] = useState(() => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));

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
      <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-display text-lg font-medium">Statements</h2>
          <p className="mt-1 text-sm text-muted">Download the last 30 days as CSV or PDF. Amounts use BDT.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/accounts/${id}/statement?from=${monthAgo}&to=${today}&format=csv`} className="rounded-full border border-border px-4 py-2 text-sm">Download CSV</a>
          <a href={`/api/accounts/${id}/statement?from=${monthAgo}&to=${today}&format=pdf`} className="rounded-full border border-border px-4 py-2 text-sm">Download PDF</a>
        </div>
      </div>
      <StatementDownload accountId={id} />
    </>
  );
}

function StatementDownload({ accountId }: { accountId: string }) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const url = (format: "csv" | "pdf") =>
    `/api/accounts/${accountId}/statement?from=${from}&to=${to}&format=${format}`;
  return (
    <section className="card mt-6 p-5">
      <h2 className="font-display text-lg font-medium">Statement</h2>
      <p className="mt-1 text-sm text-muted">Download an account statement for a period of up to 366 days.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <Button variant="ghost" onPress={() => { window.location.href = url("csv"); }}>Download CSV</Button>
        <Button variant="ghost" onPress={() => { window.location.href = url("pdf"); }}>Download PDF</Button>
      </div>
    </section>
  );
}
