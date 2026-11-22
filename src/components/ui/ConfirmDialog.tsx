"use client";

import { Button } from "@heroui/react";
import { useEffect, useRef, type ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="w-[min(92vw,28rem)] rounded-2xl border border-border bg-overlay p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-medium">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
        {children}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onPress={onCancel} isDisabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onPress={onConfirm}
            isPending={isPending}
            isDisabled={confirmDisabled || isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
