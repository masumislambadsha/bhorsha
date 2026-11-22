"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { useListCustomersQuery } from "@/features/customers/api";

export default function StaffCustomersPage() {
  const [q, setQ] = useState("");
  const [kyc, setKyc] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();
  const { data } = useListCustomersQuery({ q: q || undefined, kyc: kyc || undefined, status: status || undefined });
  const customers = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${data?.total ?? 0} registered customers`}
        actions={
          <Button variant="primary" onPress={() => router.push("/staff/customers/new")}>
            <Plus aria-hidden="true" className="mr-2 size-4" />
            Register customer
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search name, email, phone or account number"
          aria-label="Search"
          className="w-full sm:max-w-xs rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          value={kyc}
          onChange={(event) => setKyc(event.target.value)}
          aria-label="Filter by KYC status"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All KYC</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by customer status"
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="card p-5">
        {customers.length === 0 ? (
          <p className="text-sm text-muted">No customers match the current filters.</p>
        ) : (
          <ul className="divide-y divide-separator">
            {customers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/staff/customers/${customer.id}`)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-surface-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{customer.name}</p>
                    <p className="truncate text-sm text-muted">
                      {customer.email} {customer.phone ? `· ${customer.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge kind={`kyc:${customer.kycStatus}` as StatusKind} />
                    <StatusBadge kind={`customer:${customer.status}` as StatusKind} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
