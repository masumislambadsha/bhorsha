import { FileClock, Fingerprint, LockKeyhole, Scale, ShieldAlert, Waypoints } from "lucide-react";

const mechanisms = [
  { icon: Waypoints, title: "Atomic transfers", body: "Both balances and the ledger entries change in one database transaction, or not at all." },
  { icon: Fingerprint, title: "Transaction PIN", body: "Transfers and loan repayments need a salted scrypt PIN, with a lockout after repeated failures." },
  { icon: LockKeyhole, title: "Server-side access checks", body: "Every API route checks the session, the role, and account ownership before returning data." },
  { icon: FileClock, title: "Audit trail", body: "Staff and admin actions are recorded with the actor, reason, and time." },
  { icon: ShieldAlert, title: "Automatic risk checks", body: "Large, fast, or unusual transfers are flagged, and high-risk ones are held for review." },
  { icon: Scale, title: "Limits and minimum balances", body: "Per-transaction and daily limits are enforced on the server, never in the browser." },
];

export function Security() {
  return (
    <section id="security" className="bg-surface-secondary py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-3xl font-medium sm:text-4xl">How we keep things safe</h2>
        <p className="mt-3 max-w-2xl text-muted">
          These are mechanisms in the code, not badges on a page. Bhorsa is a simulation and moves no real money.
        </p>
        <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {mechanisms.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                  <Icon aria-hidden="true" className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
