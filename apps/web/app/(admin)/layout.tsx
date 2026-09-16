"use client";

import { Toaster } from "@workspace/ui/components/sonner";
import {
  ArrowLeft,
  Building2,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res: any) => {
      if (res?.data?.user) {
        setUserEmail(res.data.user.email ?? "Admin");
      }
    });
  }, []);

  const navItems = [
    {
      exact: true,
      href: "/admin",
      icon: LayoutDashboard,
      name: "Genel Bakış",
    },
    {
      href: "/admin/tenants",
      icon: Building2,
      name: "Firmalar & Modüller",
    },
    {
      href: "/admin/templates",
      icon: Sparkles,
      name: "Sektör Şablonları",
    },
  ];

  return (
    <div className="flex h-screen w-full flex-col gap-0 overflow-hidden bg-zinc-100/70 font-sans text-zinc-900 antialiased md:flex-row md:gap-3 md:p-3 dark:bg-zinc-950 dark:text-zinc-100">
      <Toaster position="top-right" richColors />

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-border border-b bg-card px-4 py-3 shadow-2xs md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-zinc-900 leading-none dark:text-zinc-100">
              Super Admin
            </h1>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Yönetim Konsolu
            </p>
          </div>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          type="button"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="space-y-2 border-border border-b bg-card p-4 shadow-lg md:hidden">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-semibold text-xs transition ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
                href={item.href}
                key={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="border-border border-t pt-2">
            <button
              className="flex w-full items-center gap-2 rounded-xl bg-zinc-100 px-3.5 py-2 font-semibold text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              onClick={() => router.push("/")}
              type="button"
            >
              <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>CRM Çalışma Alanına Dön</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Left Floating Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between overflow-y-auto rounded-[28px] border border-border bg-card p-4 shadow-sm md:flex">
        <div className="space-y-6">
          {/* Logo & Admin Branding */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-500/20 shadow-md">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-zinc-900 tracking-tight dark:text-zinc-100">
                  CRM Cloud
                </span>
                <span className="rounded-md border border-blue-200/60 bg-blue-50 px-1.5 py-0.5 font-bold text-[9px] text-blue-600 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                  ADMIN
                </span>
              </div>
              <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                Lisans & Çoklu Firma
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              Yönetim Menüsü
            </div>
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-xs transition-all ${
                    isActive
                      ? "bg-blue-50 font-semibold text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-400"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <item.icon
                    className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"}`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Return to Workspace */}
        <div className="space-y-3 border-border border-t pt-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-zinc-50/80 px-3 py-2 font-semibold text-xs text-zinc-700 shadow-2xs transition hover:border-blue-300 hover:bg-white hover:text-blue-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-blue-700 dark:hover:bg-zinc-900 dark:hover:text-blue-400"
            onClick={() => router.push("/")}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Firmalara Dön</span>
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-zinc-50/80 p-2.5 dark:bg-zinc-800/60">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white text-xs shadow-2xs">
              SA
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                {userEmail}
              </p>
              <p className="flex items-center gap-1 font-semibold text-[10px] text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Root Yetkisi
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport — padding is owned by PageContainer (full width, no max-width cap) */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-none border-0 border-border bg-card shadow-none md:rounded-[28px] md:border md:shadow-sm">
        <main className="flex-1 pb-12">{children}</main>
      </div>
    </div>
  );
}
