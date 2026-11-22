import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { APP_TAGLINE } from "@/config/app";

function SampleComposition() {
  const bars = [42, 58, 35, 70, 52, 84];

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-white/15 bg-[var(--brand-hover)] p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-brand-foreground/70">Everyday savings</p>
            <p className="mt-1 font-display text-3xl font-medium tabular-nums text-brand-foreground">৳2,48,350.00</p>
          </div>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">Active</span>
        </div>
        <p className="mt-2 text-xs text-brand-foreground/70">Available ৳2,43,350.00 · On hold ৳5,000.00</p>

        <div className="mt-5 divide-y divide-white/10 rounded-xl border border-white/10 bg-[var(--brand)] p-3">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2">
            <span className="flex items-center gap-2 text-xs text-brand-foreground/85">
              <span className="grid size-7 place-items-center rounded-full bg-success-soft text-success-soft-foreground"><ArrowDownLeft className="size-3.5" /></span>
              Salary · Today
            </span>
            <span className="text-xs font-medium tabular-nums text-brand-foreground">+৳85,000.00</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-2 text-xs text-brand-foreground/85">
              <span className="grid size-7 place-items-center rounded-full bg-danger-soft text-danger-soft-foreground"><ArrowUpRight className="size-3.5" /></span>
              Transfer · Yesterday
            </span>
            <span className="text-xs font-medium tabular-nums text-brand-foreground">−৳4,500.00</span>
          </div>
        </div>

        <div className="mt-5 flex h-20 items-end gap-2">
          {bars.map((height, index) => (
            <div
              key={index}
              className={`flex-1 rounded-t ${index === bars.length - 1 ? "bg-accent" : "bg-white/25"}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-brand-foreground/60">Sample interface — not live account data</p>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="px-3 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand px-6 py-12 text-brand-foreground sm:px-10 sm:py-16 lg:px-14">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm text-brand-foreground/75">{APP_TAGLINE}</p>
            <h1 className="mt-3 max-w-xl font-display text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl lg:text-[64px]">
              Your money, kept <span className="relative whitespace-nowrap">safe
                <span aria-hidden="true" className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-accent" />
              </span> and moving.
            </h1>
            <p className="mt-6 max-w-md text-base text-brand-foreground/85">
              Open accounts, send money, request deposits, and manage loans in one simulated bank built to show every step of the process.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="button button--primary">Open an account</Link>
              <Link href="/login" className="button button--outline border-brand-foreground/40 text-brand-foreground">Sign in</Link>
            </div>
          </div>
          <SampleComposition />
        </div>
      </div>
    </section>
  );
}
