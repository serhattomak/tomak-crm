"use client";

import { useTheme } from "next-themes";
import type * as React from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      className="toaster group"
      theme={theme as ToasterProps["theme"]}
      toastOptions={{
        classNames: {
          actionButton:
            "group-[.toast]:bg-slate-900 group-[.toast]:text-white dark:group-[.toast]:bg-slate-100 dark:group-[.toast]:text-slate-900 rounded-xl text-xs font-semibold",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-300 rounded-xl text-xs font-semibold",
          description:
            "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 text-xs",
          error:
            "group-[.toaster]:border-rose-200/80 group-[.toaster]:bg-rose-50/90 text-rose-950 dark:group-[.toaster]:bg-rose-950/40 dark:group-[.toaster]:text-rose-200 dark:group-[.toaster]:border-rose-900/60",
          info: "group-[.toaster]:border-blue-200/80 group-[.toaster]:bg-blue-50/90 text-blue-950 dark:group-[.toaster]:bg-blue-950/40 dark:group-[.toaster]:text-blue-200 dark:group-[.toaster]:border-blue-900/60",
          success:
            "group-[.toaster]:border-emerald-200/80 group-[.toaster]:bg-emerald-50/90 text-emerald-950 dark:group-[.toaster]:bg-emerald-950/40 dark:group-[.toaster]:text-emerald-200 dark:group-[.toaster]:border-emerald-900/60",
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl dark:group-[.toaster]:bg-slate-900 dark:group-[.toaster]:text-slate-100 dark:group-[.toaster]:border-slate-800",
          warning:
            "group-[.toaster]:border-amber-200/80 group-[.toaster]:bg-amber-50/90 text-amber-950 dark:group-[.toaster]:bg-amber-950/40 dark:group-[.toaster]:text-amber-200 dark:group-[.toaster]:border-amber-900/60",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
