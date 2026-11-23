"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log metadata only — never render stack traces to the user.
    console.error(`[app] ${error.message}`);
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-[28px] font-medium">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">
        The page could not be loaded. Try again, or go back to your workspace.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
        >
          Try again
        </button>
        <Link href="/" className="rounded-full border border-border px-5 py-2 text-sm">Go home</Link>
      </div>
    </main>
  );
}
