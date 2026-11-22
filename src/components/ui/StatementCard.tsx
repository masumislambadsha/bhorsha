"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { groupAccountNumber } from "@/lib/mask";
import { useListAccountsQuery } from "@/features/accounts/api";
import { useAppSelector } from "@/store/hooks";

export function StatementCard() {
  const router = useRouter();
  const selectedId = useAppSelector((s) => s.accounts.selectedAccountId);
  const { data } = useListAccountsQuery(undefined);
  const accounts = data?.items ?? [];
  const account = accounts.find((a) => a.id === selectedId) ?? accounts[0];
  if (!account) return null;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">{account.nickname || groupAccountNumber(account.accountNumber)}</span>
            <StatusBadge kind={`account:${account.status}` as StatusKind} />
          </div>
          <p className="mt-1 font-display text-2xl font-medium">{formatBDT(account.balanceMinor)}</p>
          <p className="mt-1 text-xs text-muted">
            Available ৳{formatBDT(account.availableMinor)} · On hold ৳{formatBDT(account.holdMinor)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onPress={() => router.push("/customer/transfer")}>Send money</Button>
        <Button variant="ghost" onPress={() => router.push("/customer/requests")}>Request deposit</Button>
        <Button variant="ghost" onPress={() => router.push("/customer/requests")}>Request withdrawal</Button>
      </div>
    </section>
  );
}
