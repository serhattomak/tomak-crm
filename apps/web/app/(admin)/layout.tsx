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
    <div className="flex h-screen w-full flex-col gap-0 overflow-hidden bg-[#f4f5f8] font-sans text-slate-900 antialiased md:flex-row md:gap-3 md:p-3">
      <Toaster position="top-right" richColors />

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-slate-200/80 border-b bg-white px-4 py-3 shadow-2xs md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm leading-none">
              Super Admin
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">Yönetim Konsolu</p>
          </div>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
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
        <div className="space-y-2 border-slate-200 border-b bg-white p-4 shadow-lg md:hidden">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-semibold text-xs transition ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
          <div className="border-slate-100 border-t pt-2">
            <button
              className="flex w-full items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 font-semibold text-slate-700 text-xs hover:bg-slate-200"
              onClick={() => router.push("/")}
              type="button"
            >
              <ArrowLeft className="h-4 w-4 text-blue-600" />
              <span>CRM Çalışma Alanına Dön</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Left Floating Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm md:flex">
        <div className="space-y-6">
          {/* Logo & Admin Branding */}
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20 shadow-md">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                  CRM Cloud
                </span>
                <span className="rounded-md border border-blue-200/60 bg-blue-50 px-1.5 py-0.5 font-bold text-[9px] text-blue-600">
                  ADMIN
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-400">
                Lisans & Çoklu Firma
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 font-bold text-[10px] text-slate-400 uppercase tracking-wider">
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
                      ? "bg-blue-50 font-semibold text-blue-600 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <item.icon
                    className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Return to Workspace */}
        <div className="space-y-3 border-slate-100 border-t pt-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 font-semibold text-slate-700 text-xs shadow-2xs transition hover:border-blue-300 hover:bg-white hover:text-blue-600"
            onClick={() => router.push("/")}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
            <span>Firmalara Dön</span>
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white text-xs shadow-2xs">
              SA
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800 text-xs">
                {userEmail}
              </p>
              <p className="flex items-center gap-1 font-semibold text-[10px] text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Root Yetkisi
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-none border-0 border-slate-200/80 bg-white shadow-none md:rounded-[28px] md:border md:shadow-sm">
        <main className="flex-1 p-4 pb-12 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
