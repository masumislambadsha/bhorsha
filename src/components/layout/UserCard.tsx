"use client";

import { useAppSelector } from "@/store/hooks";
import { SignOutButton } from "./SignOutButton";

export function UserCard() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-brand-hover px-3 pt-4">
      <div className="flex items-center gap-3 px-1">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-brand-foreground">{user.name}</p>
          <p className="truncate text-xs text-brand-foreground/80">{user.role}</p>
        </div>
      </div>
      <SignOutButton />
    </div>
  );
}
