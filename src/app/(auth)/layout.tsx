import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { APP_NAME, SIMULATION_NOTICE } from "@/config/app";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label={`${APP_NAME} home`} className="rounded-lg"><Logo /></Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-muted">{SIMULATION_NOTICE}</p>
        </div>
      </div>
    </main>
  );
}
