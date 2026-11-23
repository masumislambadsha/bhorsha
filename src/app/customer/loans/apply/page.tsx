"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { AmountInput } from "@/components/ui/AmountInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useGetLoanProductsQuery, useApplyForLoanMutation } from "@/features/loans/api";
import { useListAccountsQuery } from "@/features/accounts/api";
import { useRouter } from "next/navigation";
import { emiOf } from "@/lib/emi";
import { toMinor, formatBDT } from "@/lib/money";
import { groupAccountNumber } from "@/lib/mask";

function safeParseMinor(value: string): number {
  try {
    return toMinor(value.trim());
  } catch {
    return 0;
  }
}

export default function CustomerApplyLoanPage() {
  const router = useRouter();
  const { data: products } = useGetLoanProductsQuery();
  const { data: accountsData } = useListAccountsQuery(undefined);
  const accounts = accountsData?.items ?? [];
  const [loanType, setLoanType] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("salaried");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [apply, applyResult] = useApplyForLoanMutation();

  const product = products?.find((p) => p.loanType === loanType);
  const durationValue = duration ? Number(duration) : product ? product.product.minMonths : 0;
  const amountMinor = useMemo(() => {
    try { return amount ? toMinor(amount.trim()) : 0; } catch { return 0; }
  }, [amount]);
  const previewEmi = product ? emiOf(amountMinor, product.product.annualRateBps, durationValue) : 0;
  const incomeMinor = monthlyIncome ? safeParseMinor(monthlyIncome) : 0;
  const dti = monthlyIncome && incomeMinor > 0 ? (previewEmi / incomeMinor) * 100 : 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const outcome = await apply({
      loanType: product?.loanType ?? "",
      amount: amount.trim(),
      durationMonths: durationValue,
      monthlyIncome: monthlyIncome.trim(),
      employmentStatus,
      description: description.trim(),
      disbursementAccountId: accountId,
    });
    if ("error" in outcome) {
      setError(outcome.error?.message ?? "Application failed.");
      return;
    }
    router.push(`/customer/loans/${outcome.data?.id ?? ""}`);
  }

  const months = product ? Array.from({ length: product.product.maxMonths - product.product.minMonths + 1 }, (_, i) => product.product.minMonths + i) : [];

  return (
    <>
      <PageHeader title="Apply for a loan" description="Choose a product, enter details and see your EMI" />
      <form onSubmit={handleSubmit} className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Loan type</span>
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              aria-label="Loan type"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            >
              <option value="">Select a product</option>
              {(products ?? []).map((p) => (
                <option key={p.loanType} value={p.loanType}>
                  {p.loanType === "personal" ? "Personal" : p.loanType === "home" ? "Home" : p.loanType === "car" ? "Car" : p.loanType === "education" ? "Education" : p.loanType === "business" ? "Business" : p.loanType}
                  {` · ${formatBDT(p.product.maxPrincipalMinor)} max`}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Amount (৳)</span>
            <AmountInput value={amount} onValueChange={setAmount} aria-label="Amount" placeholder="0.00" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Duration (months)</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              aria-label="Duration"
              disabled={!product}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none disabled:opacity-60"
            >
              <option value="">Select</option>
              {months.map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Monthly income (৳)</span>
            <AmountInput value={monthlyIncome} onValueChange={setMonthlyIncome} aria-label="Monthly income" placeholder="0.00" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Employment status</span>
            <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} aria-label="Employment status" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none">
              <option value="salaried">Salaried</option>
              <option value="self_employed">Self-employed</option>
              <option value="business_owner">Business owner</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
              <option value="unemployed">Unemployed</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Disbursement account</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Disbursement account" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none">
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.nickname} · {groupAccountNumber(a.accountNumber)}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} aria-label="Description" maxLength={500} rows={3} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none" />
        </label>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-brand-soft-foreground bg-brand-soft px-3 py-2.5">
            <p className="text-xs text-muted">Estimated EMI</p>
            <p className="text-sm font-medium text-brand-soft-foreground">{previewEmi > 0 ? formatBDT(previewEmi) : "—"}</p>
          </div>
          <div className="rounded-xl border border-brand-soft-foreground bg-brand-soft px-3 py-2.5">
            <p className="text-xs text-muted">Debt-to-income</p>
            <p className="text-sm font-medium text-brand-soft-foreground">{dti > 0 ? `${dti.toFixed(1)}%` : "—"}</p>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-danger-soft-foreground bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{error}</p>}
        <div className="mt-5">
          <Button type="submit" variant="primary" isPending={applyResult.status === "pending"} isDisabled={applyResult.status === "pending" || !loanType || !amount || !duration || !accountId}>Submit application</Button>
        </div>
      </form>
      {(products ?? []).length === 0 && (
        <EmptyState title="No loan products" description="Loan products are configured by the bank." />
      )}
    </>
  );
}
