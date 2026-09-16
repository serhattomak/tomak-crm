"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";

export function LanguageSwitcher({
  currentLocale: propLocale,
  variant = "pill",
}: {
  currentLocale?: string;
  variant?: "pill" | "select" | "minimal";
}) {
  const router = useRouter();
  const nextIntlLocale = useLocale();
  const activeLocale = (propLocale || nextIntlLocale || "tr").toLowerCase();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: "tr" | "en") => {
    if (newLocale === activeLocale) {
      return;
    }
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
      window.location.reload();
    });
  };

  if (variant === "minimal") {
    return (
      <button
        aria-label="Dili Değiştir / Switch Language"
        className="flex items-center gap-1.5 rounded-xl border border-border bg-zinc-50 px-2.5 py-1.5 font-bold text-2xs text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        disabled={isPending}
        onClick={() => switchLocale(activeLocale === "tr" ? "en" : "tr")}
        type="button"
      >
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="uppercase">{activeLocale}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center rounded-xl border border-border bg-zinc-100/80 p-0.5 dark:bg-zinc-900">
      <button
        className={`rounded-lg px-2.5 py-1 font-bold text-2xs transition-all ${activeLocale === "tr" ? "bg-card text-zinc-900 shadow-2xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
        disabled={isPending}
        onClick={() => switchLocale("tr")}
        type="button"
      >
        TR
      </button>
      <button
        className={`rounded-lg px-2.5 py-1 font-bold text-2xs transition-all ${activeLocale === "en" ? "bg-card text-zinc-900 shadow-2xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
        disabled={isPending}
        onClick={() => switchLocale("en")}
        type="button"
      >
        EN
      </button>
    </div>
  );
}
