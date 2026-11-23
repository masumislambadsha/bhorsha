"use client";

import Link from "next/link";
import { useGetStaffStatsQuery } from "@/features/stats/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppSelector } from "@/store/hooks";

export default function StaffHomePage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { data, isLoading } = useGetStaffStatsQuery();
  if (role !== "staff") return null;

  const queues = [
    { label: "Pending KYC", count: data?.kycPending ?? 0, href: "/staff/customers" },
    { label: "Pending requests", count: data?.pendingRequests ?? 0, href: "/staff/queue" },
    { label: "Held transfers", count: data?.heldTransfers ?? 0, href: "/staff/queue" },
    { label: "Open flags", count: data?.openFlags ?? 0, href: "/staff/transactions" },
    { label: "Loans to review", count: data?.loansAwaitingReview ?? 0, href: "/staff/loans" },
  ];

  return (
    <>
      <PageHeader title="Staff workspace" description="Your work queues at a glance." />
      {isLoading ? (
        <p className="text-sm text-muted">Loading queues…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {queues.map((item) => (
            <Link key={item.label} href={item.href} className="card p-5 transition-colors hover:border-accent">
              <p className="text-sm text-muted">{item.label}</p>
              <p className="amount mt-2 font-display text-[28px]">{item.count}</p>
              <span className="mt-2 inline-block text-sm text-link">Review →</span>
            </Link>
          ))}
        </div>
      )}
      <div className="card mt-6 p-5">
        <h2 className="font-display text-lg font-medium">Recent activity</h2>
        <p className="mt-2 text-sm text-muted">Use the Queue tab for held transfers and requests, or search customers and transactions from the navigation.</p>
      </div>
    </>
  );
}
