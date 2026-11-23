"use client";

import { FormEvent, useState } from "react";
import { Button } from "@heroui/react";
import { AmountInput } from "@/components/ui/AmountInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { groupAccountNumber } from "@/lib/mask";
import { useListAccountsQuery } from "@/features/accounts/api";
import { useCreateRequestMutation, useListRequestsQuery } from "@/features/requests/api";
import type { AccountDto } from "@/features/accounts/types";

const KIND_OPTIONS = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
] as const;

export default function CustomerRequestsPage() {
  const { data: accountsData } = useListAccountsQuery(undefined);
  const { data } = useListRequestsQuery(undefined);
  const [kind, setKind] = useState<"deposit" | "withdrawal">("deposit");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [create, createResult] = useCreateRequestMutation();
  const accounts = accountsData?.items ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (!accountId || !amount) return;
    const outcome = await create({ kind, accountId, amount, description: description.trim() || undefined });
    if ("error" in outcome) {
      setError(outcome.error?.message ?? "Could not create the request.");
      return;
    }
    setAmount("");
    setDescription("");
    setSuccess(true);
  }

  const account = accounts.find((a) => a.id === accountId);
  const requests = data?.items ?? [];

  return (
    <>
      <PageHeader title="Requests" description="Request deposits and withdrawals on your accounts" />
      <form onSubmit={handleSubmit} className="card mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Request type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "deposit" | "withdrawal")}
              aria-label="Request type"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Account</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              aria-label="Account"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nickname} · {groupAccountNumber(a.accountNumber)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Amount (৳)</span>
            <AmountInput
              value={amount}
              onValueChange={setAmount}
              aria-label="Amount"
              placeholder="0.00"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              aria-label="Description"
              maxLength={500}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            />
          </label>
        </div>
        {account && kind === "withdrawal" && (
          <p className="mt-3 text-xs text-muted">
            Available ৳{formatBDT(account.availableMinor)} on this account.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-danger-soft-foreground bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
            {error}
          </p>
        )}
        {success && !error && <p className="mt-3 text-sm text-success-soft-foreground">Request submitted. Staff will review it soon.</p>}
        <div className="mt-4">
          <Button type="submit" variant="primary" isPending={createResult.status === "pending"} isDisabled={createResult.status === "pending" || !accountId || !amount}>
            {kind === "deposit" ? "Request deposit" : "Request withdrawal"}
          </Button>
        </div>
      </form>

      <section aria-label="Request history">
        {requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Request a deposit or withdrawal and staff will review it."
          />
        ) : (
          <div className="card p-5">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-secondary text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Account</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium text-right">Amount</th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-separator last:border-0">
                    <td className="px-4 py-3.5 text-muted">{new Date(request.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}</td>
                    <td className="px-4 py-3.5">{request.kind === "deposit" ? "Deposit" : "Withdrawal"}</td>
                    <td className="px-4 py-3.5">{accountName(accounts, request.accountId)}</td>
                    <td className="px-4 py-3.5 text-right font-medium">{formatBDT(request.amountMinor)}{request.holdMinor > 0 && request.status === "pending" ? ` · hold ${formatBDT(request.holdMinor)}` : ""}</td>
                    <td className="px-4 py-3.5"><StatusBadge kind={`request:${request.status}`} /></td>
                    <td className="px-4 py-3.5 text-muted">{request.rejectionReason ?? request.reviewNote ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function accountName(accounts: AccountDto[], accountId: string): string {
  return accounts.find((a) => a.id === accountId)?.nickname ?? accountId.slice(-4);
}
