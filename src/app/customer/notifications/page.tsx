"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/time";
import { useMarkNotificationsReadMutation, useNotificationsListQuery } from "@/features/notifications/api";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const { data, isLoading, refetch } = useNotificationsListQuery();
  const [markRead, result] = useMarkNotificationsReadMutation();
  const all = data ?? [];
  const items = filter === "all" ? all : all.filter((item) => (filter === "unread") === (item.readAt === null));

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your money and requests."
        actions={
          <Button variant="ghost" isPending={result.isLoading} onPress={() => void markRead({ all: true }).then(() => refetch())}>
            Mark all as read
          </Button>
        }
      />
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Notification filter">
        {(["all", "unread", "read"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize ${filter === key ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted"}`}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="card p-5">
        {isLoading ? <p className="text-sm text-muted">Loading notifications…</p> : items.length === 0 ? (
          <EmptyState title="Nothing here" description="Updates will show up here as your banking activity happens." />
        ) : (
          <ul className="divide-y divide-separator">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}{!item.readAt && <span className="ml-2 inline-block size-2 rounded-full bg-accent" aria-label="Unread" />}</p>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {item.link && <Link href={item.link} className="text-sm text-link hover:underline">Open</Link>}
                  {!item.readAt && (
                    <button type="button" className="text-sm text-link hover:underline" onClick={() => void markRead({ ids: [item.id] }).then(() => refetch())}>
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
