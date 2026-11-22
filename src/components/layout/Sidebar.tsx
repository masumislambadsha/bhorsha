"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/domain";
import { Logo } from "@/components/ui/Logo";
import { useAppSelector } from "@/store/hooks";
import { ADMIN_NAV, CUSTOMER_NAV, STAFF_NAV } from "@/store/nav";
import { UserCard } from "./UserCard";

function RoleChip({ role }: { role: AppRole }) {
  return (
    <span className="rounded-full bg-accent-soft px-3 py-1 text-center text-xs font-medium text-accent-soft-foreground">
      {role}
    </span>
  );
}

export function Sidebar() {
  const role = useAppSelector((s) => s.auth.user?.role ?? "customer");
  const pathname = usePathname();
  const nav = role === "staff" ? STAFF_NAV : role === "admin" ? ADMIN_NAV : CUSTOMER_NAV;
  const home = role === "staff" ? "/staff" : role === "admin" ? "/admin" : "/customer";

  return (
    <nav
      aria-label="Main navigation"
      className="fixed left-0 top-0 z-20 hidden md:flex h-dvh w-[264px] flex-col justify-between border-r border-brand bg-brand px-4 py-6 md:w-14 lg:w-[264px]"
    >
      <div className="flex flex-col gap-6">
        <Link href={home} className="flex items-center justify-center px-3">
          <Logo compact />
        </Link>
        <RoleChip role={role} />
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
                    active
                      ? "bg-brand-hover border-l-2 border-accent font-medium text-brand"
                      : "text-brand-foreground hover:bg-brand-hover"
                  }`}
                >
                  <item.icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <UserCard />
    </nav>
  );
}
