"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useListAuditLogsQuery } from "@/features/admin/api";
import { formatDateTime } from "@/lib/time";
import { useAppSelector } from "@/store/hooks";

export default function AdminAuditLogPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListAuditLogsQuery({ ...(action ? { action } : {}), page, pageSize: 20 });
  if (role !== "admin") return null;

  return (
    <>
      <PageHeader title="Audit log" description="Every staff and admin action, append-only." />
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={action}
            onChange={(event) => { setAction(event.target.value); setPage(1); }}
            placeholder="Filter by action (e.g. LOAN_APPROVED)"
            className="min-w-64 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            aria-label="Filter by action"
          />
        </div>
        {isLoading ? <p className="text-sm text-muted">Loading…</p> : (
          <ul className="divide-y divide-separator">
            {(data?.items ?? []).map((entry) => (
              <li key={entry.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium">{entry.action}</span>
                  <span className="text-xs text-muted">{formatDateTime(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{entry.summary}</p>
                <p className="mt-1 text-xs text-muted">{entry.actorRole ?? "system"} · {entry.entityType}{entry.reason ? ` · ${entry.reason}` : ""}</p>
              </li>
            ))}
            {(data?.items ?? []).length === 0 && <li className="py-3 text-sm text-muted">No audit entries match this filter.</li>}
          </ul>
        )}
        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-link disabled:opacity-40">Previous</button>
            <span className="text-muted">Page {page} of {data.totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="text-link disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
