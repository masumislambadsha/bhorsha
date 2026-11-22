"use client";

import { Bell } from "lucide-react";
import { useUnreadCountQuery } from "@/features/notifications/api";

export function NotificationBell() {
  const { data: count = 0 } = useUnreadCountQuery(undefined, { pollingInterval: 30_000, refetchOnFocus: true });
  return (
    <button
      type="button"
      aria-label={count > 0 ? `Notifications — ${count} unread` : "Notifications"}
      className="relative rounded-xl border border-border bg-surface p-2.5"
    >
      <Bell aria-hidden="true" className="size-5 text-foreground" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 min-w-4 rounded-full bg-danger-soft px-1 text-center text-[11px] font-semibold text-danger-soft-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
