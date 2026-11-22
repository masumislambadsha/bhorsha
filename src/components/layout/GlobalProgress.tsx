"use client";

import { useAppSelector } from "@/store/hooks";

/** Thin top progress bar while queries are in flight (width ∝ pending count). */
export function GlobalProgress() {
  const pending = useAppSelector((state) => state.ui.pendingRequests);
  if (pending === 0) return null;
  const width = Math.min(100, Math.max(0, pending * 25));
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-[2px] bg-brand"
    >
      <div
        className="h-full rounded-t-[1px] bg-accent"
        style={{ width: `${width}%`, transition: "width 0.25s ease-out" }}
      />
    </div>
  );
}
