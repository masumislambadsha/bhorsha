"use client";

import { use } from "react";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { useGetLoanQuery, useApproveLoanMutation, useRejectLoanMutation, useDisburseLoanMutation } from "@/features/loans/api";

export default function AdminLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useGetLoanQuery(id);
  const [dialog, setDialog] = useState<"approve" | "reject" | "disburse" | null>(null);
  const [reason, setReason] = useState("");
  const [approve, approveResult] = useApproveLoanMutation();
  const [reject, rejectResult] = useRejectLoanMutation();
  const [disburse, disburseResult] = useDisburseLoanMutation();

  if (!loan) return <PageHeader title="Loan" description="Loading…" />;

  const isPending = loan.status === "pending" || loan.status === "under_review";

  return (
    <>
      <PageHeader
        title={loan.loanType}
        description={`${loan.status} · applicant #${loan.applicantId.slice(-4)}`}
      />
      <div className="card mb-6 p-5">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div><p className="text-xs text-muted">Principal</p><p className="font-medium">{formatBDT(loan.principalMinor)}</p></div>
          <div><p className="text-xs text-muted">Outstanding</p><p className="font-medium">{formatBDT(loan.outstandingMinor)}</p></div>
          <div><p className="text-xs text-muted">Term</p><p className="font-medium">{loan.durationMonths} months</p></div>
          <div><p className="text-xs text-muted">Rate</p><p className="font-medium">{(loan.rateBps / 100).toFixed(2)}%</p></div>
          <div><p className="text-xs text-muted">DTI</p><p className="font-medium">{loan.debtToIncome > 0 ? `${(loan.debtToIncome * 100).toFixed(1)}%` : "—"}</p></div>
          <div><p className="text-xs text-muted">Description</p><p className="font-medium">{loan.description}</p></div>
        </div>
        {loan.decision && (
          <div className="mt-4 text-sm">
            <p className="text-xs text-muted">Decision</p>
            <p className="font-medium">{formatDateTime(loan.decision.at)} {loan.decision.reason ? `— ${loan.decision.reason}` : ""}</p>
          </div>
        )}
      </div>
      {loan.schedule.length > 0 && (
        <div className="card mb-6 p-5">
          <h3 className="font-display text-base font-medium">Repayment schedule</h3>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="px-3 py-2 font-medium">#</th><th className="px-3 py-2 font-medium">Due</th><th className="px-3 py-2 font-medium text-right">Principal</th><th className="px-3 py-2 font-medium text-right">Amount due</th><th className="px-3 py-2 font-medium"></th></tr>
            </thead>
            <tbody>
              {loan.schedule.slice(0, 12).map((i) => (
                <tr key={i.n} className={`border-b border-separator ${i.status === "paid" ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2">#{i.n}</td>
                  <td className="px-3 py-2 text-muted">{formatDateTime(i.dueDate)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBDT(i.principalMinor)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBDT(i.amountDueMinor)}</td>
                  <td className="px-3 py-2"><StatusBadge kind={i.status === "paid" ? "installment:paid" : "installment:due"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loan.status === "approved" && (
        <div className="card mb-6 p-5">
          <h3 className="font-display text-base font-medium">Disbursement</h3>
          <Button variant="primary" onPress={() => setDialog("disburse")} isDisabled={disburseResult.status === "pending"}>Disburse {formatBDT(loan.principalMinor)}</Button>
        </div>
      )}
      {isPending && (
        <div className="card mb-6 p-5">
          <h3 className="font-display text-base font-medium">Decision</h3>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onPress={() => setDialog("approve")} isDisabled={approveResult.status === "pending"}>Approve</Button>
            <Button variant="danger" onPress={() => setDialog("reject")} isDisabled={rejectResult.status === "pending"}>Reject</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!dialog}
        title={dialog === "approve" ? "Approve loan" : dialog === "reject" ? "Reject loan" : "Disburse loan"}
        confirmLabel={dialog === "approve" ? "Approve" : dialog === "reject" ? "Reject" : "Disburse"}
        destructive={dialog === "reject"}
        isPending={dialog === "approve" ? approveResult.status === "pending" : dialog === "reject" ? rejectResult.status === "pending" : disburseResult.status === "pending"}
        onConfirm={() => {
          if (dialog === "approve") approve(id);
          else if (dialog === "reject") reject({ id, reason: reason.trim() || "Rejected by admin" });
          else if (dialog === "disburse") disburse(id);
          setDialog(null);
          setReason("");
        }}
        onCancel={() => setDialog(null)}
      >
        {dialog === "reject" && (
          <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} placeholder="Reason for rejection" aria-label="Rejection reason" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none" rows={3} />
        )}
      </ConfirmDialog>
    </>
  );
}
