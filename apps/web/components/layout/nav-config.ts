import {
  Banknote,
  BarChart3,
  Briefcase,
  Calendar,
  CalendarDays,
  Car,
  Clock,
  FileSignature,
  FileSpreadsheet,
  Kanban,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageSquare,
  Network,
  Package,
  ReceiptText,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  Users2,
  Warehouse,
  Webhook,
  Wrench,
  Zap,
} from "lucide-react";
import type * as React from "react";

export type NavigationHub = "crm" | "ops" | "hrm" | "comm" | "sys";

export interface HubDefinition {
  badge?: string | null;
  defaultHref: (slug: string) => string;
  description: string;
  icon: React.ElementType;
  id: NavigationHub;
  label: string;
  name: string;
}

export interface NavItem {
  badge?: string | null;
  exact?: boolean;
  href: string;
  icon: React.ElementType;
  moduleKey?: string;
  name: string;
  permission?: string;
  tab?: string;
}

export function getNavigationHubs(
  tHubs?: (key: string) => string
): HubDefinition[] {
  return [
    {
      defaultHref: (slug) => `/${slug}`,
      description: tHubs
        ? tHubs("crmDesc")
        : "Pipeline, Teklifler ve Müşteriler",
      icon: LayoutDashboard,
      id: "crm",
      label: "CRM",
      name: tHubs ? tHubs("crm") : "CRM & Satış",
    },
    {
      defaultHref: (slug) => `/${slug}/vehicles`,
      description: tHubs ? tHubs("opsDesc") : "Araçlar, Projeler ve Kargo",
      icon: Car,
      id: "ops",
      label: "OPS",
      name: tHubs ? tHubs("ops") : "Operasyon & Araçlar",
    },
    {
      defaultHref: (slug) => `/${slug}/attendance`,
      description: tHubs ? tHubs("hrmDesc") : "PDKS, İzinler ve Bordro",
      icon: Users2,
      id: "hrm",
      label: "HRM",
      name: tHubs ? tHubs("hrm") : "İnsan Kaynakları",
    },
    {
      badge: "33",
      defaultHref: (slug) => `/${slug}/tickets`,
      description: tHubs ? tHubs("commDesc") : "Destek Masası ve Mesajlar",
      icon: MessageSquare,
      id: "comm",
      label: "CMS",
      name: tHubs ? tHubs("comm") : "Destek & İletişim",
    },
    {
      defaultHref: (slug) => `/${slug}/users`,
      description: tHubs ? tHubs("sysDesc") : "Kullanıcılar, Roller ve Ayarlar",
      icon: Shield,
      id: "sys",
      label: "SYS",
      name: tHubs ? tHubs("sys") : "Sistem & Yönetim",
    },
  ];
}

export function getActiveHubFromPathname(
  pathname: string,
  tenantSlug: string
): NavigationHub {
  if (!(pathname && tenantSlug)) {
    return "crm";
  }

  if (
    pathname.includes(`/${tenantSlug}/attendance`) ||
    pathname.includes(`/${tenantSlug}/leaves`) ||
    pathname.includes(`/${tenantSlug}/payroll`) ||
    pathname.includes(`/${tenantSlug}/organization`) ||
    pathname.includes(`/${tenantSlug}/compliance`) ||
    pathname.includes(`/${tenantSlug}/recruitment`)
  ) {
    return "hrm";
  }

  if (
    pathname.includes(`/${tenantSlug}/vehicles`) ||
    pathname.includes(`/${tenantSlug}/projects`) ||
    pathname.includes(`/${tenantSlug}/shipments`) ||
    pathname.includes(`/${tenantSlug}/field-service`)
  ) {
    return "ops";
  }

  if (
    pathname.includes(`/${tenantSlug}/tickets`) ||
    pathname.includes(`/${tenantSlug}/messages`) ||
    pathname.includes(`/${tenantSlug}/email`) ||
    pathname.includes(`/${tenantSlug}/automations`) ||
    pathname.includes(`/${tenantSlug}/analytics`) ||
    pathname.includes(`/${tenantSlug}/webhooks`)
  ) {
    return "comm";
  }

  if (
    pathname.includes(`/${tenantSlug}/users`) ||
    pathname.includes(`/${tenantSlug}/roles`) ||
    pathname.includes(`/${tenantSlug}/settings`)
  ) {
    return "sys";
  }

  return "crm";
}

export function getHubNavItems(
  hub: NavigationHub,
  tenantSlug: string,
  tNav: (key: string) => string,
  getModuleDisplayName: (key: string, fallback: string) => string,
  isModuleEnabled: (key: string) => boolean
): NavItem[] {
  switch (hub) {
    case "crm":
      return [
        {
          exact: true,
          href: `/${tenantSlug}`,
          icon: LayoutDashboard,
          name: tNav("dashboard"),
        },
        {
          href: `/${tenantSlug}/pipelines`,
          icon: Kanban,
          moduleKey: "pipelines",
          name: getModuleDisplayName("pipelines", tNav("pipelines")),
          permission: "Pipelines.View",
        },
        {
          href: `/${tenantSlug}/calendar`,
          icon: CalendarDays,
          name: "Takvim & Görüşmeler",
        },
        {
          href: `/${tenantSlug}/quotes`,
          icon: FileSpreadsheet,
          moduleKey: "quotes",
          name: getModuleDisplayName("quotes", tNav("quotes")),
          permission: "Quotes.View",
        },
        {
          href: `/${tenantSlug}/contracts`,
          icon: FileSignature,
          moduleKey: "contracts",
          name: "Sözleşmeler & E-İmza",
          permission: "Contracts.View",
        },
        {
          href: `/${tenantSlug}/customers`,
          icon: Users2,
          moduleKey: "customers",
          name: getModuleDisplayName("customers", tNav("customers")),
        },
        {
          href: `/${tenantSlug}/orders`,
          icon: ShoppingCart,
          moduleKey: "orders",
          name: getModuleDisplayName("orders", tNav("orders")),
        },
        {
          href: `/${tenantSlug}/products`,
          icon: Package,
          moduleKey: "products",
          name: getModuleDisplayName("products", tNav("products")),
        },
        {
          href: `/${tenantSlug}/inventory`,
          icon: Warehouse,
          moduleKey: "inventory",
          name: getModuleDisplayName("inventory", tNav("inventory")),
        },
        {
          href: `/${tenantSlug}/invoices`,
          icon: ReceiptText,
          moduleKey: "invoices",
          name: getModuleDisplayName("invoices", tNav("invoices")),
        },
        {
          href: `/${tenantSlug}/finance`,
          icon: Landmark,
          moduleKey: "finance",
          name: getModuleDisplayName("finance", tNav("finance")),
        },
        {
          href: `/${tenantSlug}/promotions`,
          icon: Tag,
          moduleKey: "promotions",
          name: getModuleDisplayName("promotions", tNav("promotions")),
          permission: "Promotions.View",
        },
      ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

    case "ops":
      return [
        {
          href: `/${tenantSlug}/field-service`,
          icon: Wrench,
          name: "Saha Servis & Mobil",
          permission: "FieldService.View",
        },
        {
          href: `/${tenantSlug}/vehicles`,
          icon: Car,
          name: tNav("vehicles"),
          permission: "Vehicles.View",
        },
        {
          href: `/${tenantSlug}/projects`,
          icon: Briefcase,
          name: tNav("projects"),
          permission: "Projects.View",
        },
        {
          href: `/${tenantSlug}/shipments`,
          icon: Truck,
          moduleKey: "shipping",
          name: getModuleDisplayName("shipping", tNav("shipments")),
          permission: "Shipment.View",
        },
      ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

    case "hrm":
      return [
        {
          href: `/${tenantSlug}/attendance`,
          icon: Clock,
          moduleKey: "attendance",
          name: getModuleDisplayName("attendance", tNav("attendance")),
          permission: "Attendance.View",
        },
        {
          href: `/${tenantSlug}/leaves`,
          icon: Calendar,
          moduleKey: "leaves",
          name: getModuleDisplayName("leaves", tNav("leaves")),
          permission: "Leaves.View",
        },
        {
          href: `/${tenantSlug}/compliance`,
          icon: ShieldCheck,
          moduleKey: "compliance",
          name: getModuleDisplayName("compliance", tNav("compliance")),
          permission: "Compliance.View",
        },
        {
          href: `/${tenantSlug}/payroll`,
          icon: Banknote,
          moduleKey: "payroll",
          name: getModuleDisplayName("payroll", tNav("payroll")),
          permission: "Payroll.View",
        },
        {
          href: `/${tenantSlug}/organization?tab=chart`,
          icon: Network,
          moduleKey: "organization",
          name: tNav("organization"),
          permission: "Organization.ViewChart",
          tab: "chart",
        },
        {
          href: `/${tenantSlug}/recruitment`,
          icon: Briefcase,
          name: tNav("recruitment"),
          permission: "Recruitment.View",
        },
      ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

    case "comm":
      return [
        {
          href: `/${tenantSlug}/tickets`,
          icon: LifeBuoy,
          moduleKey: "tickets",
          name: getModuleDisplayName("tickets", tNav("tickets")),
          permission: "Tickets.View",
        },
        {
          badge: "33",
          href: `/${tenantSlug}/messages`,
          icon: MessageSquare,
          moduleKey: "chat",
          name: getModuleDisplayName("chat", tNav("messages")),
        },
        {
          href: `/${tenantSlug}/email`,
          icon: Mail,
          name: tNav("email"),
        },
        {
          href: `/${tenantSlug}/automations`,
          icon: Zap,
          name: tNav("automations"),
          permission: "Automations.View",
        },
        {
          href: `/${tenantSlug}/analytics`,
          icon: BarChart3,
          name: tNav("analytics"),
        },
        {
          href: `/${tenantSlug}/webhooks`,
          icon: Webhook,
          name: tNav("webhooks"),
          permission: "Webhooks.View",
        },
      ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

    case "sys":
      return [
        {
          badge: "6",
          href: `/${tenantSlug}/users`,
          icon: Users,
          name: tNav("users"),
          permission: "Users.View",
        },
        {
          badge: "4",
          href: `/${tenantSlug}/roles`,
          icon: Shield,
          name: tNav("roles"),
          permission: "Roles.View",
        },
        {
          href: `/${tenantSlug}/settings`,
          icon: Settings,
          name: tNav("settings"),
          permission: "Tenants.Update",
        },
      ];
  }
}
