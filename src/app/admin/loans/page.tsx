"use client";

import Link from "next/link";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { useListLoansQuery } from "@/features/loans/api";
import type { LoanDto } from "@/features/loans/types";

export default function AdminLoansPage() {
  const { data } = useListLoansQuery(undefined);
  const loans: LoanDto[] = data?.items ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-medium">Loans</h1>
        <p className="text-sm text-muted">Applications, reviews and disbursements</p>
      </div>
      <div className="card p-5">
        {loans.length === 0 ? (
          <p className="text-sm text-muted">No loans yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-secondary text-left text-xs text-muted">
              <tr>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Applicant</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Principal</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Outstanding</th>
                <th scope="col" className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b border-separator last:border-0">
                  <td className="px-4 py-3.5 text-muted">#{loan.applicantId.slice(-4)}</td>
                  <td className="px-4 py-3.5 capitalize">{loan.loanType}</td>
                  <td className="px-4 py-3.5"><StatusBadge kind={`loan:${loan.status}` as StatusKind} /></td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatBDT(loan.principalMinor)}</td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatBDT(loan.outstandingMinor)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/admin/loans/${loan.id}`} className="text-sm text-link hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
