"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  FileSpreadsheet,
  Headphones,
  Kanban,
  Package,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  type RealtimeNotification,
  useRealtimeNotifications,
} from "@/lib/notifications/realtime-notification-context";

interface NotificationCenterProps {
  buttonClassName?: string;
  className?: string;
}

function formatTimeAgo(dateStr: string) {
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
}

function getCategoryIcon(category: RealtimeNotification["category"]) {
  switch (category) {
    case "quote":
      return (
        <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      );
    case "order":
      return (
        <ShoppingCart className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
      );
    case "shipment":
      return <Truck className="h-4 w-4 text-amber-700 dark:text-amber-400" />;
    case "support":
      return (
        <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      );
    case "deal":
      return (
        <Kanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      );
    case "stock":
      return <Package className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    default:
      return <Bell className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
  }
}

function getCategoryBg(category: RealtimeNotification["category"]) {
  switch (category) {
    case "quote":
      return "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40";
    case "order":
      return "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40";
    case "shipment":
      return "bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/40";
    case "support":
      return "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40";
    case "deal":
      return "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40";
    case "stock":
      return "bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/40";
    default:
      return "bg-zinc-50 dark:bg-zinc-800 border-border";
  }
}

interface NotificationItemRowProps {
  item: RealtimeNotification;
  onClick: (item: RealtimeNotification) => void;
  onDelete: (id: string) => void;
}

function NotificationItemRow({
  item,
  onClick,
  onDelete,
}: NotificationItemRowProps) {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [onClick, item]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(item.id);
    },
    [onDelete, item.id]
  );

  return (
    <div
      className={`group relative flex items-start gap-3 p-3.5 transition-colors ${
        item.read
          ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          : "bg-blue-50/30 hover:bg-blue-50/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
      }`}
    >
      <button
        className="flex flex-1 items-start gap-3 text-left"
        onClick={handleClick}
        type="button"
      >
        {/* Category Icon */}
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${getCategoryBg(
            item.category
          )}`}
        >
          {getCategoryIcon(item.category)}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                {item.title}
              </span>
              {item.read ? null : (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </div>
            <span className="shrink-0 text-3xs text-muted-foreground">
              {formatTimeAgo(item.createdAt)}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-2xs text-zinc-600 leading-relaxed dark:text-zinc-400">
            {item.description}
          </p>

          {item.badgeText ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-medium text-3xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {item.badgeText}
              </span>
              <span className="flex items-center gap-0.5 text-3xs text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                <span>Görüntüle</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </span>
            </div>
          ) : null}
        </div>
      </button>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="rounded-lg p-1 text-muted-foreground hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
          onClick={handleDelete}
          title="Sil"
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type TestPresetKey = "order" | "quote" | "deal" | "stock" | "support";

interface TestMenuItemButtonProps {
  label: string;
  onSelect: (key: TestPresetKey) => void;
  presetKey: TestPresetKey;
}

function TestMenuItemButton({
  label,
  presetKey,
  onSelect,
}: TestMenuItemButtonProps) {
  const handleClick = useCallback(() => {
    onSelect(presetKey);
  }, [onSelect, presetKey]);

  return (
    <button
      className="flex w-full items-center rounded-xl px-2.5 py-1.5 text-left font-medium text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      onClick={handleClick}
      type="button"
    >
      {label}
    </button>
  );
}

const TEST_PRESETS: { key: TestPresetKey; label: string }[] = [
  { key: "order", label: "🛒 Yeni Sipariş" },
  { key: "quote", label: "📄 Onaylanan Teklif" },
  { key: "deal", label: "⭐ Fırsat Kazanıldı" },
  { key: "stock", label: "⚠️ Kritik Stok" },
  { key: "support", label: "💬 Canlı Mesaj" },
];

function NotificationEmptyState({
  isUnreadFilter,
}: {
  isUnreadFilter: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-muted-foreground dark:bg-zinc-800">
        <Bell className="h-6 w-6" />
      </div>
      <h4 className="mt-3 font-semibold text-xs text-zinc-800 dark:text-zinc-200">
        Bildirim Bulunmuyor
      </h4>
      <p className="mt-1 text-2xs text-muted-foreground">
        {isUnreadFilter
          ? "Tüm bildirimleri okudunuz."
          : "Henüz yeni bir sistem bildirimi almadınız."}
      </p>
    </div>
  );
}

interface NotificationHeaderProps {
  isConnected: boolean;
  onMarkAllAsRead: () => void;
  onSelectPreset: (key: TestPresetKey) => void;
  onToggleTestMenu: () => void;
  showTestMenu: boolean;
  unreadCount: number;
}

function NotificationHeader({
  isConnected,
  unreadCount,
  showTestMenu,
  onToggleTestMenu,
  onSelectPreset,
  onMarkAllAsRead,
}: NotificationHeaderProps) {
  return (
    <div className="flex items-center justify-between border-border border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
              Bildirimler
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 font-bold text-3xs ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-zinc-100 text-muted-foreground dark:bg-zinc-800"
              }`}
              title={isConnected ? "SignalR Canlı Bağlı" : "Yeniden Bağlanıyor"}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "animate-pulse bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              {isConnected ? "Canlı" : "Bekliyor"}
            </span>
          </div>
          {unreadCount > 0 ? (
            <p className="font-semibold text-3xs text-blue-600 dark:text-blue-400">
              {unreadCount} yeni okunmamış bildirim
            </p>
          ) : (
            <p className="text-3xs text-muted-foreground">Tümü okundu</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 font-bold text-3xs text-blue-700 transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
            onClick={onToggleTestMenu}
            title="Test Bildirimi Gönder"
            type="button"
          >
            <Sparkles className="h-3 w-3" />
            <span>Test Et</span>
          </button>

          {showTestMenu ? (
            <div className="absolute top-8 right-0 z-50 w-44 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
              <div className="px-2 py-1 font-semibold text-3xs text-muted-foreground uppercase tracking-wider">
                Simülasyon Seç
              </div>
              {TEST_PRESETS.map((p) => (
                <TestMenuItemButton
                  key={p.key}
                  label={p.label}
                  onSelect={onSelectPreset}
                  presetKey={p.key}
                />
              ))}
            </div>
          ) : null}
        </div>

        {unreadCount > 0 ? (
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-2xs text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
            onClick={onMarkAllAsRead}
            title="Tümünü okundu işaretle"
            type="button"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tümünü Oku</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface NotificationTabsProps {
  activeFilter: "all" | "unread";
  onSelectAll: () => void;
  onSelectUnread: () => void;
  totalCount: number;
  unreadCount: number;
}

function NotificationTabs({
  activeFilter,
  totalCount,
  unreadCount,
  onSelectAll,
  onSelectUnread,
}: NotificationTabsProps) {
  return (
    <div className="flex items-center gap-1 border-border border-b bg-zinc-50/70 px-3 py-1.5 dark:bg-zinc-800/40">
      <button
        className={`rounded-lg px-2.5 py-1 font-semibold text-2xs transition-all ${activeFilter === "all" ? "bg-card text-zinc-900 shadow-2xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
        onClick={onSelectAll}
        type="button"
      >
        Tümü ({totalCount})
      </button>
      <button
        className={`rounded-lg px-2.5 py-1 font-semibold text-2xs transition-all ${activeFilter === "unread" ? "bg-card text-zinc-900 shadow-2xs dark:text-zinc-100" : "text-muted-foreground hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
        onClick={onSelectUnread}
        type="button"
      >
        Okunmamış ({unreadCount})
      </button>
    </div>
  );
}

export function NotificationCenter({
  className = "",
  buttonClassName = "",
}: NotificationCenterProps) {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params.tenantSlug as string) || "";

  const {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    triggerTestNotification,
  } = useRealtimeNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showTestMenu, setShowTestMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setShowTestMenu(false);
    }
  }, []);

  const handleToggleTestMenu = useCallback(() => {
    setShowTestMenu((prev) => !prev);
  }, []);

  const handleFilterAll = useCallback(() => {
    setActiveFilter("all");
  }, []);

  const handleFilterUnread = useCallback(() => {
    setActiveFilter("unread");
  }, []);

  const handleSelectPreset = useCallback(
    (key: TestPresetKey) => {
      triggerTestNotification(key);
      setShowTestMenu(false);
    },
    [triggerTestNotification]
  );

  const handleNotificationClick = useCallback(
    (item: RealtimeNotification) => {
      markAsRead(item.id);
      setIsOpen(false);
      const targetUrl = item.link.startsWith("/")
        ? `/${tenantSlug}${item.link}`
        : `/${tenantSlug}/${item.link}`;
      router.push(targetUrl);
    },
    [markAsRead, router, tenantSlug]
  );

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") {
      return !n.read;
    }
    return true;
  });

  return (
    <div className={`inline-block ${className}`}>
      <Popover onOpenChange={handleOpenChange} open={isOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label={`Bildirimler, ${unreadCount} okunmamış bildirim`}
            className={
              buttonClassName ||
              "relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-zinc-600 shadow-2xs transition-all hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }
            title="Bildirimler"
            type="button"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
              </span>
            ) : null}
          </button>
        </PopoverTrigger>

        {/* Popover Dropdown */}
        <PopoverContent
          align="end"
          className="w-[calc(100vw-1.5rem)] gap-0 overflow-hidden p-0 sm:w-96"
          collisionPadding={12}
          side="bottom"
          sideOffset={10}
        >
          <NotificationHeader
            isConnected={isConnected}
            onMarkAllAsRead={markAllAsRead}
            onSelectPreset={handleSelectPreset}
            onToggleTestMenu={handleToggleTestMenu}
            showTestMenu={showTestMenu}
            unreadCount={unreadCount}
          />

          <NotificationTabs
            activeFilter={activeFilter}
            onSelectAll={handleFilterAll}
            onSelectUnread={handleFilterUnread}
            totalCount={notifications.length}
            unreadCount={unreadCount}
          />

          {/* Notifications List */}
          <div className="custom-scrollbar max-h-80 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {filteredNotifications.length === 0 ? (
              <NotificationEmptyState
                isUnreadFilter={activeFilter === "unread"}
              />
            ) : (
              filteredNotifications.map((item) => (
                <NotificationItemRow
                  item={item}
                  key={item.id}
                  onClick={handleNotificationClick}
                  onDelete={deleteNotification}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 ? (
            <div className="flex items-center justify-between border-border border-t bg-zinc-50/50 p-2.5 dark:bg-zinc-800/30">
              <button
                className="font-semibold text-2xs text-muted-foreground transition-colors hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                onClick={clearAll}
                type="button"
              >
                Listeyi Temizle
              </button>
              <span className="text-3xs text-muted-foreground">
                {notifications.length} toplam bildirim
              </span>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
