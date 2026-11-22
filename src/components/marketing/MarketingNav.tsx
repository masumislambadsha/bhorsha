"use client";

import { Button } from "@heroui/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Main navigation">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Bhorsa home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className="button button--ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/register" className="button button--primary">
            Open account
          </Link>
          <Button
            variant="ghost"
            isIconOnly
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="md:hidden"
            onPress={() => setOpen(!open)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </Button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-secondary"
              >
                {link.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-secondary">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
