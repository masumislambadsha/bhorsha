"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { AmountInput } from "@/components/ui/AmountInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PinInput } from "@/components/ui/PinInput";
import { useAccountLookupQuery, useListAccountsQuery } from "@/features/accounts/api";
import { useTransferMutation } from "@/features/transfers/api";
import { formatBDT, toMinor } from "@/lib/money";
import { groupAccountNumber, maskAccountNumber } from "@/lib/mask";
import { dayKey } from "@/lib/time";
import { useAppSelector } from "@/store/hooks";
import type { TransactionDto } from "@/features/transactions/types";

interface Values {
  fromAccountId: string;
  toNumber: string;
  amount: string;
  description: string;
  pin: string;
}

export default function CustomerTransferPage() {
  const router = useRouter();
  const selectedId = useAppSelector((s) => s.accounts.selectedAccountId);
  const { data } = useListAccountsQuery(undefined);
  const accounts = data?.items ?? [];
  const [values, setValues] = useState<Values>({
    fromAccountId: selectedId ?? "",
    toNumber: "",
    amount: "",
    description: "",
    pin: "",
  });
  const [dialog, setDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionDto | null>(null);
  const [transfer, transferResult] = useTransferMutation();
  const idemKeyRef = useRef<string | null>(null);

  const sender = accounts.find((a) => a.id === values.fromAccountId);
  const others = accounts.filter((a) => a.id !== values.fromAccountId);
  const amountMinor = (() => {
    try {
      return values.amount ? Math.max(0, toMinor(values.amount)) : 0;
    } catch {
      return 0;
    }
  })();
  const available = sender?.availableMinor ?? 0;
  const dailyUsed = sender && sender.dailyOutflow.date === dayKey() ? sender.dailyOutflow.amountMinor : 0;
  const remainingDaily = (sender?.limits.dailyTransferMinor ?? 0) - dailyUsed;
  const lookupNumber = values.toNumber.trim();
  const { data: lookup } = useAccountLookupQuery(lookupNumber, { skip: !lookupNumber });

  async function handleSend() {
    idemKeyRef.current ??= crypto.randomUUID();
    setError(null);
    const outcome = await transfer({
      fromAccountId: values.fromAccountId,
      toAccountNumber: values.toNumber.replace(/\s+/g, ""),
      amount: values.amount,
      description: values.description.trim() || undefined,
      pin: values.pin,
    });
    if ("error" in outcome) {
      setError(outcome.error?.message ?? "Transfer failed.");
      return;
    }
    setResult(outcome.data ?? null);
    setDialog(false);
  }

  const resultScreen = result && (
    <div className="card p-6">
      <h2 className="font-display text-lg font-medium">Transfer completed</h2>
      <p className="mt-1 text-sm text-muted">
        {new Date(result.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} · Reference: {result.reference}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" onPress={() => router.push(`/customer/transactions/${result.id}`)}>View receipt</Button>
        <Button variant="primary" onPress={() => router.push("/customer/transfer")}>Make another transfer</Button>
      </div>
    </div>
  );

  if (resultScreen) return <>{resultScreen}</>;

  if (accounts.length === 0) {
    return (
      <>
        <PageHeader title="Transfer money" />
        <EmptyState
          title="You have no accounts"
          description="Open a savings, current or business account to start transferring."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Transfer money"
        description={sender ? `From ${sender.nickname || groupAccountNumber(sender.accountNumber)}` : "Choose your accounts"}
      />
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {error}
        </p>
      )}
      <div className="card p-6 md:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            From account
            <select
              value={values.fromAccountId}
              onChange={(event) => setValues((v) => ({ ...v, fromAccountId: event.target.value }))}
              aria-label="From account"
              className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nickname || groupAccountNumber(a.accountNumber)} — ৳{formatBDT(a.availableMinor)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Recipient account number
            <input
              value={values.toNumber}
              onChange={(event) => setValues((v) => ({ ...v, toNumber: event.target.value.replace(/[^0-9 ]/g, "") }))}
              placeholder="e.g. 1110 0001 0004"
              inputMode="numeric"
              maxLength={12}
              aria-label="Recipient account number"
              className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
            {lookup && (
              <p className="text-xs text-muted">
                {lookup.maskedName} — {lookup.accountType}
                {lookup.isOwn ? " · your account" : ""}
              </p>
            )}
            {others.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {others.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, toNumber: a.accountNumber }))}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {a.nickname || maskAccountNumber(a.accountNumber)}
                  </button>
                ))}
              </div>
            )}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Amount (taka)
            <AmountInput
              value={values.amount}
              onValueChange={(value) => setValues((v) => ({ ...v, amount: value }))}
              placeholder="500.00"
              aria-label="Amount"
              inputMode="decimal"
              className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm"
            />
            {sender && (
              <p className="text-xs text-muted">
                Available: ৳{formatBDT(available)} · Remaining today: ৳{formatBDT(remainingDaily)}
              </p>
            )}
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Description (optional)
            <input
              value={values.description}
              onChange={(event) => setValues((v) => ({ ...v, description: event.target.value.slice(0, 140) }))}
              placeholder="e.g. Rent payment"
              className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Transaction PIN
            <PinInput value={values.pin} onChange={(event) => setValues((v) => ({ ...v, pin: event.target.value }))} />
          </label>
        </div>
        <Button
          variant="primary"
          className="mt-6"
          onPress={() => setDialog(true)}
          isDisabled={!values.fromAccountId || !values.toNumber || !values.amount || !values.pin || !sender}
        >
          Review transfer
        </Button>
      </div>

      <ConfirmDialog
        open={dialog}
        title="Transfer review"
        confirmLabel="Send money"
        isPending={transferResult.status === "pending"}
        onConfirm={handleSend}
        onCancel={() => setDialog(false)}
      >
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">From</dt>
            <dd className="mt-0.5">{sender ? sender.nickname || groupAccountNumber(sender.accountNumber) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">To</dt>
            <dd className="mt-0.5 font-medium">{lookup ? `${lookup.maskedName}${lookup.isOwn ? " (your account)" : ""}` : "Enter a recipient account number to look it up"}</dd>
          </div>
          <div>
            <dt className="text-muted">Amount</dt>
            <dd className="mt-0.5 font-medium">৳{values.amount}</dd>
          </div>
          <div>
            <dt className="text-muted">Balance after (approx.)</dt>
            <dd className="mt-0.5 font-medium">০{formatBDT(Math.max(0, available - amountMinor))}</dd>
          </div>
        </dl>
      </ConfirmDialog>
    </>
  );
}
