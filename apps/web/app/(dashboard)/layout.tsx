"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useParams } from "next/navigation"
import { PermissionProvider } from "@/lib/permissions/permission-context"
import { TenantSwitcher } from "@/components/tenant-switcher"
import { PermissionGate } from "@/components/permission-gate"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users2,
  MessageSquare,
  Mail,
  Zap,
  BarChart3,
  Boxes,
  Users,
  Shield,
  Settings,
  HelpCircle,
  MessageCircleQuestion,
  LogOut,
  Search,
  ChevronRight,
  Flame,
  PanelLeftClose,
} from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const tenantSlug = params?.tenantSlug as string | undefined

  return (
    <PermissionProvider initialTenantSlug={tenantSlug}>
      <div className="flex h-screen gap-3 overflow-hidden bg-[#f4f5f8] p-2 font-sans text-slate-900 antialiased sm:p-3">
        {/* Left Floating Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col justify-between overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white p-3.5 shadow-sm">
          <div className="space-y-4">
            {/* Workspace Switcher Header */}
            <div className="flex items-center justify-between gap-2">
              <TenantSwitcher />
            </div>

            {/* Search Bar with ⌘ K */}
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2 pr-14 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
              />
              <div className="absolute top-2 right-2.5 flex items-center gap-0.5 rounded border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-2xs">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>

            {/* Navigation Menus */}
            <DashboardNavigation />
          </div>

          {/* Bottom Sidebar Actions & Upgrade Card */}
          <DashboardBottom />
        </aside>

        {/* Main Content Viewport */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
          <div className="flex-1 p-6 md:p-8">{children}</div>
        </div>
      </div>
    </PermissionProvider>
  )
}

function DashboardNavigation() {
  const pathname = usePathname()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ""

  const mainMenu = [
    {
      name: "Dashboard",
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Product",
      href: `/${tenantSlug}/products`,
      icon: Package,
      badge: null,
    },
    {
      name: "Order",
      href: `/${tenantSlug}/orders`,
      icon: ShoppingCart,
      badge: null,
    },
    {
      name: "Customer",
      href: `/${tenantSlug}/customers`,
      icon: Users2,
      badge: null,
    },
    {
      name: "Message",
      href: `/${tenantSlug}/messages`,
      icon: MessageSquare,
      badge: "33",
    },
  ]

  const toolsMenu = [
    { name: "Email", href: `/${tenantSlug}/email`, icon: Mail },
    { name: "Automation", href: `/${tenantSlug}/automation`, icon: Zap },
    { name: "Analytics", href: `/${tenantSlug}/analytics`, icon: BarChart3 },
    { name: "Integration", href: `/${tenantSlug}/integration`, icon: Boxes },
  ]

  const workspaceMenu = [
    {
      name: "Team & Members",
      href: `/${tenantSlug}/users`,
      icon: Users,
      permission: "Users.View",
      dot: "bg-indigo-500",
      badge: "6",
    },
    {
      name: "Roles & Permissions",
      href: `/${tenantSlug}/roles`,
      icon: Shield,
      permission: "Roles.View",
      dot: "bg-pink-500",
      badge: "4",
    },
    {
      name: "Workspace Settings",
      href: `/${tenantSlug}/settings`,
      icon: Settings,
      permission: "Tenants.Update",
      dot: null,
      badge: null,
    },
  ]

  return (
    <div className="space-y-4">
      {/* MAIN MENU */}
      <div>
        <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          MAIN MENU
        </div>
        <div className="space-y-0.5">
          {mainMenu.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon
                    className={`h-4 w-4 ${isActive ? "text-orange-400" : "text-slate-400"}`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* TOOLS */}
      <div>
        <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          TOOLS
        </div>
        <div className="space-y-0.5">
          {toolsMenu.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 text-slate-400" />
                  <span>{item.name}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* WORKSPACE */}
      <div>
        <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          WORKSPACE
        </div>
        <div className="space-y-0.5">
          {workspaceMenu.map((item) => {
            const isActive = pathname === item.href

            const linkContent = (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 font-semibold text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.dot ? (
                    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                  ) : (
                    <item.icon className="h-4 w-4 text-slate-400" />
                  )}
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="py-0.2 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                    {item.badge}
                  </span>
                )}
              </Link>
            )

            if (item.permission) {
              return (
                <PermissionGate key={item.name} permission={item.permission}>
                  {linkContent}
                </PermissionGate>
              )
            }

            return linkContent
          })}
        </div>
      </div>
    </div>
  )
}

function DashboardBottom() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <div className="space-y-0.5 text-xs font-medium text-slate-600">
        <Link
          href="#help"
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-50"
        >
          <HelpCircle className="h-4 w-4 text-slate-400" />
          Help center
        </Link>
        <Link
          href="#feedback"
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-50"
        >
          <MessageCircleQuestion className="h-4 w-4 text-slate-400" />
          Feedback
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
          Sign Out
        </button>
      </div>

      {/* Upgrade & Unlock features Card */}
      <div className="group flex cursor-pointer items-center justify-between rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 p-3 transition-all hover:border-orange-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/30">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] leading-tight font-bold text-slate-900">
              Upgrade & unlock
            </div>
            <div className="text-[10px] text-slate-500">all features</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-orange-600" />
      </div>
    </div>
  )
}
