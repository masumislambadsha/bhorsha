"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/features/admin/api";
import { formatBDT } from "@/lib/money";
import { useAppSelector } from "@/store/hooks";

export default function AdminSettingsPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { data, isLoading } = useGetSettingsQuery();
  const [update, result] = useUpdateSettingsMutation();
  const [fee, setFee] = useState("");
  const [review, setReview] = useState("");
  const [staffLimit, setStaffLimit] = useState("");
  if (role !== "admin") return null;

  return (
    <>
      <PageHeader title="Bank settings" description="Defaults for new accounts, reviews and lending." />
      {isLoading ? <p className="text-sm text-muted">Loading settings…</p> : !data ? (
        <p className="text-sm text-muted">Could not load settings.</p>
      ) : (
        <div className="card max-w-2xl p-6">
          <h2 className="font-display text-lg font-medium">Current values</h2>
          <dl className="mt-4 divide-y divide-separator text-sm">
            <div className="flex justify-between py-2.5"><dt className="text-muted">Transfer fee</dt><dd className="amount">{formatBDT(Number(data.transferFeeMinor ?? 0))}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Review threshold</dt><dd className="amount">{formatBDT(Number(data.reviewThresholdMinor ?? 0))}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Staff approval limit</dt><dd className="amount">{formatBDT(Number(data.staffApprovalLimitMinor ?? 0))}</dd></div>
          </dl>
          <h2 className="mt-8 font-display text-lg font-medium">Update limits</h2>
          <p className="mt-1 text-sm text-muted">Enter amounts in taka. Changes affect new accounts only.</p>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const payload: Record<string, number> = {};
              if (fee) payload.transferFeeMinor = Math.round(Number(fee) * 100);
              if (review) payload.reviewThresholdMinor = Math.round(Number(review) * 100);
              if (staffLimit) payload.staffApprovalLimitMinor = Math.round(Number(staffLimit) * 100);
              if (Object.keys(payload).length) void update(payload);
              setFee(""); setReview(""); setStaffLimit("");
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Transfer fee (৳)
              <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Review threshold (৳)
              <input value={review} onChange={(e) => setReview(e.target.value)} inputMode="decimal" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Staff approval limit (৳)
              <input value={staffLimit} onChange={(e) => setStaffLimit(e.target.value)} inputMode="decimal" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary" isDisabled={result.isLoading || (!fee && !review && !staffLimit)}>
                Save settings
              </Button>
              {result.isSuccess && <p className="mt-2 text-sm text-success-soft-foreground">Settings updated.</p>}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
