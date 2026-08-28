"use client"

import { useState, useEffect, useRef, useId } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Bell,
  CheckCheck,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  Headphones,
  Kanban,
  Trash2,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react"

export interface CrmNotification {
  id: string
  title: string
  description: string
  category: "quote" | "order" | "shipment" | "support" | "deal"
  link: string
  createdAt: string
  read: boolean
  priority?: "low" | "medium" | "high" | "urgent"
  badgeText?: string
}

const DEFAULT_NOTIFICATIONS: CrmNotification[] = [
  {
    id: "notif-1",
    title: "Revizyon Talebi Alındı",
    description: "Ahmet Yılmaz (Acme A.Ş.) teklif için revizyon istedi: 'Ödeme vadesi 45 gün olarak güncellenebilir mi?'",
    category: "quote",
    link: "/quotes",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 dk önce
    read: false,
    priority: "urgent",
    badgeText: "Teklif #QT-2026-089",
  },
  {
    id: "notif-2",
    title: "Yeni Destek Talebi Başlatıldı",
    description: "Selin Kaya sipariş teslimat durumu hakkında canlı destek oturumu başlattı.",
    category: "support",
    link: "/messages",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 dk önce
    read: false,
    priority: "high",
    badgeText: "Canlı Destek",
  },
  {
    id: "notif-3",
    title: "Fırsat Kazanıldı 🎉",
    description: "Bulut Bilişim Projesi fırsatı 'Kazanıldı' aşamasına taşındı (145.000 ₺).",
    category: "deal",
    link: "/pipelines",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 saat önce
    read: false,
    priority: "medium",
    badgeText: "Satış Hattı",
  },
  {
    id: "notif-4",
    title: "Yeni Sipariş Oluşturuldu",
    description: "Global Teknoloji Ltd. #ORD-2026-014 numaralı siparişi onayladı (42.500 ₺).",
    category: "order",
    link: "/orders",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 saat önce
    read: true,
    priority: "medium",
    badgeText: "Sipariş #ORD-014",
  },
  {
    id: "notif-5",
    title: "Sevkiyat Kargoya Verildi",
    description: "#SHP-2026-104 numaralı kargo Yurtiçi Kargo ile yola çıktı.",
    category: "shipment",
    link: "/shipments",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 gün önce
    read: true,
    priority: "low",
    badgeText: "Sevkiyat",
  },
]

interface NotificationCenterProps {
  className?: string
  buttonClassName?: string
}

export function NotificationCenter({
  className = "",
  buttonClassName = "",
}: NotificationCenterProps) {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || ""
  const popoverId = useId()

  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all")
  const [notifications, setNotifications] = useState<CrmNotification[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const storageKey = `crm_notifications_${tenantSlug || "default"}`

  // Load notifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setNotifications(JSON.parse(saved))
      } else {
        setNotifications(DEFAULT_NOTIFICATIONS)
        localStorage.setItem(storageKey, JSON.stringify(DEFAULT_NOTIFICATIONS))
      }
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS)
    } finally {
      setIsLoaded(true)
    }
  }, [storageKey])

  // Sync to localStorage
  const updateNotifications = (newList: CrmNotification[]) => {
    setNotifications(newList)
    try {
      localStorage.setItem(storageKey, JSON.stringify(newList))
    } catch {
      // ignore
    }
  }

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    updateNotifications(updated)
  }

  const markAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n))
    updateNotifications(updated)
  }

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = notifications.filter(n => n.id !== id)
    updateNotifications(updated)
  }

  const clearAll = () => {
    updateNotifications([])
  }

  const handleNotificationClick = (item: CrmNotification) => {
    markAsRead(item.id)
    setIsOpen(false)
    const targetUrl = item.link.startsWith("/") ? `/${tenantSlug}${item.link}` : `/${tenantSlug}/${item.link}`
    router.push(targetUrl)
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === "unread") return !n.read
    return true
  })

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "Az önce"
    if (diffMins < 60) return `${diffMins} dk önce`
    if (diffHours < 24) return `${diffHours} sa önce`
    if (diffDays === 1) return "Dün"
    return `${diffDays} gün önce`
  }

  const getCategoryIcon = (category: CrmNotification["category"]) => {
    switch (category) {
      case "quote":
        return <FileSpreadsheet className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
      case "order":
        return <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case "shipment":
        return <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      case "support":
        return <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case "deal":
        return <Kanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      default:
        return <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
    }
  }

  const getCategoryBg = (category: CrmNotification["category"]) => {
    switch (category) {
      case "quote":
        return "bg-fuchsia-50 dark:bg-fuchsia-950/50 border-fuchsia-100 dark:border-fuchsia-900/40"
      case "order":
        return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40"
      case "shipment":
        return "bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/40"
      case "support":
        return "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40"
      case "deal":
        return "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40"
      default:
        return "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700"
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Bildirimler, ${unreadCount} okunmamış bildirim`}
        className={
          buttonClassName ||
          "relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-border dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        }
        onClick={() => setIsOpen(!isOpen)}
        title="Bildirimler"
        type="button"
      >
        <Bell className="h-4 w-4" />
        {isLoaded && unreadCount > 0 && (
          <>
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuchsia-500 ring-2 ring-white dark:ring-card" />
            </span>
          </>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="fixed inset-x-3 top-14 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xl dark:border-border dark:bg-card/95 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          id={popoverId}
          role="dialog"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-foreground">Bildirimler</h3>
                {unreadCount > 0 ? (
                  <p className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-semibold">
                    {unreadCount} yeni okunmamış bildirim
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400">Tümü okundu</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors dark:text-blue-400 dark:hover:bg-blue-950/50"
                  onClick={markAllAsRead}
                  title="Tümünü okundu işaretle"
                  type="button"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tümünü Oku</span>
                </button>
              )}
              <button
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2 dark:border-border dark:bg-muted/40 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  activeFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-card dark:text-foreground"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-400 dark:hover:text-foreground"
                }`}
                onClick={() => setActiveFilter("all")}
                type="button"
              >
                Tümü ({notifications.length})
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  activeFilter === "unread"
                    ? "bg-white text-fuchsia-600 shadow-2xs dark:bg-card dark:text-fuchsia-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-400 dark:hover:text-foreground"
                }`}
                onClick={() => setActiveFilter("unread")}
                type="button"
              >
                Okunmamış ({unreadCount})
              </button>
            </div>

            {notifications.length > 0 && (
              <button
                className="text-[10px] text-slate-400 hover:text-red-600 transition-colors dark:hover:text-red-400 font-medium"
                onClick={clearAll}
                type="button"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Notifications Stream */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-border/50">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-muted text-slate-400">
                  <Sparkles className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeFilter === "unread" ? "Okunmamış bildiriminiz yok" : "Henüz bir bildirim yok"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  CRM süreçlerindeki teklif, sipariş ve mesaj aktiviteleri burada listelenir.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  className={`group relative flex items-start gap-3 p-3.5 transition-all cursor-pointer select-none ${
                    item.read
                      ? "hover:bg-slate-50/80 dark:hover:bg-muted/30"
                      : "bg-fuchsia-50/30 hover:bg-fuchsia-50/60 dark:hover:bg-fuchsia-950/20 dark:hover:bg-fuchsia-950/40"
                  }`}
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                >
                  {/* Category Icon */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${getCategoryBg(
                      item.category
                    )}`}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs font-bold truncate ${
                            item.read
                              ? "text-slate-800 dark:text-foreground"
                              : "text-slate-900 font-extrabold dark:text-foreground"
                          }`}
                        >
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-fuchsia-500 shrink-0 ring-1 ring-white" />
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                      {item.description}
                    </p>

                    {/* Bottom Metadata & Badges */}
                    <div className="mt-2 flex items-center justify-between">
                      {item.badgeText && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 dark:bg-muted dark:text-slate-300">
                          {item.badgeText}
                        </span>
                      )}

                      {/* Hover Actions */}
                      <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                        {!item.read && (
                          <button
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-muted"
                            onClick={(e) => markAsRead(item.id, e)}
                            title="Okundu yap"
                            type="button"
                          >
                            <CheckCheck className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40"
                          onClick={(e) => deleteNotification(item.id, e)}
                          title="Sil"
                          type="button"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 text-center dark:border-border dark:bg-muted/30">
            <button
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
              onClick={() => {
                setIsOpen(false)
                router.push(`/${tenantSlug}/quotes`)
              }}
              type="button"
            >
              <span>Tüm Aktiviteleri Görüntüle</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
