"use client";

import { Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationCenter } from "@/components/notification-center";
import { TenantSwitcher } from "@/components/tenant-switcher";

interface DashboardHeaderProps {
  mounted: boolean;
  onOpenCommandPalette: () => void;
  onOpenMobileDrawer: () => void;
}

export function DashboardHeader({
  onOpenMobileDrawer,
  onOpenCommandPalette,
  mounted,
}: DashboardHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-border/80 border-b bg-background/95 px-3.5 py-2.5 backdrop-blur-md md:hidden print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-foreground shadow-2xs transition-all hover:bg-muted active:scale-95"
          onClick={onOpenMobileDrawer}
          title="Menüyü Aç"
          type="button"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
        <div className="min-w-0">
          <TenantSwitcher />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground active:scale-95"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          suppressHydrationWarning
          title={
            mounted && resolvedTheme === "dark" ? "Açık Tema" : "Koyu Tema"
          }
          type="button"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        <LanguageSwitcher variant="minimal" />
        <NotificationCenter buttonClassName="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground active:scale-95" />
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground active:scale-95"
          onClick={onOpenCommandPalette}
          title="Arama (⌘K veya /)"
          type="button"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
