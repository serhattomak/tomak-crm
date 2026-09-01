import { cn } from "@workspace/ui/lib/utils";

type StockStatus =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "unknown"
  | "not-tracked";

export interface StockIndicatorProps {
  className?: string;
  lowThreshold?: number;
  stock?: number | null;
  trackInventory?: boolean;
}

function resolveStatus(
  stock: number | null | undefined,
  trackInventory: boolean,
  lowThreshold: number
): { label: string; status: StockStatus } {
  if (!trackInventory) {
    return { label: "Stok takibi yok", status: "not-tracked" };
  }
  if (stock === null || stock === undefined) {
    return { label: "Stok bilgisi yok", status: "unknown" };
  }
  if (stock <= 0) {
    return { label: "Stokta yok", status: "out-of-stock" };
  }
  if (stock <= lowThreshold) {
    return { label: `Az stok: ${stock} adet kaldı`, status: "low-stock" };
  }
  return {
    label: `Stokta var${stock > lowThreshold ? ` · ${stock} adet` : ""}`,
    status: "in-stock",
  };
}

const statusClasses: Record<StockStatus, string> = {
  "in-stock":
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  "low-stock":
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  "not-tracked": "bg-store-muted text-store-muted-foreground ring-store-border",
  "out-of-stock":
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
  unknown: "bg-store-muted text-store-muted-foreground ring-store-border",
};

const dotClasses: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-500",
  "low-stock": "bg-amber-500",
  "not-tracked": "bg-store-muted-foreground",
  "out-of-stock": "bg-red-500",
  unknown: "bg-store-muted-foreground",
};

export function StockIndicator({
  className,
  lowThreshold = 5,
  stock,
  trackInventory = true,
}: StockIndicatorProps) {
  const { label, status } = resolveStatus(stock, trackInventory, lowThreshold);

  return (
    <span
      aria-label={label}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs ring-1 ring-inset transition-colors duration-200",
        statusClasses[status],
        className
      )}
      role="status"
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClasses[status])}
      />
      {label}
    </span>
  );
}
