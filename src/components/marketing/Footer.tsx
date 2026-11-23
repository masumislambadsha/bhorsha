import Link from "next/link";
import { APP_NAME, SIMULATION_NOTICE } from "@/config/app";

export function Footer({ dashboardHref }: { dashboardHref: string | null }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="max-w-sm">
            <p className="font-display text-xl font-medium">{APP_NAME}</p>
            <p className="mt-3 text-sm text-muted">{SIMULATION_NOTICE}</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <a href="#features" className="text-muted hover:text-foreground">Features</a>
            <a href="#how-it-works" className="text-muted hover:text-foreground">How it works</a>
            <a href="#security" className="text-muted hover:text-foreground">Security</a>
            {dashboardHref ? <Link href={dashboardHref} className="text-muted hover:text-foreground">Go to dashboard</Link> : <Link href="/login" className="text-muted hover:text-foreground">Sign in</Link>}
            <Link href="/register" className="text-muted hover:text-foreground">Open account</Link>
          </nav>
        </div>
        <p className="mt-10 border-t border-separator pt-6 text-xs text-muted">© {new Date().getFullYear()} {APP_NAME}. Simulation only.</p>
      </div>
    </footer>
  );
}
