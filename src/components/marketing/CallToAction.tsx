import Link from "next/link";

export function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-soft p-8 sm:flex-row sm:items-center sm:p-12">
        <div>
          <h2 className="font-display text-2xl font-medium text-brand-soft-foreground sm:text-3xl">Ready to look around?</h2>
          <p className="mt-2 max-w-lg text-sm text-brand-soft-foreground/80">
            Create a customer profile in a minute, or sign in with one of the demo accounts to see each role.
          </p>
        </div>
        <Link href="/register" className="button button--primary shrink-0">Open an account</Link>
      </div>
    </section>
  );
}
