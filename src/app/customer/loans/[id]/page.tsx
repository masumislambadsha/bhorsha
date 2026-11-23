"use client";

import { use } from "react";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { PinInput } from "@/components/ui/PinInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { useGetLoanQuery, useRepayLoanMutation } from "@/features/loans/api";
import { useListAccountsQuery } from "@/features/accounts/api";
import { groupAccountNumber } from "@/lib/mask";
import type { LoanDto } from "@/features/loans/types";

function timelineOf(loan: LoanDto): { label: string; status: boolean }[] {
  return [
    { label: "Submitted", status: ["pending", "under_review", "approved", "active", "completed", "rejected"].includes(loan.status) },
    { label: "Reviewed", status: ["under_review", "approved", "active", "completed"].includes(loan.status) },
    { label: "Approved", status: ["approved", "active", "completed"].includes(loan.status) },
    { label: "Disbursed", status: ["active", "completed"].includes(loan.status) },
    { label: "Completed", status: loan.status === "completed" },
  ];
}

function loanTitle(loanType: string): string {
  const titles: Record<string, string> = {
    personal: "Personal loan", home: "Home loan", car: "Car loan", education: "Education loan", business: "Business loan",
  };
  return titles[loanType] ?? loanType;
}

export default function CustomerLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useGetLoanQuery(id);
  const { data: accountsData } = useListAccountsQuery(undefined);
  const accounts = accountsData?.items ?? [];
  const [mode, setMode] = useState<"next_installment" | "payoff">("next_installment");
  const [pin, setPin] = useState("");
  const [dialog, setDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repay, repayResult] = useRepayLoanMutation();

  const unpaid = loan ? loan.schedule.filter((i) => i.status === "due") : [];
  const next = unpaid[0];

  if (!loan) return <PageHeader title="Loan" description="Loading…" />;
  const loanId = loan.id;
  const loanFromAccountId = loan.disbursementAccountId;

  const progress = loan.principalMinor > 0 ? Math.min(100, ((loan.principalMinor - loan.outstandingMinor) / loan.principalMinor) * 100) : 0;
  const repaymentAmount = mode === "payoff" ? loan.outstandingMinor : next?.amountDueMinor ?? 0;

  async function confirmRepay() {
    setError(null);
    const outcome = await repay({ id: loanId, fromAccountId: loanFromAccountId, pin, mode });
    if ("error" in outcome) {
      setError(outcome.error?.message ?? "Repayment failed.");
      return;
    }
    setDialog(false);
    setPin("");
  }

  return (
    <>
      <PageHeader
        title={loanTitle(loan.loanType)}
        description={`${loan.status} · ${formatBDT(loan.outstandingMinor)} outstanding`}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
            <div><p className="text-xs text-muted">Rate</p><p className="font-medium">{(loan.rateBps / 100).toFixed(2)}%</p></div>
            <div><p className="text-xs text-muted">Term</p><p className="font-medium">{loan.durationMonths} months</p></div>
            <div><p className="text-xs text-muted">Monthly income</p><p className="font-medium">{formatBDT(loan.monthlyIncomeMinor)}</p></div>
            <div><p className="text-xs text-muted">Debt-to-income</p><p className="font-medium">{loan.debtToIncome > 0 ? `${(loan.debtToIncome * 100).toFixed(1)}%` : "—"}</p></div>
          </div>
          {loan.description && <p className="mt-3 text-sm text-muted">{loan.description}</p>}
          {loan.notes && loan.notes.length > 0 && (
            <div className="mt-4">
              <h3 className="font-display text-base font-medium">Notes</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {loan.notes.map((n, i) => (
                  <li key={i} className="text-sm text-muted">• {n.body} <span className="text-xs">({formatDateTime(n.createdAt)})</span></li>
                ))}
              </ul>
            </div>
          )}
          {loan.repayments.length > 0 && (
            <div className="mt-5">
              <h3 className="font-display text-base font-medium">Repayment history</h3>
              <table className="mt-2 w-full border-collapse text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium text-right">Amount</th><th className="px-3 py-2 font-medium">Installments</th></tr>
                </thead>
                <tbody>
                  {loan.repayments.map((r) => (
                    <tr key={r.transactionId} className="border-b border-separator">
                      <td className="px-3 py-2 text-muted">{formatDateTime(r.paidAt)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatBDT(r.amountMinor)}</td>
                      <td className="px-3 py-2 text-muted">{r.installments.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg font-display font-medium">{formatBDT(loan.outstandingMinor)}</span>
            <span className="text-sm text-muted">outstanding</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          {loan.emiMinor && loan.totalInterestMinor !== null && (
            <div className="mt-4 text-sm">
              <p className="text-xs text-muted">EMI</p><p className="font-medium">{formatBDT(loan.emiMinor)}/month</p>
              <p className="mt-1 text-xs text-muted">Total interest</p><p className="font-medium">{formatBDT(loan.totalInterestMinor)}</p>
              <p className="mt-1 text-xs text-muted">Total payable</p><p className="font-medium">{formatBDT(loan.totalPayableMinor ?? 0)}</p>
            </div>
          )}
          <div className="mt-4">
            <h3 className="font-display text-base font-medium">Status timeline</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {timelineOf(loan).map((t) => (
                <li key={t.label} className={`text-sm ${t.status ? "" : "text-muted"}`}>
                  {t.status ? "✓" : "○"} {t.label}
                </li>
              ))}
            </ul>
          </div>
          {loan.disbursementAccountId && (() => {
            const a = accounts.find((x) => x.id === loan.disbursementAccountId);
            return a ? <p className="mt-3 text-xs text-muted">Disbursement account: {a.nickname} · {groupAccountNumber(a.accountNumber)}</p> : null;
          })()}
        </div>
      </div>

      {loan.schedule.length > 0 && (
        <div className="card mt-6 p-5">
          <h3 className="font-display text-base font-medium">Repayment schedule</h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="px-3 py-2 font-medium">#</th><th className="px-3 py-2 font-medium">Due</th><th className="px-3 py-2 font-medium text-right">Principal</th><th className="px-3 py-2 font-medium text-right">Interest</th><th className="px-3 py-2 font-medium text-right">Amount due</th><th className="px-3 py-2 font-medium"></th></tr>
            </thead>
            <tbody>
              {loan.schedule.slice(0, 12).map((i) => (
                <tr key={i.n} className={`border-b border-separator ${i.status === "paid" ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2">#{i.n}</td>
                  <td className="px-3 py-2 text-muted">{formatDateTime(i.dueDate)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBDT(i.principalMinor)}</td>
                  <td className="px-3 py-2 text-right">{formatBDT(i.interestMinor)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBDT(i.amountDueMinor)}</td>
                  <td className="px-3 py-2"><StatusBadge kind={i.status === "paid" ? "installment:paid" : "installment:due"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {loan.schedule.length > 12 && <p className="mt-1 text-xs text-muted">{loan.schedule.length - 12} more installments</p>}
        </div>
      )}

      {loan.status === "active" && (
        <div className="card mt-6 p-5">
          <h3 className="font-display text-base font-medium">Repay</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs text-muted">Mode</p>
              <select value={mode} onChange={(e) => setMode(e.target.value as "next_installment" | "payoff")} aria-label="Repayment mode" className="mt-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
                <option value="next_installment">Next installment</option>
                <option value="payoff">Pay off remaining balance</option>
              </select>
            </div>
            {mode === "next_installment" && next && (
              <p className="text-sm text-muted">Next due: {formatDateTime(next.dueDate)} · {formatBDT(next.amountDueMinor)}</p>
            )}
            <Button variant="primary" onPress={() => setDialog(true)} isDisabled={repayResult.status === "pending"}>
              {mode === "payoff" ? `Pay off ${formatBDT(loan.outstandingMinor)}` : `Pay ${next ? formatBDT(next.amountDueMinor) : formatBDT(repaymentAmount)}`}
            </Button>
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl border border-danger-soft-foreground bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{error}</p>}
        </div>
      )}
      {dialog && (
        <ConfirmDialog
          open={dialog}
          title="Confirm repayment"
          description={mode === "payoff" ? `Pay off the remaining balance of ${formatBDT(loan.outstandingMinor)}.` : `Pay ${next ? formatBDT(next.amountDueMinor) : ""}.`}
          confirmLabel={mode === "payoff" ? "Pay off" : "Pay"}
          isPending={repayResult.status === "pending"}
          onConfirm={() => { void confirmRepay(); }}
          onCancel={() => setDialog(false)}
        >
          <PinInput value={pin} onChange={(event) => setPin(event.target.value)} aria-label="Transaction PIN" />
        </ConfirmDialog>
      )}
    </>
  );
}
