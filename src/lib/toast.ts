/**
 * Tiny client-side toast emitter.
 *
 * Redux actions can't use React context, so `errorMiddleware` publishes through
 * this module and `ToastStack` subscribes.
 */
import { useSyncExternalStore } from "react";

export type ToastVariant = "success" | "warning" | "error" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let nextId = 0;

function emit(): void {
  for (const listener of listeners) listener();
}

export function showToast(message: string, variant: ToastVariant = "error"): void {
  if (!message) return;
  toasts = [...toasts.slice(-7), { id: `toast-${++nextId}-${Date.now()}`, variant, message }];
  emit();
}

export function removeToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): Toast[] {
  const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  };
  return useSyncExternalStore(subscribe, () => toasts);
}
