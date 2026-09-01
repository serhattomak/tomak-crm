import { cn } from "@workspace/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export interface BreadcrumbsProps {
  className?: string;
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

export interface BreadcrumbJsonLd {
  "@context": string;
  "@type": string;
  itemListElement: {
    "@type": string;
    item: string;
    name: string;
    position: number;
  }[];
}

/**
 * Build BreadcrumbList JSON-LD payload.
 * Caller should render it via a <script type="application/ld+json"> in the page (server component).
 * This helper avoids dangerouslySetInnerHTML inside the primitive itself.
 */
export function getBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  origin?: string
): BreadcrumbJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: item.href ? (origin ? `${origin}${item.href}` : item.href) : "",
      name: item.label,
      position: index + 1,
    })),
  };
}

export function Breadcrumbs({ className, items, separator }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-store-muted-foreground text-xs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content =
            item.href && !isLast ? (
              <Link
                className="rounded-store-sm px-1 py-0.5 font-medium text-store-muted-foreground transition-colors hover:bg-store-muted hover:text-store-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cn(
                  "px-1 py-0.5",
                  isLast
                    ? "font-semibold text-store-surface-foreground"
                    : "font-medium"
                )}
              >
                {item.label}
              </span>
            );

          return (
            <li
              className="inline-flex items-center gap-1"
              key={`${item.label}-${index}`}
            >
              {content}
              {isLast ? null : (
                <span
                  aria-hidden="true"
                  className="text-store-muted-foreground/60"
                >
                  {separator ?? <ChevronRight className="h-3.5 w-3.5" />}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
