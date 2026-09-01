import { LayoutGrid, Tag } from "lucide-react";
import Link from "next/link";

export interface CategoryPill {
  id: string;
  name: string;
}

export interface CategoryPillsProps {
  activeCategoryId?: string | null;
  categories: CategoryPill[];
  search?: string;
  tenantSlug: string;
}

function buildShopHref(
  tenantSlug: string,
  categoryId: string | null,
  search?: string
): string {
  const params = new URLSearchParams();
  if (categoryId) {
    params.set("categoryId", categoryId);
  }
  if (search) {
    params.set("search", search);
  }
  const qs = params.toString();
  return `/${tenantSlug}/shop${qs ? `?${qs}` : ""}#catalog`;
}

export function CategoryPills({
  tenantSlug,
  categories,
  activeCategoryId,
  search,
}: CategoryPillsProps) {
  const isAllActive = !activeCategoryId;

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Kategoriler"
      className="flex flex-wrap items-center gap-2 py-1"
    >
      <Link
        aria-current={isAllActive ? "page" : undefined}
        className={
          isAllActive
            ? "inline-flex items-center gap-1.5 rounded-full bg-store-primary px-4 py-1.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm transition-colors hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            : "inline-flex items-center gap-1.5 rounded-full border border-store-border bg-store-muted px-4 py-1.5 font-medium text-store-ink text-xs transition-colors hover:bg-store-accent hover:text-store-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
        }
        href={buildShopHref(tenantSlug, null, search)}
      >
        <LayoutGrid
          aria-hidden="true"
          className="h-3.5 w-3.5"
          strokeWidth={1.5}
        />
        Tümü
      </Link>

      {categories.map((category) => {
        const isActive = activeCategoryId === category.id;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "inline-flex items-center gap-1.5 rounded-full bg-store-primary px-4 py-1.5 font-semibold text-store-primary-foreground text-xs shadow-store-sm transition-colors hover:bg-store-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
                : "inline-flex items-center gap-1.5 rounded-full border border-store-border bg-white px-4 py-1.5 font-medium text-store-ink text-xs transition-colors hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
            }
            href={buildShopHref(tenantSlug, category.id, search)}
            key={category.id}
          >
            <Tag aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
