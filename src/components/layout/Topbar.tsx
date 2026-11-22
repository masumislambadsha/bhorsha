"use client";

import type { AppRole } from "@/lib/domain";
import { AccountSwitcher } from "./AccountSwitcher";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function Topbar({ title, role }: { title: string; role: AppRole }) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-separator bg-surface px-4 py-4 md:px-8">
      <h1 className="flex-none font-display text-2xl font-medium">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {role === "customer" && <AccountSwitcher />}
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </div>
  );
}
