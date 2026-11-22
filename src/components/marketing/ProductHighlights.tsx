import { Banknote, FileText, Repeat2, Wallet } from "lucide-react";

const highlights = [
  {
    icon: Repeat2,
    title: "Instant transfers",
    body: "Move money between your accounts or to another customer. Larger or unusual transfers are held for a quick review.",
  },
  {
    icon: Wallet,
    title: "Three kinds of accounts",
    body: "Savings, current, and business accounts each have their own limits and minimum balance.",
  },
  {
    icon: Banknote,
    title: "Loans with a clear schedule",
    body: "See your monthly installment, total interest, and full repayment plan before you apply.",
  },
  {
    icon: FileText,
    title: "Statements and receipts",
    body: "Download a dated statement or a receipt for any transaction in CSV or PDF format.",
  },
];

export function ProductHighlights() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="font-display text-3xl font-medium sm:text-4xl">Built for everyday banking</h2>
      <p className="mt-3 max-w-xl text-muted">The pieces you need to manage money, all in one place.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {highlights.map((item, index) => {
          const Icon = item.icon;
          const featured = index === 0;
          return (
            <article
              key={item.title}
              className={`card relative p-6 ${featured ? "md:row-span-2 md:flex md:flex-col md:justify-between md:bg-brand md:text-brand-foreground" : ""}`}
            >
              <div>
                <span className={`grid size-11 place-items-center rounded-2xl ${featured ? "bg-accent text-accent-foreground" : "bg-brand-soft text-brand-soft-foreground"}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className={`mt-5 font-display text-xl font-medium ${featured ? "text-brand-foreground" : ""}`}>{item.title}</h3>
                <p className={`mt-2 max-w-sm text-sm ${featured ? "text-brand-foreground/80" : "text-muted"}`}>{item.body}</p>
              </div>

              {featured && (
                <div aria-hidden="true" className="mt-8 rounded-2xl border border-white/15 bg-[var(--brand-hover)] p-4">
                  <div className="flex items-center justify-between text-xs text-brand-foreground/75">
                    <span>Review transfer</span><span>Step 2 of 2</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-brand-foreground/70">To</span><span>Ra*** Ud***</span></div>
                    <div className="flex justify-between"><span className="text-brand-foreground/70">Amount</span><span className="tabular-nums">৳15,000.00</span></div>
                    <div className="flex justify-between"><span className="text-brand-foreground/70">Fee</span><span className="tabular-nums">৳10.00</span></div>
                  </div>
                  <div className="mt-4 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-foreground">Send money</div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
