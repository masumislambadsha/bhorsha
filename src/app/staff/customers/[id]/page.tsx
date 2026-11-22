"use client";

import { use } from "react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useGetCustomerQuery } from "@/features/customers/api";
import { useReviewKYCMutation, useSetCustomerStatusMutation, useUnblockCustomerMutation } from "@/features/customers/api";
import { formatBDT } from "@/lib/money";
import { groupAccountNumber } from "@/lib/mask";
import { formatDateTime } from "@/lib/time";

export default function StaffCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useGetCustomerQuery(id);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [review, reviewResult] = useReviewKYCMutation();
  const [setStatus, setStatusResult] = useSetCustomerStatusMutation();
  const [unblock, unblockResult] = useUnblockCustomerMutation();

  if (!data) return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  const customer = data.customer;

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`${customer.email} · ${customer.phone ?? ""} · Joined ${customer.createdAt ? formatDateTime(customer.createdAt) : ""}`}
        actions={
          <>
            {customer.status === "active" && <Button variant="ghost" onPress={() => setStatusOpen(true)}>Deactivate</Button>}
            {customer.status === "inactive" && <Button variant="primary" onPress={() => setStatusOpen(true)}>Activate</Button>}
            {customer.banned ? <Button variant="primary" onPress={() => setBlockOpen(true)}>Unblock</Button> : null}
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-lg font-medium">Profile</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div><dt className="text-muted">KYC status</dt><dd className="mt-0.5"><StatusBadge kind={`kyc:${customer.kycStatus}` as StatusKind} /></dd></div>
            <div><dt className="text-muted">Status</dt><dd className="mt-0.5"><StatusBadge kind={`customer:${customer.status}` as StatusKind} /></dd></div>
            <div><dt className="text-muted">Blocked</dt><dd className="mt-0.5">{customer.banned ? (customer.banReason ?? "Blocked") : "—"}</dd></div>
            <div><dt className="text-muted">Phone</dt><dd className="mt-0.5">{customer.phone ?? "Not set"}</dd></div>
            <div><dt className="text-muted">Address</dt><dd className="mt-0.5">{customer.address ?? "Not set"}</dd></div>
            <div><dt className="text-muted">Date of birth</dt><dd className="mt-0.5">{customer.dateOfBirth ?? "Not set"}</dd></div>
            <div><dt className="text-muted">Occupation</dt><dd className="mt-0.5">{customer.occupation ?? "Not set"}</dd></div>
            <div><dt className="text-muted">KYC note</dt><dd className="mt-0.5">{customer.kycNote ?? "—"}</dd></div>
            <div><dt className="text-muted">KYC reviewed by</dt><dd className="mt-0.5">{customer.kycReviewedBy ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg font-medium">Accounts</h2>
          {data.accounts.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No accounts yet. Accounts can be opened once the customer is KYC-verified.</p>
          ) : (
            <ul className="mt-4 divide-y divide-separator">
              {data.accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-3 py-3">
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
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 card p-5">
        <h2 className="font-display text-lg font-medium">Loan applications</h2>
        {data.loans.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No loan applications.</p>
        ) : (
          <ul className="mt-4 divide-y divide-separator">
            {data.loans.map((loan) => (
              <li key={loan.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{loan.loanType} loan</p>
                  <p className="text-sm text-muted">{formatBDT(loan.principalMinor)} for {loan.durationMonths} months</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatBDT(loan.outstandingMinor)}</p>
                  <StatusBadge kind={`loan:${loan.status}` as StatusKind} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={reviewOpen}
        title="Decide KYC"
        confirmLabel="Mark verified"
        isPending={reviewResult.status === "pending"}
        onConfirm={() => {
          review({ customerId: id, decision: "verified" });
          setReviewOpen(false);
        }}
        onCancel={() => setReviewOpen(false)}
      >
        <p className="text-sm text-muted">Marking the customer as verified allows them to open accounts.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={blockOpen}
        title="Unblock customer"
        confirmLabel="Unblock"
        destructive
        isPending={unblockResult.status === "pending"}
        onConfirm={() => {
          unblock(id);
          setBlockOpen(false);
        }}
        onCancel={() => setBlockOpen(false)}
      />

      <ConfirmDialog
        open={statusOpen}
        title={customer.status === "active" ? "Deactivate customer" : "Activate customer"}
        confirmLabel={customer.status === "active" ? "Deactivate" : "Activate"}
        isPending={setStatusResult.status === "pending"}
        onConfirm={() => setStatus({ customerId: id, status: customer.status === "active" ? "inactive" : "active", reason: statusReason || undefined })}
        onCancel={() => setStatusOpen(false)}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Reason
          <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </ConfirmDialog>
    </>
  );
}
