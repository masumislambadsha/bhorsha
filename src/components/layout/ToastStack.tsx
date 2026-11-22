"use client";

import { useEffect } from "react";
import { removeToast, useToasts, type ToastVariant } from "@/lib/toast";

const variantClass: Record<ToastVariant, string> = {
  error: "border-danger-soft bg-danger-soft text-danger-soft-foreground",
  warning: "border-warning-soft bg-warning-soft text-warning-soft-foreground",
  success: "border-success-soft bg-success-soft text-success-soft-foreground",
  info: "border-info-soft bg-info-soft text-info-foreground",
};

export function ToastStack() {
  const toasts = useToasts();

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => removeToast(t.id), 4000));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [toasts]);

  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-sm pointer-events-auto ${variantClass[t.variant]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
