"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <button
      aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-store-border bg-white text-store-ink transition-colors hover:bg-store-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-ring"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <Moon aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
      )}
    </button>
  );
}

export default ThemeToggle;
