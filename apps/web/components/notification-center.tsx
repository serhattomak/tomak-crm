"use client";

import {
  Bell,
  CheckCheck,
  ExternalLink,
  FileSpreadsheet,
  Headphones,
  Kanban,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export interface CrmNotification {
  badgeText?: string;
  category: "quote" | "order" | "shipment" | "support" | "deal";
  createdAt: string;
  description: string;
  id: string;
  link: string;
  priority?: "low" | "medium" | "high" | "urgent";
  read: boolean;
  title: string;
}

const DEFAULT_NOTIFICATIONS: CrmNotification[] = [
  {
    badgeText: "Teklif #QT-2026-089",
    category: "quote",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 dk önce
    description:
      "Ahmet Yılmaz (Acme A.Ş.) teklif için revizyon istedi: 'Ödeme vadesi 45 gün olarak güncellenebilir mi?'",
    id: "notif-1",
    link: "/quotes",
    priority: "urgent",
    read: false,
    title: "Revizyon Talebi Alındı",
  },
  {
    badgeText: "Canlı Destek",
    category: "support",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 dk önce
    description:
      "Selin Kaya sipariş teslimat durumu hakkında canlı destek oturumu başlattı.",
    id: "notif-2",
    link: "/messages",
    priority: "high",
    read: false,
    title: "Yeni Destek Talebi Başlatıldı",
  },
  {
    badgeText: "Satış Hattı",
    category: "deal",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 saat önce
    description:
      "Bulut Bilişim Projesi fırsatı 'Kazanıldı' aşamasına taşındı (145.000 ₺).",
    id: "notif-3",
    link: "/pipelines",
    priority: "medium",
    read: false,
    title: "Fırsat Kazanıldı 🎉",
  },
  {
    badgeText: "Sipariş #ORD-014",
    category: "order",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 saat önce
    description:
      "Global Teknoloji Ltd. #ORD-2026-014 numaralı siparişi onayladı (42.500 ₺).",
    id: "notif-4",
    link: "/orders",
    priority: "medium",
    read: true,
    title: "Yeni Sipariş Oluşturuldu",
  },
  {
    badgeText: "Sevkiyat",
    category: "shipment",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 gün önce
    description: "#SHP-2026-104 numaralı kargo Yurtiçi Kargo ile yola çıktı.",
    id: "notif-5",
    link: "/shipments",
    priority: "low",
    read: true,
    title: "Sevkiyat Kargoya Verildi",
  },
];

interface NotificationCenterProps {
  buttonClassName?: string;
  className?: string;
}

export function NotificationCenter({
  className = "",
  buttonClassName = "",
}: NotificationCenterProps) {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const popoverId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const storageKey = `crm_notifications_${tenantSlug || "default"}`;

  // Load notifications from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications(DEFAULT_NOTIFICATIONS);
        localStorage.setItem(storageKey, JSON.stringify(DEFAULT_NOTIFICATIONS));
      }
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Sync to localStorage
  const updateNotifications = (newList: CrmNotification[]) => {
    setNotifications(newList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);
  };

  const markAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    updateNotifications(updated);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    updateNotifications(updated);
  };

  const clearAll = () => {
    updateNotifications([]);
  };

  const handleNotificationClick = (item: CrmNotification) => {
    markAsRead(item.id);
    setIsOpen(false);
    const targetUrl = item.link.startsWith("/")
      ? `/${tenantSlug}${item.link}`
      : `/${tenantSlug}/${item.link}`;
    router.push(targetUrl);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") {
      return !n.read;
    }
    return true;
  });

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return "Az önce";
    }
    if (diffMins < 60) {
      return `${diffMins} dk önce`;
    }
    if (diffHours < 24) {
      return `${diffHours} sa önce`;
    }
    if (diffDays === 1) {
      return "Dün";
    }
    return `${diffDays} gün önce`;
  };

  const getCategoryIcon = (category: CrmNotification["category"]) => {
    switch (category) {
      case "quote":
        return (
          <FileSpreadsheet className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
        );
      case "order":
        return (
          <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        );
      case "shipment":
        return <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "support":
        return (
          <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        );
      case "deal":
        return (
          <Kanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        );
      default:
        return <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getCategoryBg = (category: CrmNotification["category"]) => {
    switch (category) {
      case "quote":
        return "bg-fuchsia-50 dark:bg-fuchsia-950/50 border-fuchsia-100 dark:border-fuchsia-900/40";
      case "order":
        return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40";
      case "shipment":
        return "bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/40";
      case "support":
        return "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40";
      case "deal":
        return "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40";
      default:
        return "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700";
    }
  };

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
          className="fade-in zoom-in-95 fixed inset-x-3 top-14 z-50 animate-in overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md duration-150 sm:absolute sm:inset-x-auto sm:top-11 sm:right-0 sm:w-96 dark:border-border dark:bg-card/95"
          id={popoverId}
          role="dialog"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-slate-100 border-b px-4 py-3 dark:border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs dark:text-foreground">
                  Bildirimler
                </h3>
                {unreadCount > 0 ? (
                  <p className="font-semibold text-[10px] text-fuchsia-600 dark:text-fuchsia-400">
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
                  className="flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-[11px] text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
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
          <div className="flex items-center justify-between border-slate-100 border-b bg-slate-50/70 px-4 py-2 text-xs dark:border-border dark:bg-muted/40">
            <div className="flex items-center gap-1.5">
              <button
                className={`rounded-lg px-2.5 py-1 font-semibold text-[11px] transition-all ${
                  activeFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-card dark:text-foreground"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-foreground dark:hover:text-slate-400"
                }`}
                onClick={() => setActiveFilter("all")}
                type="button"
              >
                Tümü ({notifications.length})
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 font-semibold text-[11px] transition-all ${
                  activeFilter === "unread"
                    ? "bg-white text-fuchsia-600 shadow-2xs dark:bg-card dark:text-fuchsia-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-foreground dark:hover:text-slate-400"
                }`}
                onClick={() => setActiveFilter("unread")}
                type="button"
              >
                Okunmamış ({unreadCount})
              </button>
            </div>

            {notifications.length > 0 && (
              <button
                className="font-medium text-[10px] text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                onClick={clearAll}
                type="button"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Notifications Stream */}
          <div className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto dark:divide-border/50">
            {filteredNotifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-muted">
                  <Sparkles className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="mt-3 font-bold text-slate-700 text-xs dark:text-slate-300">
                  {activeFilter === "unread"
                    ? "Okunmamış bildiriminiz yok"
                    : "Henüz bir bildirim yok"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  CRM süreçlerindeki teklif, sipariş ve mesaj aktiviteleri
                  burada listelenir.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  className={`group relative flex cursor-pointer select-none items-start gap-3 p-3.5 transition-all ${
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
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`truncate font-bold text-xs ${
                            item.read
                              ? "text-slate-800 dark:text-foreground"
                              : "font-extrabold text-slate-900 dark:text-foreground"
                          }`}
                        >
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-fuchsia-500 ring-1 ring-white" />
                        )}
                      </div>
                      <span className="shrink-0 font-medium text-[10px] text-slate-400">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-600 leading-relaxed dark:text-slate-400">
                      {item.description}
                    </p>

                    {/* Bottom Metadata & Badges */}
                    <div className="mt-2 flex items-center justify-between">
                      {item.badgeText && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-[9px] text-slate-700 dark:bg-muted dark:text-slate-300">
                          {item.badgeText}
                        </span>
                      )}

                      {/* Hover Actions */}
                      <div className="ml-auto flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100 sm:opacity-0">
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
          <div className="border-slate-100 border-t bg-slate-50/50 p-2.5 text-center dark:border-border dark:bg-muted/30">
            <button
              className="inline-flex items-center gap-1 font-semibold text-[11px] text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
              onClick={() => {
                setIsOpen(false);
                router.push(`/${tenantSlug}/quotes`);
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
  );
}
