"use client";

import {
  type HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { useRouter } from "next/navigation";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ApiClient, type NotificationDto } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
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
  clearAll: () => void;
  deleteNotification: (id: string) => void;
  isConnected: boolean;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  notifications: RealtimeNotification[];
  refreshNotifications: () => Promise<void>;
  triggerTestNotification: (
    preset?: "order" | "quote" | "deal" | "stock" | "support"
  ) => void;
  unreadCount: number;
}

const RealtimeNotificationContext =
  createContext<RealtimeNotificationContextType | null>(null);

function resolveTargetLink(
  linkUrl?: string,
  tenantSlug?: string
): string | undefined {
  if (!linkUrl) {
    return;
  }
  if (linkUrl.startsWith("/")) {
    return `/${tenantSlug || "workspace"}${linkUrl}`;
  }
  return linkUrl;
}

function inferCategory(title: string): RealtimeNotification["category"] {
  const lower = title.toLowerCase();
  if (lower.includes("sipariş") || lower.includes("order")) {
    return "order";
  }
  if (lower.includes("teklif") || lower.includes("quote")) {
    return "quote";
  }
  if (lower.includes("stok") || lower.includes("envanter")) {
    return "stock";
  }
  if (lower.includes("destek") || lower.includes("mesaj")) {
    return "support";
  }
  return "deal";
}

function resolvePriority(type: string): RealtimeNotification["priority"] {
  if (type === "error") {
    return "urgent";
  }
  if (type === "warning") {
    return "high";
  }
  return "medium";
}

function mapDtoToRealtime(dto: NotificationDto): RealtimeNotification {
  return {
    badgeText: undefined,
    category: inferCategory(dto.title),
    createdAt: dto.createdAt,
    description: dto.message,
    id: dto.id,
    link: dto.linkUrl || "",
    priority: resolvePriority(dto.type),
    read: dto.isRead,
    title: dto.title,
  };
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
          label:
            type === "warning" || type === "error" ? "İncele" : "Görüntüle",
          onClick: () => onNavigate(targetLink),
        }
      : undefined;

  if (type === "success") {
    toast.success(title, { action, description: message });
  } else if (type === "warning" || type === "error") {
    toast.error(title, { action, description: message });
  } else {
    toast(title, { action, description: message });
  }
}

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

  // 1. Initial LocalStorage Cache + Backend API Fetch
  const refreshNotifications = useCallback(async () => {
    if (!tenantSlug) {
      return;
    }
    try {
      const res = await ApiClient.getNotifications(tenantSlug, {
        pageSize: 50,
      });
      if (res.success && res.data?.items) {
        const remoteList = res.data.items.map(mapDtoToRealtime);
        syncNotifications(remoteList);
      }
    } catch {
      // ignore network errors
    }
  }, [tenantSlug, syncNotifications]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    refreshNotifications();
  }, [storageKey, refreshNotifications]);

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
      displayToast(payload.title, payload.message, type, targetLink, (url) =>
        router.push(url)
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
    if (typeof window === "undefined") {
      return;
    }

    const hubUrl = `${window.location.origin}/hubs/crm?tenantId=${
      tenantId || ""
    }`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        // The hub now requires an authenticated caller. A WebSocket handshake cannot carry
        // an Authorization header, so the token travels as a query parameter and the server
        // accepts it only under /hubs.
        accessTokenFactory: async () => {
          const { data } = await createClient().auth.getSession();
          return data.session?.access_token ?? "";
        },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10_000, 30_000])
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
          message:
            "Müşteri temsilcisine yeni bir canlı destek talebi iletildi.",
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

  const markAsRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      syncNotifications(updated);
      if (tenantSlug) {
        ApiClient.markNotificationAsRead(id, tenantSlug).catch(() => {
          // ignore network error
        });
      }
    },
    [notifications, syncNotifications, tenantSlug]
  );

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    syncNotifications(updated);
    if (tenantSlug) {
      ApiClient.markAllNotificationsAsRead(tenantSlug).catch(() => {
        // ignore network error
      });
    }
  }, [notifications, syncNotifications, tenantSlug]);

  const deleteNotification = useCallback(
    (id: string) => {
      const updated = notifications.filter((n) => n.id !== id);
      syncNotifications(updated);
      if (tenantSlug) {
        ApiClient.deleteNotification(id, tenantSlug).catch(() => {
          // ignore network error
        });
      }
    },
    [notifications, syncNotifications, tenantSlug]
  );

  const clearAll = useCallback(() => {
    syncNotifications([]);
    if (tenantSlug) {
      ApiClient.clearAllNotifications(tenantSlug).catch(() => {
        // ignore network error
      });
    }
  }, [syncNotifications, tenantSlug]);

  return (
    <RealtimeNotificationContext.Provider
      value={{
        clearAll,
        deleteNotification,
        isConnected,
        markAllAsRead,
        markAsRead,
        notifications,
        refreshNotifications,
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
