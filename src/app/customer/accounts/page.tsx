"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { AccountBalanceChart } from "@/components/charts/AccountBalanceChart";
import { StatementCard } from "@/components/ui/StatementCard";
import { formatBDT } from "@/lib/money";
import { groupAccountNumber } from "@/lib/mask";
import { useAppSelector } from "@/store/hooks";
import { useListAccountsQuery } from "@/features/accounts/api";

export default function CustomerAccountsPage() {
  const selectedId = useAppSelector((s) => s.accounts.selectedAccountId);
  const { data } = useListAccountsQuery(undefined);
  const accounts = data?.items ?? [];

  return (
    <>
      <PageHeader title="Accounts" description="Account numbers, types and balances for all your accounts" />
      <StatementCard />
      <AccountBalanceChart accountId={selectedId ?? undefined} />
      <div className="card p-5">
        <ul className="divide-y divide-separator">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <Link href={`/customer/accounts/${account.id}`} className="font-medium text-link hover:underline">
                  {account.nickname || groupAccountNumber(account.accountNumber)}
                </Link>
                <p className="text-sm text-muted">{groupAccountNumber(account.accountNumber)} · {account.type}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-medium">{formatBDT(account.balanceMinor)}</p>
                <StatusBadge kind={`account:${account.status}` as StatusKind} />
              </div>
            </li>
          ))}
          {accounts.length === 0 && <p className="py-8 text-center text-sm text-muted">You have no accounts yet.</p>}
        </ul>
      </div>
    </>
  );
}
