"use client";

import { cn } from "@workspace/ui/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import * as React from "react";

export interface ConfirmDialogProps {
  cancelText?: string;
  confirmText?: string;
  description: string;
  loading?: boolean;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  variant?: "destructive" | "warning" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "Vazgeç",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const icon = React.useMemo(() => {
    if (variant === "destructive") {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <AlertCircle className="h-5 w-5" />
        </div>
      );
    }
    if (variant === "warning") {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    );
  }, [variant]);

  return (
    <AlertDialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 animate-in bg-black/60 backdrop-blur-xs data-[state=closed]:animate-out" />
        <AlertDialogPrimitive.Content className="fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-in overflow-hidden rounded-xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md data-[state=closed]:animate-out">
          <div className="flex items-start gap-4">
            {icon}
            <div className="flex-1">
              <AlertDialogPrimitive.Title className="font-bold text-base text-foreground">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-2 text-muted-foreground text-xs leading-relaxed">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
            <button
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={handleCancel}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <AlertDialogPrimitive.Cancel asChild>
              <button
                className="rounded-lg border border-border bg-card px-4 py-2 font-semibold text-foreground text-xs transition-colors hover:bg-muted disabled:opacity-50"
                disabled={loading}
                onClick={handleCancel}
                type="button"
              >
                {cancelText}
              </button>
            </AlertDialogPrimitive.Cancel>

            <AlertDialogPrimitive.Action asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50",
                  variant === "destructive" &&
                    "bg-rose-600 hover:bg-rose-700 dark:hover:bg-rose-500",
                  variant === "warning" &&
                    "bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500",
                  variant === "default" && "bg-primary hover:bg-primary/90"
                )}
                disabled={loading}
                onClick={handleConfirm}
                type="button"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmText}
              </button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
