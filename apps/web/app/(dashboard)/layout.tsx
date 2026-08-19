"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter, useParams } from "next/navigation"
import { PermissionProvider } from "@/lib/permissions/permission-context"
import { TenantSwitcher } from "@/components/tenant-switcher"
import { PermissionGate } from "@/components/permission-gate"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react"

function DashboardNav() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const tenantSlug = (params?.tenantSlug as string) || ""

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navItems = [
    {
      name: "Dashboard",
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Team & Members",
      href: `/${tenantSlug}/users`,
      icon: Users,
      permission: "Users.View",
    },
    {
      name: "Roles & Permissions",
      href: `/${tenantSlug}/roles`,
      icon: Shield,
      permission: "Roles.View",
    },
    {
      name: "Workspace Settings",
      href: `/${tenantSlug}/settings`,
      icon: Settings,
      permission: "Tenants.Update",
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 antialiased">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-2 border-b border-slate-800 p-4">
            <div className="rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-2 text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm leading-tight font-bold text-slate-100">
                CRM Monolith
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                .NET 10 + Supabase
              </div>
            </div>
          </div>

          {/* Tenant Switcher in Sidebar */}
          <div className="border-b border-slate-800/80 p-3">
            <TenantSwitcher />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href)

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "border border-indigo-500/30 bg-indigo-600/15 text-indigo-400"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )

              if (item.permission) {
                return (
                  <PermissionGate key={item.href} permission={item.permission}>
                    {linkContent}
                  </PermissionGate>
                )
              }

              return linkContent
            })}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-950/30 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur">
          <div className="font-mono text-xs text-slate-400">
            Active Tenant:{" "}
            <span className="font-semibold text-indigo-400">{tenantSlug}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
              PostgreSQL RLS Active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-800/60 bg-indigo-950 px-2.5 py-1 text-xs font-medium text-indigo-400">
              Redis HybridCache
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-6">
          {params?.children || null}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const tenantSlug = params?.tenantSlug as string | undefined

  return (
    <PermissionProvider initialTenantSlug={tenantSlug}>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 antialiased">
        {/* Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900">
          <div>
            {/* Brand Header */}
            <div className="flex items-center gap-2 border-b border-slate-800 p-4">
              <div className="rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-2 text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm leading-tight font-bold text-slate-100">
                  CRM Monolith
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  .NET 10 + Supabase
                </div>
              </div>
            </div>

            {/* Tenant Switcher in Sidebar */}
            <div className="border-b border-slate-800/80 p-3">
              <TenantSwitcher />
            </div>

            {/* Navigation Links */}
            <DashboardLinks />
          </div>

          <DashboardFooter />
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur">
            <div className="font-mono text-xs text-slate-400">
              Workspace:{" "}
              <span className="font-semibold text-indigo-400">
                {tenantSlug || "..."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
                PostgreSQL RLS Active
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-800/60 bg-indigo-950 px-2.5 py-1 text-xs font-medium text-indigo-400">
                Redis HybridCache
              </span>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </PermissionProvider>
  )
}

function DashboardLinks() {
  const pathname = usePathname()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ""

  const navItems = [
    {
      name: "Overview",
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Team & Members",
      href: `/${tenantSlug}/users`,
      icon: Users,
      permission: "Users.View",
    },
    {
      name: "Roles & Permissions",
      href: `/${tenantSlug}/roles`,
      icon: Shield,
      permission: "Roles.View",
    },
    {
      name: "Workspace Settings",
      href: `/${tenantSlug}/settings`,
      icon: Settings,
      permission: "Tenants.Update",
    },
  ]

  return (
    <nav className="space-y-1 p-3">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href)

        const linkContent = (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              isActive
                ? "border border-indigo-500/30 bg-indigo-600/15 text-indigo-400"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        )

        if (item.permission) {
          return (
            <PermissionGate key={item.href} permission={item.permission}>
              {linkContent}
            </PermissionGate>
          )
        }

        return linkContent
      })}
    </nav>
  )
}

function DashboardFooter() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="border-t border-slate-800 p-3">
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-950/30 hover:text-red-400"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  )
}
