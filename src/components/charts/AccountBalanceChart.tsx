"use client";

import { useMemo } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatBDT } from "@/lib/money";
import { useGetBalanceHistoryQuery } from "@/features/accounts/api";

export function AccountBalanceChart({ accountId }: { accountId?: string }) {
  const { data: history = [] } = useGetBalanceHistoryQuery(accountId ?? "", { skip: !accountId });
  const points = useMemo(() => history.map((p) => ({ date: p.date, balance: p.balance })), [history]);
  if (points.length === 0) return null;
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-medium">Balance history</h2>
      <div className="mt-4 h-72 w-full">
        <LineChart data={points} margin={{ left: 0, bottom: 0 }}>
          <XAxis dataKey="date" fontSize={12} stroke="var(--muted)" tickLine={false} />
          <YAxis fontSize={12} stroke="var(--muted)" tickFormatter={(value: number) => formatBDT(value)} tickLine={false} />
          <Tooltip formatter={(value: unknown) => formatBDT(Number(value ?? 0))} />
          <Line type="monotone" dataKey="balance" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
        </LineChart>
      </div>
    </section>
  );
}
