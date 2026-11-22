import { BadgeCheck, Banknote, Clock3, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

function TransferPreview() {
  return (
    <div className="card w-full max-w-sm p-5">
      <p className="text-sm font-medium">Transfer review</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted">To</dt><dd>Ra*** Ud***</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Amount</dt><dd className="amount">৳15,000.00</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Fee</dt><dd className="amount">৳10.00</dd></div>
        <div className="flex justify-between gap-4 border-t border-separator pt-2"><dt className="font-medium">Total</dt><dd className="amount font-medium">৳15,010.00</dd></div>
      </dl>
      <div className="mt-4 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent-soft-foreground">Held for review above ৳5,00,000.00</div>
    </div>
  );
}

function EmiPreview() {
  return (
    <div className="card w-full max-w-sm p-5">
      <p className="text-sm font-medium">Monthly installment</p>
      <p className="amount mt-2 font-display text-3xl font-medium">৳8,924.00</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-tertiary">
        <div className="h-full w-3/5 rounded-full bg-chart-1" />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted"><span>18 of 30 paid</span><span className="amount">৳1,78,480.00 left</span></div>
    </div>
  );
}

function BadgePreview() {
  return (
    <div className="card flex w-full max-w-sm flex-wrap gap-2 p-5">
      <StatusBadge kind="kyc:verified" />
      <StatusBadge kind="loan:under_review" />
      <StatusBadge kind="account:frozen" />
      <StatusBadge kind="transaction:reversed" />
    </div>
  );
}

const rows = [
  {
    title: "Transfers you can follow",
    body: "Check the recipient, fee, and balance after before you send. Every transfer records both sides and a reference you can search later.",
    icon: ShieldCheck,
    preview: <TransferPreview />,
  },
  {
    title: "Repayments without surprises",
    body: "The repayment schedule is built when your loan is disbursed. You always see the remaining principal and the next due date.",
    icon: Banknote,
    preview: <EmiPreview />,
  },
  {
    title: "A clear status for everything",
    body: "Requests, flags, accounts, and loans each carry a plain-language status, so you know what happened and what comes next.",
    icon: BadgeCheck,
    preview: <BadgePreview />,
  },
];

export function CoreFeatures() {
  return (
    <section className="bg-surface-secondary py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-3xl font-medium sm:text-4xl">The details that matter</h2>
        <div className="mt-12 space-y-16">
          {rows.map((row, index) => {
            const Icon = row.icon;
            return (
              <div key={row.title} className={`grid items-center gap-10 lg:grid-cols-2 ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div>
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-medium">{row.title}</h3>
                  <p className="mt-3 max-w-md text-muted">{row.body}</p>
                </div>
                <div className="flex justify-center lg:justify-end">{row.preview}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-14 flex items-center gap-2 text-xs text-muted"><Clock3 aria-hidden="true" className="size-4" /> All times shown in Asia/Dhaka.</p>
      </div>
    </section>
  );
}
