"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Menu,
  X,
  Layers,
  LogOut,
} from "lucide-react";
import { Toaster } from "@workspace/ui/components/sonner";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
      name: "Genel Bakış",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Firmalar & Modüller",
      href: "/admin/tenants",
      icon: Building2,
    },
    {
      name: "Sektör Şablonları",
      href: "/admin/templates",
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex h-screen w-full flex-col gap-0 overflow-hidden bg-[#f4f5f8] font-sans text-slate-900 antialiased md:flex-row md:gap-3 md:p-3">
      <Toaster position="top-right" richColors />

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 shadow-2xs md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 leading-none">Super Admin</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Yönetim Konsolu</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
          type="button"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white p-4 md:hidden space-y-2 shadow-lg">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => router.push("/")}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">CRM Cloud</span>
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 border border-blue-200/60">
                  ADMIN
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-400">Lisans & Çoklu Firma</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Yönetim Menüsü
            </div>
            {navItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Return to Workspace */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <button
            onClick={() => router.push("/")}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white hover:border-blue-300 hover:text-blue-600 shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-blue-600" />
            <span>Firmalara Dön</span>
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-2xs">
              SA
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">{userEmail}</p>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Root Yetkisi
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-none border-0 border-slate-200/80 bg-white shadow-none md:rounded-[28px] md:border md:shadow-sm">
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-12">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
