"use client";

import type { AppRole } from "@/lib/domain";
import { useAppSelector } from "@/store/hooks";
import { SignOutButton } from "./SignOutButton";

function settingsHref(role: AppRole): string | null {
  if (role === "customer") return "/customer/settings";
  if (role === "staff") return "/staff/settings";
  if (role === "admin") return "/admin/settings";
  return null;
}

export function UserMenu() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  const href = settingsHref(user.role);
  return (
    <details className="relative">
      <summary className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate">{user.name}</span>
      </summary>
      <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-sm">
        <div className="px-2 py-2">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted">{user.role}</p>
        </div>
        <div className="mt-1 flex flex-col gap-1 border-t border-separator pt-1">
          {href && (
            <a href={href} className="rounded-lg px-2 py-2 text-sm text-foreground hover:bg-surface-secondary">
              Settings
            </a>
          )}
          <SignOutButton />
        </div>
      </div>
    </details>
  );
}
