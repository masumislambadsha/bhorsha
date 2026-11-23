"use client";

import { use } from "react";
import { Button } from "@heroui/react";
import { useState } from "react";
import { AccountBalanceChart } from "@/components/charts/AccountBalanceChart";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import {
  useFreezeAccountMutation,
  useGetAccountQuery,
  useUnfreezeAccountMutation,
  useUpdateAccountMutation,
  useUpdateLimitsMutation,
} from "@/features/accounts/api";
import { formatBDT } from "@/lib/money";
import { groupAccountNumber } from "@/lib/mask";

export default function AdminAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isError } = useGetAccountQuery(id);
  const [updateAccount, updateAccountResult] = useUpdateAccountMutation();
  const [freeze, freezeResult] = useFreezeAccountMutation();
  const [unfreeze, unfreezeResult] = useUnfreezeAccountMutation();
  const [updateLimits] = useUpdateLimitsMutation();
  const [nickname, setNickname] = useState("");
  const [dialog, setDialog] = useState<"freeze" | "unfreeze" | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [perTx, setPerTx] = useState("");
  const [daily, setDaily] = useState("");
  const [min, setMin] = useState("");

  if (isError) return <div className="py-20 text-center text-sm text-muted">This account was not found.</div>;
  if (!data) return <div className="py-20 text-center text-sm text-muted">Loading…</div>;

  const account = data;
  const busy = updateAccountResult.status === "pending" || freezeResult.status === "pending" || unfreezeResult.status === "pending";

  function saveLimits() {
    updateLimits({
      id,
      limits: {
        ...(perTx !== "" ? { perTransactionMinor: Math.round(Number(perTx) * 100) } : {}),
        ...(daily !== "" ? { dailyTransferMinor: Math.round(Number(daily) * 100) } : {}),
        ...(min !== "" ? { minimumBalanceMinor: Math.round(Number(min) * 100) } : {}),
      },
    });
  }

  return (
    <>
      <h1 className="mb-6 font-display text-[28px] font-medium">{account.nickname || "Account"}</h1>
      <div className="card p-5">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Account number</dt><dd className="mt-0.5 font-medium">{groupAccountNumber(account.accountNumber)}</dd></div>
          <div><dt className="text-muted">Type</dt><dd className="mt-0.5">{account.type}</dd></div>
          <div><dt className="text-muted">Status</dt><dd className="mt-0.5"><StatusBadge kind={`account:${account.status}` as StatusKind} /></dd></div>
          <div><dt className="text-muted">Balance</dt><dd className="mt-0.5 font-medium">{formatBDT(account.balanceMinor)}</dd></div>
          <div><dt className="text-muted">Available</dt><dd className="mt-0.5 font-medium">{formatBDT(account.availableMinor)}</dd></div>
          <div><dt className="text-muted">On hold</dt><dd className="mt-0.5 font-medium">{formatBDT(account.holdMinor)}</dd></div>
          <div><dt className="text-muted">Per-transaction limit</dt><dd className="mt-0.5">{formatBDT(account.limits.perTransactionMinor)}</dd></div>
          <div><dt className="text-muted">Daily transfer limit</dt><dd className="mt-0.5">{formatBDT(account.limits.dailyTransferMinor)}</dd></div>
          <div><dt className="text-muted">Minimum balance</dt><dd className="mt-0.5">{formatBDT(account.limits.minimumBalanceMinor)}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" isDisabled={account.status !== "active"} isPending={busy} onPress={() => setDialog("freeze")}>
            Freeze
          </Button>
          <Button variant="outline" isDisabled={account.status !== "frozen"} isPending={busy} onPress={() => setDialog("unfreeze")}>
            Unfreeze
          </Button>
          <Button variant="primary" onPress={() => updateAccount({ id, nickname: nickname.trim() })} isDisabled={nickname.trim() === ""}>
            Save nickname
          </Button>
        </div>
        <div className="mt-3">
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="New nickname (account type is fixed after opening)"
            className="w-full max-w-xs rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-5 grid gap-4 text-sm md:grid-cols-3">
          <label className="flex flex-col gap-1.5 font-medium"><span>Per-transaction (taka)</span><input value={perTx} onChange={(e) => setPerTx(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2" /></label>
          <label className="flex flex-col gap-1.5 font-medium"><span>Daily transfer (taka)</span><input value={daily} onChange={(e) => setDaily(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2" /></label>
          <label className="flex flex-col gap-1.5 font-medium"><span>Minimum balance (taka)</span><input value={min} onChange={(e) => setMin(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2" /></label>
        </div>
        <Button variant="primary" className="mt-4" onPress={saveLimits} isDisabled={perTx === "" && daily === "" && min === ""}>
          Update limits
        </Button>
      </div>
      <AccountBalanceChart accountId={id} />
      <ConfirmDialog
        open={dialog === "freeze"}
        title="Freeze account"
        confirmLabel="Freeze account"
        destructive
        isPending={freezeResult.status === "pending"}
        confirmDisabled={freezeReason.trim() === ""}
        onConfirm={() => {
          freeze({ id, reason: freezeReason });
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Reason
          <input value={freezeReason} onChange={(event) => setFreezeReason(event.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2" />
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "unfreeze"}
        title="Unfreeze account"
        confirmLabel="Unfreeze account"
        isPending={unfreezeResult.status === "pending"}
        onConfirm={() => {
          unfreeze(id);
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
