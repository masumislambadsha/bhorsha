"use client";

import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartTable } from "./ChartTable";

export function ChartCard({
  title,
  subtitle,
  chart,
  table,
  empty = false,
  emptyTitle = "No data for this period",
  emptyDescription = "Activity will appear here once there is data to show.",
  children,
}: {
  title: string;
  subtitle?: string;
  chart: ReactNode;
  table: { columns: string[]; rows: (string | number)[][] };
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section className="card flex min-h-72 flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {children}
          <button
            type="button"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            aria-pressed={view === "table"}
          >
            {view === "chart" ? "View as table" : "View as chart"}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {empty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : view === "chart" ? (
          chart
        ) : (
          <ChartTable columns={table.columns} rows={table.rows} />
        )}
      </div>
    </section>
  );
}
