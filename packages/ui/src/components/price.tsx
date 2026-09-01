import { cn } from "@workspace/ui/lib/utils"

type PriceSize = "sm" | "default" | "lg"

export interface PriceProps {
  className?: string
  compareAtPrice?: number | null
  currency?: string
  price: number
  showCurrencyLabel?: boolean
  showDiscountBadge?: boolean
  size?: PriceSize
}

const sizeClasses: Record<
  PriceSize,
  { compare: string; discount: string; price: string }
> = {
  default: {
    compare: "text-sm",
    discount: "text-[11px]",
    price: "text-xl",
  },
  lg: {
    compare: "text-base",
    discount: "text-xs",
    price: "text-2xl",
  },
  sm: {
    compare: "text-xs",
    discount: "text-[10px]",
    price: "text-base",
  },
}

function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", {
      currency,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(value)
  } catch {
    return `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
  }
}

function getDiscountPercent(
  price: number,
  compareAtPrice: number
): number | null {
  if (compareAtPrice <= 0 || price >= compareAtPrice) {
    return null
  }
  const percent = Math.round((1 - price / compareAtPrice) * 100)
  return percent > 0 ? percent : null
}

export function Price({
  className,
  compareAtPrice,
  currency = "TRY",
  price,
  showCurrencyLabel = false,
  showDiscountBadge = true,
  size = "default",
}: PriceProps) {
  const hasCompare =
    typeof compareAtPrice === "number" && compareAtPrice > price
  const discountPercent = hasCompare
    ? getDiscountPercent(price, compareAtPrice as number)
    : null
  const sizeClass = sizeClasses[size]

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          "font-extrabold tracking-tight text-store-surface-foreground",
          sizeClass.price
        )}
      >
        {formatPrice(price, currency)}
      </span>

      {hasCompare ? (
        <span
          aria-label={`Eski fiyat ${formatPrice(compareAtPrice as number, currency)}`}
          className={cn(
            "text-store-muted-foreground line-through",
            sizeClass.compare
          )}
        >
          {formatPrice(compareAtPrice as number, currency)}
        </span>
      ) : null}

      {showCurrencyLabel ? (
        <span className="text-xs text-store-muted-foreground">
          · {currency}
        </span>
      ) : null}

      {showDiscountBadge && discountPercent ? (
        <span
          aria-label={`%${discountPercent} indirim`}
          className={cn(
            "inline-flex items-center rounded-store-sm bg-store-primary px-1.5 py-0.5 font-semibold text-store-primary-foreground",
            sizeClass.discount
          )}
        >
          %{discountPercent} indirim
        </span>
      ) : null}
    </div>
  )
}
