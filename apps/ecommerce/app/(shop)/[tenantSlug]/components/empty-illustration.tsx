"use client";

import { ArrowRight, Package, SearchX, ShoppingBag } from "lucide-react";
import Link from "next/link";

export type EmptyIllustrationVariant = "cart" | "orders" | "search" | "generic";

export interface EmptyIllustrationProps {
  actionHref?: string;
  actionLabel?: string;
  description?: string;
  tenantSlug?: string;
  title?: string;
  variant?: EmptyIllustrationVariant;
}

const variantCopy: Record<
  EmptyIllustrationVariant,
  { description: string; title: string }
> = {
  cart: {
    description:
      "Sepetiniz henüz boş. Editoryal seçkiden ürünler ekleyin, mercan vurgulu koleksiyonu keşfedin.",
    title: "Sepet boş",
  },
  generic: {
    description:
      "Henüz içerik yok. Warm stone zemin üzerinde minimal editorial illüstrasyon.",
    title: "Henüz içerik yok",
  },
  orders: {
    description:
      "Henüz siparişiniz bulunmuyor. İlk siparişinizi verin, takip ve destek burada görünecek.",
    title: "Henüz sipariş yok",
  },
  search: {
    description:
      "Aramanız için sonuç bulunamadı. Filtreleri temizleyin veya farklı anahtar kelime deneyin.",
    title: "Sonuç bulunamadı",
  },
};

export function EmptyIllustration({
  actionHref,
  actionLabel,
  description,
  tenantSlug,
  title,
  variant = "cart",
}: EmptyIllustrationProps) {
  const copy = variantCopy[variant];
  const displayTitle = title ?? copy.title;
  const displayDescription = description ?? copy.description;
  const displayHref =
    actionHref ??
    (tenantSlug ? `/${tenantSlug}/shop` : "/") +
      (variant === "cart" ? "#catalog" : "");
  const displayAction = actionLabel ?? "Mağazaya dön";

  function renderVariantIcon() {
    if (variant === "cart") {
      return (
        <ShoppingBag
          aria-hidden="true"
          className="h-8 w-8 text-store-primary sm:h-9 sm:w-9"
          strokeWidth={1.5}
        />
      );
    }
    if (variant === "search") {
      return (
        <SearchX
          aria-hidden="true"
          className="h-8 w-8 text-store-primary sm:h-9 sm:w-9"
          strokeWidth={1.5}
        />
      );
    }
    return (
      <Package
        aria-hidden="true"
        className="h-8 w-8 text-store-primary sm:h-9 sm:w-9"
        strokeWidth={1.5}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-[1rem] border border-store-border bg-white px-6 py-10 text-center shadow-store-sm transition-all duration-200 sm:px-8 sm:py-12">
      {/* Editorial illustration — warm stone + mercan oklch only */}
      <div
        aria-hidden="true"
        className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
      >
        {/* soft stone circle */}
        <span className="absolute inset-0 rounded-full bg-store-muted" />
        {/* accent ring */}
        <span className="absolute inset-2 rounded-full border border-store-border bg-white/60 backdrop-blur-sm" />
        {/* inner illustration */}
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-store-primary/10 sm:h-20 sm:w-20">
          {renderVariantIcon()}
        </span>
        {/* decorative dots — oklch only via store tokens */}
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-store-primary opacity-80" />
        <span className="absolute -bottom-0.5 -left-1 h-2 w-2 rounded-full bg-store-accent-foreground/20" />
        <span className="absolute top-6 -left-2 h-1.5 w-1.5 rounded-full bg-store-border" />
      </div>

      {/* typographic block — serif title, sans body */}
      <div className="space-y-2">
        <h3 className="font-normal font-serif text-2xl text-store-ink tracking-tight">
          {displayTitle}
        </h3>
        <p className="mx-auto max-w-md text-sm text-store-muted-foreground leading-relaxed">
          {displayDescription}
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-store-primary px-5 py-2.5 font-semibold text-sm text-store-primary-foreground shadow-store-sm transition-all duration-200 hover:bg-store-primary/90 hover:shadow-store focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          href={displayHref}
        >
          {displayAction}
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={1.5}
          />
        </Link>
        {tenantSlug && variant !== "generic" ? (
          <Link
            className="inline-flex items-center rounded-full border border-store-border bg-white px-4 py-2 font-medium text-store-ink text-xs transition-all duration-200 hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            href={`/${tenantSlug}/shop`}
          >
            Katalog
          </Link>
        ) : null}
      </div>

      {/* subtle mono footnote */}
      {tenantSlug ? (
        <p className="font-mono text-[11px] text-store-muted-foreground/70">
          {tenantSlug} · oklch mercan editorial
        </p>
      ) : null}
    </div>
  );
}
