"use client";

import { Button } from "@heroui/react";
import { useState } from "react";
import { useFreezeAccountMutation, useListAccountsQuery, useUnfreezeAccountMutation } from "@/features/accounts/api";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { groupAccountNumber, maskAccountNumber } from "@/lib/mask";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppSelector } from "@/store/hooks";

export default function AdminAccountsPage() {
  const { data } = useListAccountsQuery({});
  const [freezeReason, setFreezeReason] = useState("");
  const [dialog, setDialog] = useState<{ id: string; freeze: boolean } | null>(null);
  const [freeze, freezeResult] = useFreezeAccountMutation();
  const [unfreeze, unfreezeResult] = useUnfreezeAccountMutation();
  const role = useAppSelector((s) => s.auth.user?.role ?? "admin");
  if (role !== "admin") return null;
  const accounts = data?.items ?? [];

  return (
    <>
      <h1 className="mb-6 font-display text-[28px] font-medium">Accounts</h1>
      <div className="card p-5">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted">No accounts yet.</p>
        ) : (
          <ul className="divide-y divide-separator">
            {accounts.map((account) => (
              <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium">{account.nickname || groupAccountNumber(account.accountNumber)}</p>
                  <p className="text-sm text-muted">{maskAccountNumber(account.accountNumber)} · {account.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-right">{formatBDT(account.balanceMinor)}</p>
                  <StatusBadge kind={`account:${account.status}` as StatusKind} />
                  <Button variant="ghost" isDisabled={account.status !== "active"} onPress={() => setDialog({ id: account.id, freeze: true })}>
                    Freeze
                  </Button>
                  <Button variant="ghost" isDisabled={account.status !== "frozen"} onPress={() => setDialog({ id: account.id, freeze: false })}>
                    Unfreeze
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={!!dialog}
        title={dialog?.freeze ? "Freeze account" : "Unfreeze account"}
        confirmLabel={dialog?.freeze ? "Freeze account" : "Unfreeze account"}
        destructive={!!dialog?.freeze}
        isPending={freezeResult.status === "pending" || unfreezeResult.status === "pending"}
        onConfirm={() => {
          if (!dialog) return;
          if (dialog.freeze) freeze({ id: dialog.id, reason: freezeReason });
          else unfreeze(dialog.id);
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      >
        {dialog?.freeze && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Reason
            <input value={freezeReason} onChange={(event) => setFreezeReason(event.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </label>
        )}
        <p className="text-sm text-muted">
          A frozen account cannot send or receive transfers and cannot approve pending requests.
        </p>
      </ConfirmDialog>
    </>
  );
}
