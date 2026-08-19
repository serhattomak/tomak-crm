"use client"

import {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  ChevronRight,
  Flame,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
  Network,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  UserCheck,
  Users,
  Users2,
  Zap,
} from "lucide-react"
import Link from "next/link"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import React, { Suspense } from "react"
import { PermissionGate } from "@/components/permission-gate"
import { TenantSwitcher } from "@/components/tenant-switcher"
import { PermissionProvider } from "@/lib/permissions/permission-context"
import { createClient } from "@/lib/supabase/client"

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
                className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2 pr-14 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                placeholder="Search"
                type="text"
              />
              <div className="absolute top-2 right-2.5 flex items-center gap-0.5 rounded border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-2xs">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>

            {/* Navigation Menus */}
            <Suspense
              fallback={
                <div className="h-48 animate-pulse rounded-2xl bg-slate-50" />
              }
            >
              <DashboardNavigation />
            </Suspense>
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
  const searchParams = useSearchParams()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ""
  const currentTab = searchParams.get("tab") || "chart"

  const mainMenu = [
    {
      exact: true,
      href: `/${tenantSlug}`,
      icon: LayoutDashboard,
      name: "Dashboard",
    },
    {
      badge: null,
      href: `/${tenantSlug}/products`,
      icon: Package,
      name: "Ürün & Hizmetler",
    },
    {
      badge: null,
      href: `/${tenantSlug}/orders`,
      icon: ShoppingCart,
      name: "Siparişler",
    },
    {
      badge: null,
      href: `/${tenantSlug}/customers`,
      icon: Users2,
      name: "Müşteriler",
    },
    {
      badge: "33",
      href: `/${tenantSlug}/messages`,
      icon: MessageSquare,
      name: "Mesajlar",
    },
  ]

  const organizationMenu = [
    {
      badge: null,
      dot: "bg-fuchsia-500",
      href: `/${tenantSlug}/organization?tab=chart`,
      icon: Network,
      name: "Org Chart (Şema)",
      permission: "Organization.ViewChart",
      tab: "chart",
    },
    {
      badge: null,
      dot: "bg-cyan-500",
      href: `/${tenantSlug}/organization?tab=departments`,
      icon: Building2,
      name: "Departmanlar",
      permission: "Departments.View",
      tab: "departments",
    },
    {
      badge: null,
      dot: "bg-violet-500",
      href: `/${tenantSlug}/organization?tab=employees`,
      icon: UserCheck,
      name: "Çalışanlar & Kadro",
      permission: "Employees.View",
      tab: "employees",
    },
    {
      badge: null,
      dot: "bg-indigo-500",
      href: `/${tenantSlug}/organization?tab=positions`,
      icon: Briefcase,
      name: "Pozisyonlar & Ünvanlar",
      permission: "JobPositions.Manage",
      tab: "positions",
    },
  ]

  const toolsMenu = [
    { href: `/${tenantSlug}/email`, icon: Mail, name: "Email" },
    { href: `/${tenantSlug}/automation`, icon: Zap, name: "Automation" },
    { href: `/${tenantSlug}/analytics`, icon: BarChart3, name: "Analytics" },
    { href: `/${tenantSlug}/integration`, icon: Boxes, name: "Integration" },
  ]

  const workspaceMenu = [
    {
      badge: "6",
      dot: "bg-indigo-500",
      href: `/${tenantSlug}/users`,
      icon: Users,
      name: "Team & Members",
      permission: "Users.View",
    },
    {
      badge: "4",
      dot: "bg-pink-500",
      href: `/${tenantSlug}/roles`,
      icon: Shield,
      name: "Roles & Permissions",
      permission: "Roles.View",
    },
    {
      badge: null,
      dot: null,
      href: `/${tenantSlug}/settings`,
      icon: Settings,
      name: "Workspace Settings",
      permission: "Tenants.Update",
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
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                href={item.href}
                key={item.name}
                prefetch={false}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon
                    className={`h-4 w-4 ${isActive ? "text-fuchsia-400" : "text-slate-400"}`}
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

      {/* ORGANIZATION & PEOPLE */}
      <div>
        <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          ORGANİZASYON
        </div>
        <div className="space-y-0.5">
          {organizationMenu.map((item) => {
            const isOrgPage = pathname === `/${tenantSlug}/organization`
            const isActive = isOrgPage && currentTab === item.tab

            const linkContent = (
              <Link
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 font-semibold text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                href={item.href}
                key={item.name}
                prefetch={false}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon
                    className={`h-4 w-4 ${isActive ? "text-fuchsia-400" : "text-slate-400"}`}
                  />
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
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                href={item.href}
                key={item.name}
                prefetch={false}
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
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 font-semibold text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                href={item.href}
                key={item.name}
                prefetch={false}
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
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-50"
          href="#help"
        >
          <HelpCircle className="h-4 w-4 text-slate-400" />
          Help center
        </Link>
        <Link
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-50"
          href="#feedback"
        >
          <MessageCircleQuestion className="h-4 w-4 text-slate-400" />
          Feedback
        </Link>
        <button
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
          Sign Out
        </button>
      </div>

      {/* Upgrade & Unlock features Card */}
      <div className="group flex cursor-pointer items-center justify-between rounded-2xl border border-fuchsia-200/60 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-cyan-500/10 p-3 transition-all hover:border-fuchsia-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-500 text-white shadow-sm shadow-fuchsia-500/30">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] leading-tight font-bold text-slate-900">
              Upgrade & unlock
            </div>
            <div className="text-[10px] text-slate-500">all features</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-fuchsia-600" />
      </div>
    </div>
  )
}
