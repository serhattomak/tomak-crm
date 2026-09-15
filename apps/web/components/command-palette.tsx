"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calendar,
  Car,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  HelpCircle,
  Kanban,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  Mail,
  MessageSquare,
  Network,
  Package,
  Plus,
  Scale,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Truck,
  User,
  UserCheck,
  Users,
  Users2,
  X,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcutsHelp: () => void;
}

interface PaletteItem {
  badge?: string;
  category:
    | "navigation"
    | "actions"
    | "customers"
    | "orders"
    | "products"
    | "vehicles"
    | "employees";
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  onSelect: () => void;
  subtitle?: string;
  title: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenShortcutsHelp,
}: CommandPaletteProps) {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    orders: any[];
    products: any[];
    vehicles: any[];
  }>({
    customers: [],
    orders: [],
    products: [],
    vehicles: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Live search query debounce
  useEffect(() => {
    if (!(isOpen && query.trim()) || query.length < 2 || !activeTenant?.id) {
      setSearchResults({
        customers: [],
        orders: [],
        products: [],
        vehicles: [],
      });
      setLiveLoading(false);
      return;
    }

    setLiveLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const [custRes, prodRes, orderRes, vehRes] = await Promise.allSettled([
          ApiClient.request<any>(
            `/api/customers?Search=${encodeURIComponent(query)}&PageSize=4`,
            {},
            activeTenant.id
          ),
          ApiClient.request<any>(
            `/api/products?Search=${encodeURIComponent(query)}&PageSize=4`,
            {},
            activeTenant.id
          ),
          ApiClient.request<any>(
            `/api/orders?Search=${encodeURIComponent(query)}&PageSize=4`,
            {},
            activeTenant.id
          ),
          ApiClient.request<any>(
            `/api/vehicles?Search=${encodeURIComponent(query)}&PageSize=4`,
            {},
            activeTenant.id
          ),
        ]);

        const customers =
          custRes.status === "fulfilled" && custRes.value.data
            ? Array.isArray(custRes.value.data)
              ? custRes.value.data
              : custRes.value.data.items || []
            : [];

        const products =
          prodRes.status === "fulfilled" && prodRes.value.data
            ? Array.isArray(prodRes.value.data)
              ? prodRes.value.data
              : prodRes.value.data.items || []
            : [];

        const orders =
          orderRes.status === "fulfilled" && orderRes.value.data
            ? Array.isArray(orderRes.value.data)
              ? orderRes.value.data
              : orderRes.value.data.items || []
            : [];

        const vehicles =
          vehRes.status === "fulfilled" && vehRes.value.data
            ? Array.isArray(vehRes.value.data)
              ? vehRes.value.data
              : vehRes.value.data.items || []
            : [];

        setSearchResults({ customers, orders, products, vehicles });
      } catch {
        setSearchResults({
          customers: [],
          orders: [],
          products: [],
          vehicles: [],
        });
      } finally {
        setLiveLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, isOpen, activeTenant?.id]);

  // Navigation Items - Full CRM, OPS, HRM, CMS, SYS Hubs
  const navItems: PaletteItem[] = useMemo(
    () => [
      // 1. CRM & Satış
      {
        badge: "G then D",
        category: "navigation",
        icon: LayoutDashboard,
        id: "nav-dash",
        onSelect: () => {
          router.push(`/${tenantSlug}`);
          onClose();
        },
        subtitle: "Şirket KPI'ları, gelir grafikleri ve performans",
        title: "Dashboard & Genel Bakış",
      },
      {
        badge: "G then P",
        category: "navigation",
        icon: Kanban,
        id: "nav-pipelines",
        onSelect: () => {
          router.push(`/${tenantSlug}/pipelines`);
          onClose();
        },
        subtitle: "Satış fırsatları, anlaşma evreleri ve kanban panosu",
        title: "Pipeline & Fırsatlar",
      },
      {
        badge: "G then Q",
        category: "navigation",
        icon: FileSpreadsheet,
        id: "nav-quotes",
        onSelect: () => {
          router.push(`/${tenantSlug}/quotes`);
          onClose();
        },
        subtitle: "Teklif hazırlama, revizyonlar ve PDF ihracı",
        title: "Teklifler & Fiyatlandırma",
      },
      {
        badge: "G then C",
        category: "navigation",
        icon: Users2,
        id: "nav-cust",
        onSelect: () => {
          router.push(`/${tenantSlug}/customers`);
          onClose();
        },
        subtitle: "Müşteri listesi, iletişim geçmişi ve 360° görünüm",
        title: "Müşteriler & Portföy (360°)",
      },
      {
        badge: "G then O",
        category: "navigation",
        icon: ShoppingCart,
        id: "nav-orders",
        onSelect: () => {
          router.push(`/${tenantSlug}/orders`);
          onClose();
        },
        subtitle: "Sipariş takibi, ödemeler ve faturalandırma",
        title: "Siparişler & Satış",
      },
      {
        category: "navigation",
        icon: Tag,
        id: "nav-promotions",
        onSelect: () => {
          router.push(`/${tenantSlug}/promotions`);
          onClose();
        },
        subtitle: "İndirim kodları, sezonluk kampanyalar ve kuponlar",
        title: "Kampanyalar & Promosyonlar",
      },

      // 2. Operasyon & Araçlar (OPS)
      {
        badge: "G then V",
        category: "navigation",
        icon: Car,
        id: "nav-vehicles",
        onSelect: () => {
          router.push(`/${tenantSlug}/vehicles`);
          onClose();
        },
        subtitle: "Araç filosu, EPC yedek parça kataloğu ve teknik dökümanlar",
        title: "Otomotiv, Araçlar & EPC Kataloğu",
      },
      {
        category: "navigation",
        icon: Briefcase,
        id: "nav-projects",
        onSelect: () => {
          router.push(`/${tenantSlug}/projects`);
          onClose();
        },
        subtitle: "Proje yönetimi, sprintler ve görev backlog'u",
        title: "Projeler & Görevler",
      },
      {
        badge: "G then U",
        category: "navigation",
        icon: Package,
        id: "nav-prod",
        onSelect: () => {
          router.push(`/${tenantSlug}/products`);
          onClose();
        },
        subtitle: "Ürün listesi, stok hareketleri, varyantlar ve fiyatlar",
        title: "Ürünler & Hizmet Kataloğu",
      },
      {
        category: "navigation",
        icon: Truck,
        id: "nav-shipments",
        onSelect: () => {
          router.push(`/${tenantSlug}/shipments`);
          onClose();
        },
        subtitle: "Kargo gönderileri, kurye entegrasyonu ve teslimat takibi",
        title: "Kargo & Sevkiyat Yönetimi",
      },

      // 3. İnsan Kaynakları & Bordro (HRM)
      {
        badge: "G then A",
        category: "navigation",
        icon: Clock,
        id: "nav-attendance",
        onSelect: () => {
          router.push(`/${tenantSlug}/attendance`);
          onClose();
        },
        subtitle: "Canlı devam monitörü, vardiya çizelgeleri ve mola takibi",
        title: "Vardiya & PDKS Takibi",
      },
      {
        badge: "G then L",
        category: "navigation",
        icon: Calendar,
        id: "nav-leaves",
        onSelect: () => {
          router.push(`/${tenantSlug}/leaves`);
          onClose();
        },
        subtitle: "Çalışan izin talepleri, onay akışları ve takvim",
        title: "İzinler & Şirket Takvimi",
      },
      {
        category: "navigation",
        icon: Banknote,
        id: "nav-payroll",
        onSelect: () => {
          router.push(`/${tenantSlug}/payroll`);
          onClose();
        },
        subtitle: "Aylık bordro hesaplama, SGK ve vergi dökümleri",
        title: "Bordro & Maaş Yönetimi",
      },
      {
        category: "navigation",
        icon: UserCheck,
        id: "nav-employees",
        onSelect: () => {
          router.push(`/${tenantSlug}/organization?tab=employees`);
          onClose();
        },
        subtitle: "Tüm şirket çalışanları, kadro ve iletişim rehberi",
        title: "Çalışanlar & Personel Listesi",
      },
      {
        category: "navigation",
        icon: Building2,
        id: "nav-departments",
        onSelect: () => {
          router.push(`/${tenantSlug}/organization?tab=departments`);
          onClose();
        },
        subtitle: "Departman hiyerarşisi ve bölüm yöneticileri",
        title: "Departmanlar & Birimler",
      },
      {
        category: "navigation",
        icon: Network,
        id: "nav-org-chart",
        onSelect: () => {
          router.push(`/${tenantSlug}/organization?tab=chart`);
          onClose();
        },
        subtitle: "Görsel şirket organizasyon şeması ve bağlılıklar",
        title: "Organizasyon Şeması",
      },
      {
        category: "navigation",
        icon: Scale,
        id: "nav-compliance",
        onSelect: () => {
          router.push(`/${tenantSlug}/compliance`);
          onClose();
        },
        subtitle: "İş kanunu, mevzuat ve şirket iç yönetmelikleri",
        title: "Mevzuat & İş Hukuku",
      },
      {
        category: "navigation",
        icon: Briefcase,
        id: "nav-recruitment",
        onSelect: () => {
          router.push(`/${tenantSlug}/recruitment`);
          onClose();
        },
        subtitle: "Açık pozisyonlar, aday havuzu ve mülakat süreçleri",
        title: "İşe Alım & Aday Takibi",
      },

      // 4. CMS & İletişim
      {
        category: "navigation",
        icon: LifeBuoy,
        id: "nav-tickets",
        onSelect: () => {
          router.push(`/${tenantSlug}/tickets`);
          onClose();
        },
        subtitle: "Müşteri destek talepleri, SLA ve bilet takibi",
        title: "Destek Masası & Talepler",
      },
      {
        category: "navigation",
        icon: MessageSquare,
        id: "nav-messages",
        onSelect: () => {
          router.push(`/${tenantSlug}/messages`);
          onClose();
        },
        subtitle: "Dahili ekip mesajlaşması ve müşteri canlı sohbeti",
        title: "Mesajlar & Dahili Sohbet",
      },
      {
        category: "navigation",
        icon: Mail,
        id: "nav-email",
        onSelect: () => {
          router.push(`/${tenantSlug}/email`);
          onClose();
        },
        subtitle: "E-posta entegrasyonu, gelen kutusu ve şablonlar",
        title: "E-Posta Kutusu",
      },
      {
        category: "navigation",
        icon: Zap,
        id: "nav-automations",
        onSelect: () => {
          router.push(`/${tenantSlug}/automations`);
          onClose();
        },
        subtitle: "Otomatik e-posta, bildirim ve webhook tetikleyicileri",
        title: "Otomasyon & İş Akışları",
      },
      {
        category: "navigation",
        icon: BarChart3,
        id: "nav-analytics",
        onSelect: () => {
          router.push(`/${tenantSlug}/analytics`);
          onClose();
        },
        subtitle: "Detaylı satış, personel ve gelir raporları",
        title: "Raporlar & Analitik",
      },
      {
        category: "navigation",
        icon: Boxes,
        id: "nav-integration",
        onSelect: () => {
          router.push(`/${tenantSlug}/integration`);
          onClose();
        },
        subtitle: "Pazaryeri, kargo ve ERP üçüncü parti entegrasyonları",
        title: "Entegrasyonlar & API",
      },

      // 5. Sistem & Yönetim (SYS)
      {
        category: "navigation",
        icon: Users,
        id: "nav-users",
        onSelect: () => {
          router.push(`/${tenantSlug}/users`);
          onClose();
        },
        subtitle: "Kullanıcı hesapları, davetler ve erişim yönetimi",
        title: "Ekip & Kullanıcılar",
      },
      {
        category: "navigation",
        icon: Shield,
        id: "nav-roles",
        onSelect: () => {
          router.push(`/${tenantSlug}/roles`);
          onClose();
        },
        subtitle: "Kullanıcı rolleri ve detaylı yetki matrisi",
        title: "Roller & Yetki Yönetimi",
      },
      {
        badge: "G then S",
        category: "navigation",
        icon: Settings,
        id: "nav-settings",
        onSelect: () => {
          router.push(`/${tenantSlug}/settings`);
          onClose();
        },
        subtitle: "Şirket profili, güvenlik ve genel yapılandırma",
        title: "Şirket & Sistem Ayarları",
      },
    ],
    [router, tenantSlug, onClose]
  );

  // Action Items
  const actionItems: PaletteItem[] = useMemo(
    () => [
      {
        badge: "N then C",
        category: "actions",
        icon: Plus,
        id: "act-create-cust",
        onSelect: () => {
          router.push(`/${tenantSlug}/customers?create=true`);
          onClose();
        },
        subtitle: "Bireysel veya kurumsal yeni müşteri kartı aç",
        title: "Yeni Müşteri Ekle",
      },
      {
        badge: "N then D",
        category: "actions",
        icon: Plus,
        id: "act-create-deal",
        onSelect: () => {
          router.push(`/${tenantSlug}/pipelines?create=true`);
          onClose();
        },
        subtitle: "Satış boru hattına yeni anlaşma / fırsat ekle",
        title: "Yeni Fırsat / Pipeline Oluştur",
      },
      {
        badge: "N then Q",
        category: "actions",
        icon: Plus,
        id: "act-create-quote",
        onSelect: () => {
          router.push(`/${tenantSlug}/quotes?create=true`);
          onClose();
        },
        subtitle: "Müşteriye özel yeni fiyat teklifi oluştur",
        title: "Yeni Teklif Hazırla",
      },
      {
        category: "actions",
        icon: Plus,
        id: "act-create-vehicle",
        onSelect: () => {
          router.push(`/${tenantSlug}/vehicles?create=true`);
          onClose();
        },
        subtitle: "Sisteme yeni araç modeli veya şasi kaydet",
        title: "Yeni Araç / Vasıta Ekle",
      },
      {
        category: "actions",
        icon: Plus,
        id: "act-create-order",
        onSelect: () => {
          router.push(`/${tenantSlug}/orders?create=true`);
          onClose();
        },
        subtitle: "Hızlı satış siparişi ve kalemleri ekle",
        title: "Yeni Sipariş Oluştur",
      },
      {
        badge: "N then I",
        category: "actions",
        icon: Plus,
        id: "act-create-leave",
        onSelect: () => {
          router.push(`/${tenantSlug}/leaves?create=true`);
          onClose();
        },
        subtitle: "Yıllık, mazeret veya sağlık izni başvurusu yap",
        title: "Yeni İzin Talebi Gönder",
      },
      {
        badge: "N then U",
        category: "actions",
        icon: Plus,
        id: "act-create-prod",
        onSelect: () => {
          router.push(`/${tenantSlug}/products?create=true`);
          onClose();
        },
        subtitle: "Kataloğa yeni fiziksel veya dijital ürün ekle",
        title: "Yeni Ürün / Hizmet Tanımla",
      },
      {
        category: "actions",
        icon: Plus,
        id: "act-create-ticket",
        onSelect: () => {
          router.push(`/${tenantSlug}/tickets?create=true`);
          onClose();
        },
        subtitle: "Müşteri veya dahili destek bileti oluştur",
        title: "Yeni Destek Talebi Aç",
      },
      {
        category: "actions",
        icon: Plus,
        id: "act-create-payroll",
        onSelect: () => {
          router.push(`/${tenantSlug}/payroll?create=true`);
          onClose();
        },
        subtitle: "Aylık bordro hesaplama ve puantaj dönemi aç",
        title: "Yeni Dönem Bordrosu Başlat",
      },
      {
        category: "actions",
        icon: Plus,
        id: "act-assign-shift",
        onSelect: () => {
          router.push(`/${tenantSlug}/attendance?create=assign`);
          onClose();
        },
        subtitle: "Personel ve departmanlara toplu vardiya planlaması yap",
        title: "Yeni Vardiya Ata",
      },
      {
        category: "actions",
        icon: Plus,
        id: "act-create-correction",
        onSelect: () => {
          router.push(`/${tenantSlug}/attendance?create=correction`);
          onClose();
        },
        subtitle: "Unutulan giriş-çıkış saatini mazeretiyle bildir",
        title: "PDKS Düzeltme Talebi Gönder",
      },
      {
        badge: "?",
        category: "actions",
        icon: HelpCircle,
        id: "act-shortcuts-help",
        onSelect: () => {
          onClose();
          onOpenShortcutsHelp();
        },
        subtitle: "Tüm klavye kısayollarını görüntüle",
        title: "Klavye Kısayolları Kılavuzu",
      },
    ],
    [router, tenantSlug, onClose, onOpenShortcutsHelp]
  );

  // Dynamic Live Search Items
  const dynamicLiveItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];

    // Customers
    searchResults.customers.forEach((c: any) => {
      items.push({
        category: "customers",
        icon: User,
        id: `live-cust-${c.id}`,
        onSelect: () => {
          router.push(`/${tenantSlug}/customers/${c.id}`);
          onClose();
        },
        subtitle: `Müşteri • ${c.email || c.phone || "İletişim bilgisi yok"} • ${c.tier || "Standart"}`,
        title: c.name || "İsimsiz Müşteri",
      });
    });

    // Orders
    searchResults.orders.forEach((o: any) => {
      items.push({
        category: "orders",
        icon: ShoppingCart,
        id: `live-order-${o.id}`,
        onSelect: () => {
          router.push(`/${tenantSlug}/orders/${o.id}`);
          onClose();
        },
        subtitle: `Sipariş • ₺${(o.totalAmount || 0).toLocaleString("tr-TR")} • ${o.customerName || "Müşteri"} • ${o.status || ""}`,
        title: `Sipariş #${o.orderNumber || o.id.slice(0, 8)}`,
      });
    });

    // Products
    searchResults.products.forEach((p: any) => {
      items.push({
        category: "products",
        icon: Package,
        id: `live-prod-${p.id}`,
        onSelect: () => {
          router.push(`/${tenantSlug}/products/${p.id}`);
          onClose();
        },
        subtitle: `Ürün • ₺${(p.sellingPrice || 0).toLocaleString("tr-TR")} • SKU: ${p.sku || "—"} • Stok: ${p.stockQuantity ?? "—"}`,
        title: p.name || "İsimsiz Ürün",
      });
    });

    // Vehicles
    searchResults.vehicles?.forEach((v: any) => {
      items.push({
        category: "vehicles",
        icon: Car,
        id: `live-veh-${v.id}`,
        onSelect: () => {
          router.push(`/${tenantSlug}/vehicles`);
          onClose();
        },
        subtitle: `Araç / EPC • ${v.brand || ""} ${v.model || ""} • ${v.plateNumber || v.vin || "Şasi / Plaka"}`,
        title: `${v.brand || "Araç"} ${v.model || ""} ${v.year ? `(${v.year})` : ""}`,
      });
    });

    return items;
  }, [searchResults, router, tenantSlug, onClose]);

  // Filtered List
  const allFilteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();

    // If query exists, filter navigation and actions
    const filteredNav = navItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );

    const filteredActions = actionItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );

    return [...dynamicLiveItems, ...filteredActions, ...filteredNav];
  }, [query, navItems, actionItems, dynamicLiveItems]);

  // Reset selected index when query or results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, allFilteredItems.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    const activeElement = listRef.current.querySelector(
      `[data-item-index="${selectedIndex}"]`
    ) as HTMLElement | null;

    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside Palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allFilteredItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : Math.max(0, allFilteredItems.length - 1)
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allFilteredItems[selectedIndex]) {
          allFilteredItems[selectedIndex].onSelect();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [allFilteredItems, selectedIndex, onClose]
  );

  if (!isOpen) {
    return null;
  }

  // Categorize for grouped display
  const categorized = {
    actions: allFilteredItems.filter((i) => i.category === "actions"),
    customers: allFilteredItems.filter((i) => i.category === "customers"),
    navigation: allFilteredItems.filter((i) => i.category === "navigation"),
    orders: allFilteredItems.filter((i) => i.category === "orders"),
    products: allFilteredItems.filter((i) => i.category === "products"),
    vehicles: allFilteredItems.filter((i) => i.category === "vehicles"),
  };

  let runningIndex = 0;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="top-16 flex max-h-[80vh] w-full translate-y-0 flex-col gap-0 overflow-hidden p-0 text-xs sm:top-24 sm:max-w-2xl"
        showCloseButton={false}
      >
        {/* No visible heading: the palette opens straight into its search field,
            but Radix needs an accessible name for the dialog. */}
        <DialogTitle className="sr-only">Komut Paleti</DialogTitle>

        {/* Search Bar Header */}
        <div className="relative flex items-center border-zinc-100 border-b px-4 py-3.5 dark:border-zinc-800">
          <Search className="mr-3 h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <input
            className="w-full bg-transparent font-medium text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sayfa, eylem, müşteri, sipariş, ürün veya araç ara..."
            ref={inputRef}
            type="text"
            value={query}
          />
          {liveLoading && (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-violet-600 dark:text-violet-400" />
          )}
          {query ? (
            <button
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              onClick={() => setQuery("")}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-bold text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div
          className="max-h-[60vh] flex-1 space-y-4 overflow-y-auto p-2"
          ref={listRef}
        >
          {allFilteredItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
              <Search className="mx-auto mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="font-semibold text-xs text-zinc-600 dark:text-zinc-300">
                "{query}" ile eşleşen sonuç bulunamadı
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                Lütfen farklı bir arama terimi deneyin
              </p>
            </div>
          ) : (
            <>
              {/* Dynamic Vehicle Results */}
              {categorized.vehicles.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Araçlar & Otomotiv
                  </div>
                  {categorized.vehicles.map((item) => {
                    const idx = runningIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <PaletteRow
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        key={item.id}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Dynamic Customer Results */}
              {categorized.customers.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Müşteriler
                  </div>
                  {categorized.customers.map((item) => {
                    const idx = runningIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <PaletteRow
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        key={item.id}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Dynamic Order Results */}
              {categorized.orders.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Siparişler
                  </div>
                  {categorized.orders.map((item) => {
                    const idx = runningIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <PaletteRow
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        key={item.id}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Dynamic Product Results */}
              {categorized.products.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Ürünler & Hizmetler
                  </div>
                  {categorized.products.map((item) => {
                    const idx = runningIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <PaletteRow
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        key={item.id}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              {categorized.actions.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Hızlı İşlemler
                  </div>
                  {categorized.actions.map((item) => {
                    const idx = runningIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <PaletteRow
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        key={item.id}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Navigation */}
              {categorized.navigation.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                    Sayfalar & Modüller
                  </div>
                  {categorized.navigation.map((item) => {
                    const idx = runningIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <PaletteRow
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        key={item.id}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Hotkey Legend */}
        <div className="flex items-center justify-between border-zinc-100 border-t bg-zinc-50/70 px-4 py-2.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-200 bg-white px-1 font-bold font-mono text-[10px] text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                ↑↓
              </kbd>
              <span>Gezin</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-200 bg-white px-1.5 font-bold font-mono text-[10px] text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                ↵
              </kbd>
              <span>Seç</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-200 bg-white px-1 font-bold font-mono text-[10px] text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Esc
              </kbd>
              <span>Kapat</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
            <span>Kısayollar için</span>
            <kbd
              className="cursor-pointer rounded border border-zinc-200 bg-white px-1 font-bold font-mono text-[10px] text-violet-600 shadow-2xs hover:bg-violet-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-violet-400 dark:hover:bg-violet-950/50"
              onClick={() => {
                onClose();
                onOpenShortcutsHelp();
              }}
            >
              ?
            </kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaletteRow({
  item,
  isSelected,
  index,
  onHover,
}: {
  item: PaletteItem;
  isSelected: boolean;
  index: number;
  onHover: () => void;
}) {
  const Icon = item.icon;

  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-all ${
        isSelected
          ? "border border-violet-200 bg-violet-50 text-violet-950 shadow-2xs dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-100"
          : "border border-transparent text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
      }`}
      data-item-index={index}
      onClick={item.onSelect}
      onMouseEnter={onHover}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            isSelected
              ? "bg-violet-600 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="truncate">
          <div className="truncate font-semibold text-xs leading-tight">
            {item.title}
          </div>
          {item.subtitle && (
            <div
              className={`mt-0.5 truncate text-[11px] ${
                isSelected
                  ? "text-violet-700/80 dark:text-violet-300/80"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {item.subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-1.5">
        {item.badge && (
          <kbd
            className={`rounded-md border px-1.5 py-0.5 font-bold font-mono text-[10px] shadow-2xs ${
              isSelected
                ? "border-violet-200 bg-white text-violet-800 dark:border-violet-700 dark:bg-zinc-800 dark:text-violet-300"
                : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {item.badge}
          </kbd>
        )}
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${
            isSelected
              ? "translate-x-0.5 text-violet-600 dark:text-violet-400"
              : "text-zinc-300 dark:text-zinc-600"
          }`}
        />
      </div>
    </div>
  );
}
