"use client"

import {
  Banknote,
  Building2,
  Calendar,
  ChevronRight,
  FolderKanban,
  HelpCircle,
  History,
  LayoutDashboard,
  Loader2,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  User,
  Users2,
  X,
  Zap,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ApiClient } from "@/lib/api-client"
import { usePermissions } from "@/lib/permissions/permission-context"

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenShortcutsHelp: () => void
}

interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  category: "navigation" | "actions" | "customers" | "orders" | "products" | "employees"
  onSelect: () => void
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenShortcutsHelp,
}: CommandPaletteProps) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ""
  const { activeTenant } = usePermissions()

  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [liveLoading, setLiveLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    customers: any[]
    orders: any[]
    products: any[]
  }>({
    customers: [],
    orders: [],
    products: [],
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Live search query debounce
  useEffect(() => {
    if (!isOpen || !query.trim() || query.length < 2 || !activeTenant?.id) {
      setSearchResults({ customers: [], orders: [], products: [] })
      setLiveLoading(false)
      return
    }

    setLiveLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const [custRes, prodRes, orderRes] = await Promise.allSettled([
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
        ])

        const customers =
          custRes.status === "fulfilled" && custRes.value.data
            ? Array.isArray(custRes.value.data)
              ? custRes.value.data
              : custRes.value.data.items || []
            : []

        const products =
          prodRes.status === "fulfilled" && prodRes.value.data
            ? Array.isArray(prodRes.value.data)
              ? prodRes.value.data
              : prodRes.value.data.items || []
            : []

        const orders =
          orderRes.status === "fulfilled" && orderRes.value.data
            ? Array.isArray(orderRes.value.data)
              ? orderRes.value.data
              : orderRes.value.data.items || []
            : []

        setSearchResults({ customers, orders, products })
      } catch {
        setSearchResults({ customers: [], orders: [], products: [] })
      } finally {
        setLiveLoading(false)
      }
    }, 200)

    return () => clearTimeout(timeout)
  }, [query, isOpen, activeTenant?.id])

  // Navigation Items
  const navItems: PaletteItem[] = useMemo(
    () => [
      {
        id: "nav-dash",
        title: "Dashboard & Genel Bakış",
        subtitle: "Şirket KPI'ları, grafikler ve özetler",
        icon: LayoutDashboard,
        category: "navigation",
        badge: "G then D",
        onSelect: () => {
          router.push(`/${tenantSlug}`)
          onClose()
        },
      },
      {
        id: "nav-cust",
        title: "Müşteriler & CRM (360°)",
        subtitle: "Müşteri listesi, iletişimler ve anlaşmalar",
        icon: Users2,
        category: "navigation",
        badge: "G then M",
        onSelect: () => {
          router.push(`/${tenantSlug}/customers`)
          onClose()
        },
      },
      {
        id: "nav-orders",
        title: "Siparişler & Satış",
        subtitle: "Sipariş yönetimi, tahsilat ve faturalar",
        icon: ShoppingCart,
        category: "navigation",
        badge: "G then S",
        onSelect: () => {
          router.push(`/${tenantSlug}/orders`)
          onClose()
        },
      },
      {
        id: "nav-prod",
        title: "Ürünler & Hizmet Kataloğu",
        subtitle: "Stok hareketleri, varyantlar ve fiyatlar",
        icon: Package,
        category: "navigation",
        badge: "G then U",
        onSelect: () => {
          router.push(`/${tenantSlug}/products`)
          onClose()
        },
      },
      {
        id: "nav-leaves",
        title: "İzinler & Şirket Takvimi",
        subtitle: "Çalışan izin talepleri ve onay süreçleri",
        icon: Calendar,
        category: "navigation",
        badge: "G then I",
        onSelect: () => {
          router.push(`/${tenantSlug}/leaves`)
          onClose()
        },
      },
      {
        id: "nav-payroll",
        title: "Bordro & Maaş Yönetimi",
        subtitle: "Aylık bordro hesaplama, SGK ve vergi dökümleri",
        icon: Banknote,
        category: "navigation",
        badge: "G then B",
        onSelect: () => {
          router.push(`/${tenantSlug}/payroll`)
          onClose()
        },
      },
      {
        id: "nav-org",
        title: "Organizasyon & Kadro",
        subtitle: "Departmanlar, pozisyonlar ve çalışanlar",
        icon: Building2,
        category: "navigation",
        badge: "G then O",
        onSelect: () => {
          router.push(`/${tenantSlug}/organization`)
          onClose()
        },
      },
      {
        id: "nav-roles",
        title: "Roller & Yetki Yönetimi",
        subtitle: "Kullanıcı rolleri ve izin matrisleri",
        icon: Shield,
        category: "navigation",
        onSelect: () => {
          router.push(`/${tenantSlug}/roles`)
          onClose()
        },
      },
      {
        id: "nav-settings",
        title: "Şirket & Sistem Ayarları",
        subtitle: "Hesap, bildirimler ve entegrasyonlar",
        icon: Settings,
        category: "navigation",
        badge: "G then A",
        onSelect: () => {
          router.push(`/${tenantSlug}/settings`)
          onClose()
        },
      },
    ],
    [router, tenantSlug, onClose]
  )

  // Action Items
  const actionItems: PaletteItem[] = useMemo(
    () => [
      {
        id: "act-create-cust",
        title: "Yeni Müşteri Ekle",
        subtitle: "Bireysel veya kurumsal yeni müşteri kartı aç",
        icon: Plus,
        category: "actions",
        badge: "N then M",
        onSelect: () => {
          router.push(`/${tenantSlug}/customers?create=true`)
          onClose()
        },
      },
      {
        id: "act-create-order",
        title: "Yeni Sipariş Oluştur",
        subtitle: "Hızlı satış siparişi ve kalemleri ekle",
        icon: Plus,
        category: "actions",
        badge: "N then S",
        onSelect: () => {
          router.push(`/${tenantSlug}/orders?create=true`)
          onClose()
        },
      },
      {
        id: "act-create-leave",
        title: "Yeni İzin Talebi Gönder",
        subtitle: "Yıllık, mazeret veya sağlık izni başvurusu yap",
        icon: Plus,
        category: "actions",
        badge: "N then I",
        onSelect: () => {
          router.push(`/${tenantSlug}/leaves?create=true`)
          onClose()
        },
      },
      {
        id: "act-create-prod",
        title: "Yeni Ürün / Hizmet Tanımla",
        subtitle: "Kataloğa yeni fiziksel veya dijital ürün ekle",
        icon: Plus,
        category: "actions",
        badge: "N then U",
        onSelect: () => {
          router.push(`/${tenantSlug}/products?create=true`)
          onClose()
        },
      },
      {
        id: "act-create-payroll",
        title: "Yeni Dönem Bordrosu Başlat",
        subtitle: "Aylık bordro hesaplama ve puantaj dönemi aç",
        icon: Plus,
        category: "actions",
        onSelect: () => {
          router.push(`/${tenantSlug}/payroll?create=true`)
          onClose()
        },
      },
      {
        id: "act-shortcuts-help",
        title: "Klavye Kısayolları Kılavuzu",
        subtitle: "Tüm klavye kısayollarını görüntüle",
        icon: HelpCircle,
        category: "actions",
        badge: "?",
        onSelect: () => {
          onClose()
          onOpenShortcutsHelp()
        },
      },
    ],
    [router, tenantSlug, onClose, onOpenShortcutsHelp]
  )

  // Dynamic Live Search Items
  const dynamicLiveItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = []

    // Customers
    searchResults.customers.forEach((c: any) => {
      items.push({
        id: `live-cust-${c.id}`,
        title: c.name || "İsimsiz Müşteri",
        subtitle: `Müşteri • ${c.email || c.phone || "İletişim bilgisi yok"} • ${c.tier || "Standart"}`,
        icon: User,
        category: "customers",
        onSelect: () => {
          router.push(`/${tenantSlug}/customers/${c.id}`)
          onClose()
        },
      })
    })

    // Orders
    searchResults.orders.forEach((o: any) => {
      items.push({
        id: `live-order-${o.id}`,
        title: `Sipariş #${o.orderNumber || o.id.slice(0, 8)}`,
        subtitle: `Sipariş • ₺${(o.totalAmount || 0).toLocaleString("tr-TR")} • ${o.customerName || "Müşteri"} • ${o.status || ""}`,
        icon: ShoppingCart,
        category: "orders",
        onSelect: () => {
          router.push(`/${tenantSlug}/orders/${o.id}`)
          onClose()
        },
      })
    })

    // Products
    searchResults.products.forEach((p: any) => {
      items.push({
        id: `live-prod-${p.id}`,
        title: p.name || "İsimsiz Ürün",
        subtitle: `Ürün • ₺${(p.sellingPrice || 0).toLocaleString("tr-TR")} • SKU: ${p.sku || "—"} • Stok: ${p.stockQuantity ?? "—"}`,
        icon: Package,
        category: "products",
        onSelect: () => {
          router.push(`/${tenantSlug}/products/${p.id}`)
          onClose()
        },
      })
    })

    return items
  }, [searchResults, router, tenantSlug, onClose])

  // Filtered List
  const allFilteredItems = useMemo(() => {
    const q = query.toLowerCase().trim()

    // If query exists, filter navigation and actions
    const filteredNav = navItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    )

    const filteredActions = actionItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    )

    return [...dynamicLiveItems, ...filteredActions, ...filteredNav]
  }, [query, navItems, actionItems, dynamicLiveItems])

  // Reset selected index when query or results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, allFilteredItems.length])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeElement = listRef.current.querySelector(
      `[data-item-index="${selectedIndex}"]`
    ) as HTMLElement | null

    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  // Keyboard navigation inside Palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < allFilteredItems.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : Math.max(0, allFilteredItems.length - 1)
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (allFilteredItems[selectedIndex]) {
          allFilteredItems[selectedIndex].onSelect()
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    },
    [allFilteredItems, selectedIndex, onClose]
  )

  if (!isOpen) return null

  // Categorize for grouped display
  const categorized = {
    customers: allFilteredItems.filter((i) => i.category === "customers"),
    orders: allFilteredItems.filter((i) => i.category === "orders"),
    products: allFilteredItems.filter((i) => i.category === "products"),
    actions: allFilteredItems.filter((i) => i.category === "actions"),
    navigation: allFilteredItems.filter((i) => i.category === "navigation"),
  }

  let runningIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-16 sm:pt-24 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Header */}
        <div className="relative flex items-center border-slate-100 border-b px-4 py-3.5">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sayfa, eylem, müşteri, sipariş veya ürün ara..."
            type="text"
            value={query}
          />
          {liveLoading && (
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin mr-2 shrink-0" />
          )}
          {query ? (
            <button
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setQuery("")}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[60vh]"
        >
          {allFilteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-xs">
                "{query}" ile eşleşen sonuç bulunamadı
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Lütfen farklı bir arama terimi deneyin
              </p>
            </div>
          ) : (
            <>
              {/* Dynamic Customer Results */}
              {categorized.customers.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    Müşteriler
                  </div>
                  {categorized.customers.map((item) => {
                    const idx = runningIndex++
                    const isSelected = idx === selectedIndex
                    return (
                      <PaletteRow
                        key={item.id}
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Dynamic Order Results */}
              {categorized.orders.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    Siparişler
                  </div>
                  {categorized.orders.map((item) => {
                    const idx = runningIndex++
                    const isSelected = idx === selectedIndex
                    return (
                      <PaletteRow
                        key={item.id}
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Dynamic Product Results */}
              {categorized.products.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    Ürünler & Hizmetler
                  </div>
                  {categorized.products.map((item) => {
                    const idx = runningIndex++
                    const isSelected = idx === selectedIndex
                    return (
                      <PaletteRow
                        key={item.id}
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Actions */}
              {categorized.actions.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    Hızlı İşlemler
                  </div>
                  {categorized.actions.map((item) => {
                    const idx = runningIndex++
                    const isSelected = idx === selectedIndex
                    return (
                      <PaletteRow
                        key={item.id}
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Navigation */}
              {categorized.navigation.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    Sayfalar & Modüller
                  </div>
                  {categorized.navigation.map((item) => {
                    const idx = runningIndex++
                    const isSelected = idx === selectedIndex
                    return (
                      <PaletteRow
                        key={item.id}
                        index={idx}
                        isSelected={isSelected}
                        item={item}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Hotkey Legend */}
        <div className="flex items-center justify-between border-slate-100 border-t bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                ↑↓
              </kbd>
              <span>Gezin</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                ↵
              </kbd>
              <span>Seç</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
                Esc
              </kbd>
              <span>Kapat</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <span>Kısayollar için</span>
            <kbd
              className="rounded border border-slate-200 bg-white px-1 font-mono text-[10px] font-bold text-blue-600 shadow-2xs cursor-pointer hover:bg-blue-50"
              onClick={() => {
                onClose()
                onOpenShortcutsHelp()
              }}
            >
              ?
            </kbd>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaletteRow({
  item,
  isSelected,
  index,
  onHover,
}: {
  item: PaletteItem
  isSelected: boolean
  index: number
  onHover: () => void
}) {
  const Icon = item.icon

  return (
    <div
      data-item-index={index}
      className={`flex items-center justify-between rounded-2xl px-3 py-2.5 transition-all cursor-pointer ${
        isSelected
          ? "bg-blue-50 border border-blue-100 text-blue-950 shadow-2xs"
          : "hover:bg-slate-50 border border-transparent text-slate-800"
      }`}
      onClick={item.onSelect}
      onMouseEnter={onHover}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isSelected
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="truncate">
          <div className="font-semibold text-xs leading-tight truncate">
            {item.title}
          </div>
          {item.subtitle && (
            <div
              className={`text-[11px] truncate mt-0.5 ${
                isSelected ? "text-blue-700/80" : "text-slate-400"
              }`}
            >
              {item.subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {item.badge && (
          <kbd
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-2xs ${
              isSelected
                ? "border-blue-200 bg-white text-blue-800"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            {item.badge}
          </kbd>
        )}
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${
            isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-300"
          }`}
        />
      </div>
    </div>
  )
}
