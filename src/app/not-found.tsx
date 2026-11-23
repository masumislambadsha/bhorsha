import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-[28px] font-medium">Page not found</h1>
      <p className="mt-3 text-sm text-muted">That page does not exist, or you do not have access to it.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground">
        Go home
      </Link>
    </main>
  );
}
