"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBDT } from "@/lib/money";
import { useListRequestsQuery, useApproveRequestMutation, useRejectRequestMutation } from "@/features/requests/api";
import type { RequestDto } from "@/features/requests/types";

const STATUSES = ["all", "pending", "approved", "rejected"] as const;

type Dialog = { id: string; action: "approve" | "reject"; reason: string };

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { data } = useListRequestsQuery(status === "all" ? undefined : { status });
  const [approveRequest, approveResult] = useApproveRequestMutation();
  const [rejectRequest, rejectResult] = useRejectRequestMutation();
  const requests: RequestDto[] = data?.items ?? [];

  return (
    <>
      <PageHeader title="Requests" description="All deposit and withdrawal requests" />
      <div className="mb-5">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
          aria-label="Filter by status"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
          ))}
        </select>
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No requests" description="No requests match this filter." />
      ) : (
        <div className="card p-5">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-secondary text-left text-xs text-muted">
              <tr>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Customer</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium text-right">Amount</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-separator last:border-0">
                  <td className="px-4 py-3.5 text-muted">#{request.customerId.slice(-4)}</td>
                  <td className="px-4 py-3.5">{request.kind === "deposit" ? "Deposit" : "Withdrawal"}</td>
                  <td className="px-4 py-3.5 text-right font-medium">{formatBDT(request.amountMinor)}{request.holdMinor > 0 ? ` (hold ${formatBDT(request.holdMinor)})` : ""}</td>
                  <td className="px-4 py-3.5"><StatusBadge kind={`request:${request.status}`} /></td>
                  <td className="px-4 py-3.5 text-muted">{new Date(request.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}</td>
                  <td className="px-4 py-3.5">
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button variant="primary" isPending={approveResult.status === "pending"} onPress={() => setDialog({ id: request.id, action: "approve", reason: "" })}>Approve</Button>
                        <Button variant="danger" isPending={rejectResult.status === "pending"} onPress={() => setDialog({ id: request.id, action: "reject", reason: "" })}>Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.action === "approve" ? "Approve request" : "Reject request"}
        description={dialog?.action === "reject" ? "Admins can reject at any amount." : undefined}
        confirmLabel={dialog?.action === "approve" ? "Approve" : "Reject"}
        destructive={dialog?.action === "reject"}
        isPending={dialog?.action === "approve" ? approveResult.status === "pending" : rejectResult.status === "pending"}
        onConfirm={() => {
          if (dialog) {
            if (dialog.action === "approve") approveRequest(dialog.id);
            else rejectRequest({ id: dialog.id, reason: dialog.reason.trim() || "Rejected by admin" });
          }
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      >
        {dialog?.action === "reject" && (
          <textarea
            value={dialog.reason}
            onChange={(e) => setDialog({ ...dialog, reason: e.target.value.slice(0, 300) })}
            placeholder="Reason for rejection (5-300 characters)"
            aria-label="Rejection reason"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            rows={3}
          />
        )}
      </ConfirmDialog>
    </>
  );
}
