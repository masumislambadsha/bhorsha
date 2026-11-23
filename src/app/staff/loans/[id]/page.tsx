"use client";

import { use } from "react";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatBDT } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { useGetLoanQuery, useAddLoanNoteMutation, useForwardLoanMutation } from "@/features/loans/api";

export default function StaffLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loan } = useGetLoanQuery(id);
  const [note, setNote] = useState("");
  const [recommendation, setRecommendation] = useState<"approve" | "reject">("approve");
  const [dialog, setDialog] = useState<"forward" | "note" | null>(null);
  const [addNote] = useAddLoanNoteMutation();
  const [forward] = useForwardLoanMutation();

  if (!loan) return <PageHeader title="Loan" description="Loading…" />;

  return (
    <>
      <PageHeader
        title={loan.loanType}
        description={`${loan.status} · applicant #${loan.applicantId.slice(-4)} · ${formatBDT(loan.principalMinor)}`}
      />
      <div className="card mb-6 p-5">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div><p className="text-xs text-muted">Term</p><p className="font-medium">{loan.durationMonths} months</p></div>
          <div><p className="text-xs text-muted">Monthly income</p><p className="font-medium">{formatBDT(loan.monthlyIncomeMinor)}</p></div>
          <div><p className="text-xs text-muted">Debt-to-income</p><p className="font-medium">{loan.debtToIncome > 0 ? `${(loan.debtToIncome * 100).toFixed(1)}%` : "—"}</p></div>
          <div><p className="text-xs text-muted">Description</p><p className="font-medium">{loan.description}</p></div>
          <div><p className="text-xs text-muted">Forwarded</p><p className="font-medium">{loan.forwarded ? `${formatDateTime(loan.forwarded.at)} · ${loan.forwarded.recommendation}` : "—"}</p></div>
          <div><p className="text-xs text-muted">Decision</p><p className="font-medium">{loan.decision ? formatDateTime(loan.decision.at) : "—"}</p></div>
        </div>
        <div className="mt-5">
          <h3 className="font-display text-base font-medium">Internal notes</h3>
          <div className="mt-2 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" aria-label="Note" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
            <Button variant="outline" onPress={() => { if (note.trim()) { addNote({ id, body: note.trim() }); setNote(""); } }}>Add note</Button>
          </div>
          {loan.notes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {loan.notes.map((n, i) => <li key={i} className="text-sm text-muted">• {n.body} <span className="text-xs">({formatDateTime(n.createdAt)})</span></li>)}
            </ul>
          )}
        </div>
      </div>
      {loan.status === "pending" && (
        <div className="card mb-6 p-5">
          <h3 className="font-display text-base font-medium">Forward to admin</h3>
          <p className="text-sm text-muted">Pending loans are reviewed by an admin.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onPress={() => setDialog("forward")}>Forward for approval</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={dialog === "forward"}
        title={recommendation === "approve" ? "Forward for approval" : "Forward for rejection"}
        confirmLabel={recommendation === "approve" ? "Forward" : "Forward"}
        onConfirm={() => {
          if (dialog === "forward") forward({ id, recommendation, note: note.trim() || undefined });
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Recommendation</span>
          <select value={recommendation} onChange={(e) => setRecommendation(e.target.value as "approve" | "reject")} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
        </label>
      </ConfirmDialog>
    </>
  );
}
