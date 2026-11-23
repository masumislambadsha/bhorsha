"use client";

import Link from "next/link";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { useListLoansQuery } from "@/features/loans/api";
import type { LoanDto } from "@/features/loans/types";

function progressOf(loan: LoanDto): number {
  if (loan.principalMinor <= 0) return 0;
  return Math.min(100, ((loan.principalMinor - loan.outstandingMinor) / loan.principalMinor) * 100);
}

export default function CustomerLoansPage() {
  const { data } = useListLoansQuery(undefined);
  const loans: LoanDto[] = data?.items ?? [];
  const active = loans.filter((l) => l.status === "active").length;  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Loans</h1>
          <p className="text-sm text-muted">Active loans, repayment schedules and history</p>
        </div>
        <Link href="/customer/loans/apply" className="rounded-xl bg-accent py-2.5 px-5 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
          Apply for a loan
        </Link>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Active loans</p>
          <p className="mt-1 text-2xl font-display font-medium">{active}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Total outstanding</p>
          <p className="mt-1 text-2xl font-display font-medium">
            {formatBDT(loans.reduce((sum, l) => sum + l.outstandingMinor, 0))}
          </p>
        </div>
      </div>

      {loans.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-lg font-medium">No loans yet</p>
          <p className="mt-1 text-sm text-muted">Apply for a personal, home, car, education or business loan.</p>
        </div>
      ) : (
        <div className="card p-5">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-secondary text-left text-xs text-muted">
              <tr>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Principal</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Outstanding</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Progress</th>
                <th scope="col" className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b border-separator last:border-0">
                  <td className="px-4 py-3.5 capitalize">{loan.loanType}</td>
                  <td className="px-4 py-3.5"><StatusBadge kind={`loan:${loan.status}` as StatusKind} /></td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatBDT(loan.principalMinor)}</td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatBDT(loan.outstandingMinor)}</td>
                  <td className="px-4 py-3.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-tertiary">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${progressOf(loan)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/customer/loans/${loan.id}`} className="text-sm text-link hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
