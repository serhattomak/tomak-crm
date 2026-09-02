"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { playNotificationChime } from "./audio-chime";

export interface RealtimeNotification {
  badgeText?: string;
  category: "quote" | "order" | "shipment" | "support" | "deal" | "stock";
  createdAt: string;
  description: string;
  id: string;
  link: string;
  priority?: "low" | "medium" | "high" | "urgent";
  read: boolean;
  title: string;
}

interface RealtimeNotificationContextType {
  isConnected: boolean;
  notifications: RealtimeNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  triggerTestNotification: (
    preset?: "order" | "quote" | "deal" | "stock" | "support"
  ) => void;
}

const RealtimeNotificationContext =
  createContext<RealtimeNotificationContextType | null>(null);

function resolveTargetLink(linkUrl?: string, tenantSlug?: string): string | undefined {
  if (!linkUrl) return undefined;
  if (linkUrl.startsWith("/")) {
    return `/${tenantSlug || "workspace"}${linkUrl}`;
  }
  return linkUrl;
}

function inferCategory(title: string): RealtimeNotification["category"] {
  const lower = title.toLowerCase();
  if (lower.includes("sipariş") || lower.includes("order")) return "order";
  if (lower.includes("teklif") || lower.includes("quote")) return "quote";
  if (lower.includes("stok") || lower.includes("envanter")) return "stock";
  if (lower.includes("destek") || lower.includes("mesaj")) return "support";
  return "deal";
}

function resolvePriority(type: string): RealtimeNotification["priority"] {
  if (type === "error") return "urgent";
  if (type === "warning") return "high";
  return "medium";
}

function displayToast(
  title: string,
  message: string,
  type: string,
  targetLink?: string,
  onNavigate?: (url: string) => void
) {
  const action =
    targetLink && onNavigate
      ? {
          label: type === "warning" || type === "error" ? "İncele" : "Görüntüle",
          onClick: () => onNavigate(targetLink),
        }
      : undefined;

  if (type === "success") {
    toast.success(title, { description: message, action });
  } else if (type === "warning" || type === "error") {
    toast.error(title, { description: message, action });
  } else {
    toast(title, { description: message, action });
  }
}

const DEFAULT_INITIAL_NOTIFICATIONS: RealtimeNotification[] = [
  {
    badgeText: "Teklif #QT-2026-089",
    category: "quote",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
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
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
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
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
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
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    description: "#SHP-2026-104 numaralı kargo Yurtiçi Kargo ile yola çıktı.",
    id: "notif-5",
    link: "/shipments",
    priority: "low",
    read: true,
    title: "Sevkiyat Kargoya Verildi",
  },
];

export function RealtimeNotificationProvider({
  tenantId,
  tenantSlug,
  children,
}: {
  tenantId?: string;
  tenantSlug?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    []
  );
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  const storageKey = `crm_notifications_${tenantSlug || "default"}`;

  // 1. Initial LocalStorage Sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications(DEFAULT_INITIAL_NOTIFICATIONS);
        localStorage.setItem(
          storageKey,
          JSON.stringify(DEFAULT_INITIAL_NOTIFICATIONS)
        );
      }
    } catch {
      setNotifications(DEFAULT_INITIAL_NOTIFICATIONS);
    }
  }, [storageKey]);

  // Sync state to localStorage
  const syncNotifications = useCallback(
    (newList: RealtimeNotification[]) => {
      setNotifications(newList);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newList));
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  // 2. Incoming Notification Handler
  const handleIncomingNotification = useCallback(
    (payload: {
      id?: string;
      title: string;
      message: string;
      linkUrl?: string;
      type?: "info" | "success" | "warning" | "error";
      category?: string;
      createdAt?: string;
    }) => {
      const type = payload.type || "info";
      playNotificationChime(type);

      const targetLink = resolveTargetLink(payload.linkUrl, tenantSlug);
      displayToast(
        payload.title,
        payload.message,
        type,
        targetLink,
        (url) => router.push(url)
      );

      const cat = inferCategory(payload.title);
      const priority = resolvePriority(type);

      const newNotif: RealtimeNotification = {
        category: cat,
        createdAt: payload.createdAt || new Date().toISOString(),
        description: payload.message,
        id: payload.id || `live-${Date.now()}`,
        link: payload.linkUrl || "/orders",
        priority,
        read: false,
        title: payload.title,
      };

      setNotifications((prev) => {
        const next = [newNotif, ...prev];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [router, storageKey, tenantSlug]
  );

  // 3. Connect to SignalR Hub
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hubUrl = `${window.location.origin}/hubs/crm?tenantId=${
      tenantId || ""
    }`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.None)
      .build();

    connectionRef.current = connection;

    connection.on("ReceiveNotification", (payload) => {
      handleIncomingNotification(payload);
    });

    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => setIsConnected(false));

    connection
      .start()
      .then(() => {
        setIsConnected(true);
      })
      .catch(() => {
        setIsConnected(false);
      });

    return () => {
      connection.stop().catch(() => {
        /* ignore disconnect error on unmount */
      });
    };
  }, [handleIncomingNotification, tenantId]);

  // 4. Test Notification Trigger
  const triggerTestNotification = useCallback(
    (preset: "order" | "quote" | "deal" | "stock" | "support" = "order") => {
      const presets = {
        deal: {
          linkUrl: "/pipelines",
          message:
            "ERP Entegrasyon Projesi satış boru hattında 'Kazanıldı' statüsüne taşındı.",
          title: "Fırsat Kazanıldı ⭐",
          type: "info" as const,
        },
        order: {
          linkUrl: "/orders",
          message: `#ORD-2026-${Math.floor(
            100 + Math.random() * 900
          )} numaralı kurumsal sipariş oluşturuldu (58.400 ₺).`,
          title: "Yeni Sipariş Alındı 🛒",
          type: "success" as const,
        },
        quote: {
          linkUrl: "/quotes",
          message:
            "Akasya Bilişim A.Ş. hazırlanan kurumsal bulut teklifini dijital imza ile onayladı.",
          title: "Teklif Onaylandı! 🎉",
          type: "success" as const,
        },
        stock: {
          linkUrl: "/products",
          message:
            "Kablosuz Barkod Okuyucu X-200 stoku kritik seviyenin altına düştü (Kalan: 2 Adet).",
          title: "Kritik Stok Uyarısı! ⚠️",
          type: "warning" as const,
        },
        support: {
          linkUrl: "/messages",
          message: "Müşteri temsilcisine yeni bir canlı destek talebi iletildi.",
          title: "Yeni Müşteri Mesajı 💬",
          type: "info" as const,
        },
      };

      const selected = presets[preset];
      handleIncomingNotification({
        id: `test-${Date.now()}`,
        linkUrl: selected.linkUrl,
        message: selected.message,
        title: selected.title,
        type: selected.type,
      });
    },
    [handleIncomingNotification]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    syncNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    syncNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    syncNotifications(updated);
  };

  const clearAll = () => {
    syncNotifications([]);
  };

  return (
    <RealtimeNotificationContext.Provider
      value={{
        clearAll,
        deleteNotification,
        isConnected,
        markAllAsRead,
        markAsRead,
        notifications,
        triggerTestNotification,
        unreadCount,
      }}
    >
      {children}
    </RealtimeNotificationContext.Provider>
  );
}

export function useRealtimeNotifications() {
  const context = useContext(RealtimeNotificationContext);
  if (!context) {
    throw new Error(
      "useRealtimeNotifications must be used within RealtimeNotificationProvider"
    );
  }
  return context;
}
