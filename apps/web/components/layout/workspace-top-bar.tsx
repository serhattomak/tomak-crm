"use client";

import { ArrowLeft, Keyboard, PanelLeft, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationCenter } from "@/components/notification-center";
import type { NavItem } from "./nav-config";

interface WorkspaceTopBarProps {
  collapsed: boolean;
  hubName: string;
  items: NavItem[];
  onOpenCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
  onToggleCollapse: () => void;
}

/**
 * Workspace chrome above the page scroll area — shell spec §4. Global
 * navigation only: breadcrumb, command search, notifications. Page-level
 * actions stay in `PageHeader` so the two never compete.
 */
export function WorkspaceTopBar({
  collapsed,
  hubName,
  items,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onToggleCollapse,
}: WorkspaceTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeItem = items.find((item) => {
    const href = item.href.split("?")[0] ?? item.href;
    if (item.exact) {
      return pathname === href;
    }
    return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
  });

  const ActiveIcon = activeItem?.icon;

  return (
    <header
      className="hidden h-[54px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-border border-b px-3 md:grid print:hidden"
      data-slot="workspace-top-bar"
    >
      <div className="flex min-w-0 items-center gap-1">
        {collapsed ? (
          <button
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onToggleCollapse}
            title="Menüyü aç"
            type="button"
          >
            <PanelLeft className="size-4" />
          </button>
        ) : null}
        <button
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => router.back()}
          title="Geri"
          type="button"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <span className="truncate font-medium text-muted-foreground">
            {hubName}
          </span>
          <span className="text-muted-foreground/50">/</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded bg-accent-soft text-accent-foreground">
              {ActiveIcon ? <ActiveIcon className="size-3" /> : null}
            </span>
            <b className="truncate font-semibold text-foreground">
              {activeItem?.name ?? ""}
            </b>
          </span>
        </div>
      </div>

      <button
        className="hidden h-8 w-64 items-center gap-2 rounded-lg bg-muted px-2.5 text-2xs text-muted-foreground transition-colors hover:text-foreground lg:flex xl:w-80"
        onClick={onOpenCommandPalette}
        type="button"
      >
        <Search className="size-3.5" />
        <span>Ara veya komut çalıştır</span>
        <kbd className="ml-auto rounded border border-border bg-card px-1 py-0.5 font-sans text-3xs">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center justify-self-end">
        <NotificationCenter buttonClassName="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" />
        <button
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onOpenShortcutsHelp}
          title="Kısayollar (?)"
          type="button"
        >
          <Keyboard className="size-4" />
        </button>
      </div>
    </header>
  );
}
