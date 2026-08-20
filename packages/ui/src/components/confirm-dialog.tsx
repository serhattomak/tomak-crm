"use client";

import { cn } from "@workspace/ui/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import * as React from "react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
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
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <div className="flex items-start gap-4">
            {icon}
            <div className="flex-1">
              <AlertDialogPrimitive.Title className="text-base font-bold text-slate-900">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-2 text-xs leading-relaxed text-slate-600">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <AlertDialogPrimitive.Cancel asChild>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                {cancelText}
              </button>
            </AlertDialogPrimitive.Cancel>

            <AlertDialogPrimitive.Action asChild>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50",
                  variant === "destructive" &&
                    "bg-rose-600 hover:bg-rose-700",
                  variant === "warning" &&
                    "bg-amber-600 hover:bg-amber-700",
                  variant === "default" &&
                    "bg-blue-600 hover:bg-blue-700"
                )}
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
