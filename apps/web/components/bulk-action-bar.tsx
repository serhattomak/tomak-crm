"use client";

import { Trash2, X } from "lucide-react";
import type React from "react";

interface BulkAction {
  /** Disabled olduğunda butonu devre dışı bırakır */
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  /** visual variant */
  variant?: "default" | "danger";
}

interface BulkActionBarProps {
  actions: BulkAction[];
  onClear: () => void;
  selectedCount: number;
}

/**
 * BulkActionBar — Liste sayfalarında seçim yapıldığında altta çıkan sticky bar.
 *
 * Kullanım:
 *   <BulkActionBar
 *     selectedCount={selectedIds.size}
 *     onClear={() => setSelectedIds(new Set())}
 *     actions={[
 *       { label: "Sil", icon: <Trash2 />, variant: "danger", onClick: handleBulkDelete },
 *       { label: "Pasife Al", onClick: handleBulkDeactivate },
 *     ]}
 *   />
 */
export function BulkActionBar({
  actions,
  onClear,
  selectedCount,
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-in items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-2xl duration-200">
      {/* Count badge */}
      <div className="flex items-center gap-2 border-border border-r pr-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 font-bold text-2xs text-white">
          {selectedCount}
        </span>
        <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
          {selectedCount === 1 ? "kayıt seçildi" : "kayıt seçildi"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold text-xs transition-all ${action.variant === "danger" ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60" : "border-border bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={action.disabled}
            key={action.label}
            onClick={action.onClick}
            type="button"
          >
            {action.icon && <span className="h-3.5 w-3.5">{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>

      {/* Clear selection */}
      <button
        aria-label="Seçimi temizle"
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        onClick={onClear}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Convenience: a Trash2 icon sized for action bar ─────────────────────────
export const BulkDeleteIcon = () => <Trash2 className="h-3.5 w-3.5" />;
