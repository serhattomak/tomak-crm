"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { toast } from "@workspace/ui/components/sonner";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Hash,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Package,
  Pencil,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  UserPlus,
  Users,
  Users2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiClient,
  type CannedResponseDto,
  type ChatChannelDto,
  type ChatMessageDto,
  type CustomerListDto,
  type OrderListDto,
  type ProductListDto,
  type TenantUserDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import { WhatsAppChatDrawer } from "@/components/chat/whatsapp-chat-drawer";

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant, profile } = usePermissions();
  const activeTenantId = activeTenant?.id;

  // State
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);
  const [isNewDmModalOpen, setIsNewDmModalOpen] = useState(false);
  const [isChannelsCollapsed, setIsChannelsCollapsed] = useState(false);
  const [isDmsCollapsed, setIsDmsCollapsed] = useState(false);
  const [teamUsers, setTeamUsers] = useState<TenantUserDto[]>([]);
  const [loadingTeamUsers, setLoadingTeamUsers] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [startingDmUserId, setStartingDmUserId] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChatChannelDto[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannelDto | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Input & Messaging state
  const [messageInput, setMessageInput] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Edit / Delete / Undo state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Modals state
  const [isEntityPickerOpen, setIsEntityPickerOpen] = useState(false);
  const [isCannedResponsesOpen, setIsCannedResponsesOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  // Entity Picker data
  const [entityType, setEntityType] = useState<
    "Customer" | "Order" | "Product"
  >("Customer");
  const [entitySearch, setEntitySearch] = useState("");
  const [customersList, setCustomersList] = useState<CustomerListDto[]>([]);
  const [ordersList, setOrdersList] = useState<OrderListDto[]>([]);
  const [productsList, setProductsList] = useState<ProductListDto[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Canned responses data
  const [cannedResponses, setCannedResponses] = useState<CannedResponseDto[]>(
    []
  );

  // Form states for new channel
  const [newChannelTitle, setNewChannelTitle] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load Channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await ApiClient.getChatChannels({}, activeTenantId);
      if (res.success && res.data) {
        const channelsData = res.data;
        setChannels(channelsData);
        // Only auto-select first channel on desktop so mobile displays conversation list initially
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          setSelectedChannel((prev) => {
            if (prev) {
              return prev;
            }
            const defaultChannel =
              channelsData.find((c) => c.type !== "CustomerSupport") ||
              channelsData[0];
            return defaultChannel || null;
          });
        }
      }
    } catch {
      toast.error("Kanallar yüklenirken bir hata oluştu.");
    } finally {
      setLoadingChannels(false);
    }
  }, [activeTenantId]);

  const fetchCannedResponses = useCallback(async () => {
    try {
      const res = await ApiClient.getCannedResponses({}, activeTenantId);
      if (res.success && res.data) {
        setCannedResponses(res.data);
      }
    } catch {
      // ignore
    }
  }, [activeTenantId]); // Fetch Team Users for DM
  const fetchTeamUsers = useCallback(async () => {
    if (!activeTenantId) {
      return;
    }
    try {
      setLoadingTeamUsers(true);
      const res = await ApiClient.getTenantUsers(activeTenantId);
      if (res.success && res.data) {
        setTeamUsers(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTeamUsers(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    if (isNewDmModalOpen) {
      fetchTeamUsers();
    }
  }, [isNewDmModalOpen, fetchTeamUsers]);

  // Filtered team users excluding current user
  const filteredTeamUsers = useMemo(() => {
    const currentId = profile?.id;
    return teamUsers
      .filter((u) => u.id !== currentId)
      .filter((u) => {
        if (!dmSearchQuery.trim()) {
          return true;
        }
        const q = dmSearchQuery.toLowerCase();
        return (
          u.fullName?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.roles?.some((r) => r.name.toLowerCase().includes(q))
        );
      });
  }, [teamUsers, profile?.id, dmSearchQuery]);

  // Helper to resolve channel display metadata (Handles DMs dynamically)
  const getChannelDisplayInfo = useCallback(
    (channel: ChatChannelDto) => {
      if (channel.type === "Direct") {
        const otherParticipant = channel.participants?.find(
          (p) => p.userId !== profile?.id
        );
        if (otherParticipant) {
          const initials = (otherParticipant.userName || "CA")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return {
            avatarUrl: otherParticipant.userAvatarUrl,
            initials,
            isDirect: true,
            isOnline: true,
            role:
              otherParticipant.role === "Owner" ||
              otherParticipant.role === "Admin"
                ? "Yönetici"
                : "Ekip Üyesi",
            subtitle: otherParticipant.userEmail || "Çalışma Arkadaşı",
            title: otherParticipant.userName || "Çalışma Arkadaşı",
          };
        }
      }

      return {
        avatarUrl: null,
        initials: "#",
        isDirect: false,
        isOnline: false,
        role: "Kanal",
        subtitle: channel.description || "Genel Kanal",
        title: channel.title.startsWith("#")
          ? channel.title
          : `# ${channel.title}`,
      };
    },
    [profile?.id]
  );

  // Start or open direct message with colleague
  const handleStartDirectMessage = async (targetUser: TenantUserDto) => {
    if (!(activeTenantId && profile)) {
      return;
    }

    try {
      setStartingDmUserId(targetUser.id);
      const res = await ApiClient.getOrCreateDirectChat(
        {
          currentUserAvatarUrl: profile.avatarUrl,
          currentUserEmail: profile.email,
          currentUserId: profile.id,
          currentUserName: profile.fullName || profile.email || "Kullanıcı",
          targetUserAvatarUrl: targetUser.avatarUrl,
          targetUserEmail: targetUser.email,
          targetUserId: targetUser.id,
          targetUserName: targetUser.fullName || targetUser.email,
        },
        activeTenantId
      );

      if (res.success && res.data) {
        const directChan = res.data;
        setChannels((prev) => {
          const exists = prev.some((c) => c.id === directChan.id);
          return exists ? prev : [directChan, ...prev];
        });
        setSelectedChannel(directChan);
        setIsNewDmModalOpen(false);
        setDmSearchQuery("");
        toast.success(
          `${targetUser.fullName || targetUser.email} ile sohbet açıldı.`
        );
      } else {
        toast.error(res.message || "Direkt mesaj başlatılamadı.");
      }
    } catch {
      toast.error("Direkt mesaj başlatılırken bir hata oluştu.");
    } finally {
      setStartingDmUserId(null);
    }
  };

  // Global Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEntityPickerOpen(false);
        setIsCannedResponsesOpen(false);
        setIsCreateChannelOpen(false);
        setIsNewDmModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    fetchChannels();
    fetchCannedResponses();
  }, [fetchChannels, fetchCannedResponses]);

  // Load Messages when selectedChannel changes
  useEffect(() => {
    if (!selectedChannel) {
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await ApiClient.getChatMessages(
          selectedChannel.id,
          100,
          activeTenantId
        );
        if (res.success && res.data) {
          setMessages(res.data);
          setTimeout(scrollToBottom, 100);
        }
      } catch {
        toast.error("Mesajlar yüklenemedi.");
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedChannel, activeTenantId]);

  // Handle Send Message
  const handleSendMessage = async (embedData?: {
    entityId: string;
    entityStatus?: string;
    entitySubtitle?: string;
    entityTitle: string;
    entityType: string;
  }) => {
    if (!selectedChannel) {
      return;
    }
    if (!(messageInput.trim() || embedData)) {
      return;
    }

    try {
      setSendingMessage(true);
      const payload = {
        channelId: selectedChannel.id,
        content: messageInput.trim(),
        entityEmbeds: embedData ? [embedData] : undefined,
        messageType: isInternalNote
          ? "InternalNote"
          : embedData
            ? "EntityEmbed"
            : "Text",
        senderAvatarUrl: profile?.avatarUrl,
        senderName: profile?.fullName || profile?.email || "Siz",
        senderType: "User",
        senderUserId: profile?.id,
      };

      const res = await ApiClient.sendChatMessage(payload, activeTenant?.id);
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setMessageInput("");
        setIsInternalNote(false);
        setTimeout(scrollToBottom, 50);
      } else {
        toast.error(res.message || "Mesaj gönderilemedi.");
      }
    } catch {
      toast.error("Mesaj gönderilirken bir hata oluştu.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Edit Message
  const handleStartEdit = (msg: ChatMessageDto) => {
    setEditingMessageId(msg.id);
    setEditInput(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditInput("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editInput.trim()) {
      return;
    }

    try {
      setSavingEdit(true);
      const res = await ApiClient.editChatMessage(
        messageId,
        { content: editInput.trim() },
        activeTenant?.id
      );
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? res.data! : m))
        );
        toast.success("Mesaj güncellendi.");
        setEditingMessageId(null);
        setEditInput("");
      } else {
        toast.error(res.message || "Mesaj düzenlenemedi.");
      }
    } catch {
      toast.error("Mesaj düzenlenirken bir hata oluştu.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete Message with Undo (Geri Al) Toast
  const handleDeleteMessage = async (msg: ChatMessageDto) => {
    // Optimistic removal
    const originalMessages = [...messages];
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    try {
      const res = await ApiClient.deleteChatMessage(msg.id, activeTenant?.id);
      if (res.success) {
        toast("Mesaj silindi", {
          action: {
            label: "Geri Al",
            onClick: async () => {
              try {
                const restoreRes = await ApiClient.restoreChatMessage(
                  msg.id,
                  activeTenant?.id
                );
                if (restoreRes.success && restoreRes.data) {
                  setMessages((prev) =>
                    [...prev, restoreRes.data!].sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                    )
                  );
                  toast.success("Mesaj geri yüklendi.");
                }
              } catch {
                toast.error("Mesaj geri alınırken hata oluştu.");
              }
            },
          },
          duration: 7000,
        });
      } else {
        setMessages(originalMessages);
        toast.error(res.message || "Mesaj silinemedi.");
      }
    } catch {
      setMessages(originalMessages);
      toast.error("Mesaj silinirken bir hata oluştu.");
    }
  };

  // Handle Copy Message
  const handleCopyMessage = (msg: ChatMessageDto) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMessageId(msg.id);
    toast.success("Mesaj kopyalandı.");
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Create Channel
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelTitle.trim()) {
      return;
    }

    try {
      const res = await ApiClient.createChatChannel(
        {
          description: newChannelDesc.trim(),
          isPrivate: newChannelIsPrivate,
          title: newChannelTitle.trim(),
          type: "Group",
        },
        activeTenant?.id
      );

      if (res.success && res.data) {
        toast.success("Kanal başarıyla oluşturuldu.");
        setIsCreateChannelOpen(false);
        setNewChannelTitle("");
        setNewChannelDesc("");
        setNewChannelIsPrivate(false);
        await fetchChannels();
        setSelectedChannel(res.data);
      }
    } catch {
      toast.error("Kanal oluşturulurken hata oluştu.");
    }
  };

  // Load Entities for Picker Modal
  const loadEntities = useCallback(async () => {
    if (!activeTenantId) {
      return;
    }
    try {
      if (entityType === "Customer") {
        const res = await ApiClient.getCustomers(activeTenantId, {
          search: entitySearch,
        });
        if (res.success && res.data) {
          setCustomersList(res.data.items || []);
        }
      } else if (entityType === "Order") {
        const res = await ApiClient.getOrders(
          { search: entitySearch },
          activeTenantId
        );
        if (res.success && res.data) {
          setOrdersList(res.data.items || []);
        }
      } else if (entityType === "Product") {
        const res = await ApiClient.getProducts(
          { search: entitySearch },
          activeTenantId
        );
        if (res.success && res.data) {
          setProductsList(res.data.items || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingEntities(false);
    }
  }, [activeTenantId, entityType, entitySearch]);

  useEffect(() => {
    if (isEntityPickerOpen) {
      loadEntities();
    }
  }, [isEntityPickerOpen, loadEntities]);

  // Filtered Channels (Only Team Channels & Direct Messages)
  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      // Exclude customer support sessions
      if (c.type === "CustomerSupport") {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchParticipant = c.participants?.some(
          (p) =>
            p.userName?.toLowerCase().includes(q) ||
            p.userEmail?.toLowerCase().includes(q)
        );
        if (!(matchTitle || matchParticipant)) {
          return false;
        }
      }

      return true;
    });
  }, [channels, searchQuery]);

  const groupChannels = useMemo(
    () =>
      filteredChannels.filter(
        (c) => c.type !== "CustomerSupport" && c.type !== "Direct"
      ),
    [filteredChannels]
  );

  const directChannels = useMemo(
    () => filteredChannels.filter((c) => c.type === "Direct"),
    [filteredChannels]
  );

  const renderChannelItem = (channel: ChatChannelDto) => {
    const isSelected = selectedChannel?.id === channel.id;
    const isDirect = channel.type === "Direct";
    const displayInfo = getChannelDisplayInfo(channel);

    let activeClasses =
      "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-muted/40";
    if (isSelected) {
      activeClasses = isDirect
        ? "border border-blue-200 bg-blue-50/90 text-blue-950 shadow-2xs dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-100"
        : "border border-blue-100 bg-blue-50/80 text-blue-950 shadow-2xs dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-100";
    }

    return (
      <div
        className={`group flex cursor-pointer select-none items-start gap-2.5 rounded-xl p-2 transition-all ${activeClasses}`}
        key={channel.id}
        onClick={() => setSelectedChannel(channel)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedChannel(channel);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Icon / Avatar */}
        <div className="relative shrink-0">
          {isDirect && displayInfo.avatarUrl ? (
            <img
              alt={displayInfo.title}
              className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
              height={36}
              src={displayInfo.avatarUrl}
              width={36}
            />
          ) : isDirect ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 text-xs shadow-2xs dark:bg-blue-950/60 dark:text-blue-300">
              {displayInfo.initials}
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 font-bold text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              <Hash className="h-4 w-4" />
            </div>
          )}

          {/* Online status indicator for DMs */}
          {isDirect && (
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
          )}
        </div>

        {/* Channel / DM Info */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-bold text-xs">
              {displayInfo.title}
            </span>
            {channel.lastMessageAt && (
              <span className="shrink-0 text-3xs text-muted-foreground">
                {new Date(channel.lastMessageAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-2xs text-zinc-500 dark:text-zinc-400">
            {channel.lastMessagePreview ||
              (isDirect ? displayInfo.subtitle : channel.description) ||
              "Henüz mesaj yok."}
          </p>
        </div>
      </div>
    );
  };

  return (
    <PageContainer
      bleed
      className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-zinc-50 dark:bg-background"
    >
      {/* Top Header Bar (Hidden on mobile if a chat is active) */}
      <div
        className={`shrink-0 flex-wrap items-center justify-between gap-2.5 border-border border-b bg-card p-3 sm:flex-nowrap sm:px-6 sm:py-3 dark:border-border dark:bg-card ${selectedChannel ? "hidden md:flex" : "flex"}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-bold text-sm text-zinc-900 sm:text-base dark:text-foreground">
                Ekip İçi Sohbet
              </h1>
              <p className="hidden text-2xs text-zinc-500 sm:block sm:text-xs dark:text-muted-foreground dark:text-zinc-400">
                Kanallar ve çalışma arkadaşlarınızla birebir direkt mesajlaşma
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="h-8 border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 text-xs shadow-2xs hover:bg-emerald-100 sm:h-9 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/80"
            onClick={() => setIsWhatsAppDrawerOpen(true)}
            size="sm"
            variant="outline"
          >
            <MessageCircle className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>WhatsApp Sohbet</span>
          </Button>
          <Button
            className="h-8 border border-border bg-card font-semibold text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 sm:h-9 dark:text-zinc-200 dark:hover:bg-zinc-700"
            onClick={() => setIsCreateChannelOpen(true)}
            size="sm"
            variant="outline"
          >
            <Hash className="mr-1 h-3.5 w-3.5 text-zinc-500" />
            <span>Yeni Kanal</span>
          </Button>
          <Button
            className="h-8 bg-blue-600 font-semibold text-white text-xs shadow-xs hover:bg-blue-700 sm:h-9"
            onClick={() => setIsNewDmModalOpen(true)}
            size="sm"
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            <span>Yeni DM</span>
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Channels / Conversations List */}
        <div
          className={`flex-col border-border border-r bg-card dark:border-border dark:bg-card ${selectedChannel ? "hidden md:flex md:w-80 md:shrink-0" : "flex w-full"}`}
        >
          {/* Search Box */}
          <div className="border-border border-b p-3 dark:border-border">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-xl border border-border bg-zinc-50 py-1.5 pr-3 pl-9 text-xs text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Kanal veya çalışma arkadaşı ara..."
                value={searchQuery}
              />
            </div>
          </div>

          {/* List Stream */}
          <div className="flex-1 space-y-3 overflow-y-auto p-2">
            {loadingChannels ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Kanallar yükleniyor...
              </div>
            ) : (
              /* Slack Dual Section */
              <div className="space-y-4">
                {/* 1. KANALLAR SECTION */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 font-bold text-2xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    <button
                      className="flex items-center gap-1 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
                      onClick={() => setIsChannelsCollapsed((prev) => !prev)}
                      type="button"
                    >
                      {isChannelsCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      <span>Kanallar</span>
                      <span className="rounded-full bg-zinc-200/70 px-1.5 py-0.2 font-mono text-3xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {groupChannels.length}
                      </span>
                    </button>
                    <button
                      className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                      onClick={() => setIsCreateChannelOpen(true)}
                      title="Yeni Kanal Oluştur"
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {!isChannelsCollapsed && (
                    <div className="space-y-0.5">
                      {groupChannels.length === 0 ? (
                        <div className="px-3 py-2 text-2xs text-muted-foreground italic">
                          Kanal bulunamadı.
                        </div>
                      ) : (
                        groupChannels.map((channel) =>
                          renderChannelItem(channel)
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* 2. DİREKT MESAJLAR SECTION */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 font-bold text-2xs text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    <button
                      className="flex items-center gap-1 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
                      onClick={() => setIsDmsCollapsed((prev) => !prev)}
                      type="button"
                    >
                      {isDmsCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      <span>Direkt Mesajlar</span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.2 font-mono text-3xs text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                        {directChannels.length}
                      </span>
                    </button>
                    <button
                      className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                      onClick={() => setIsNewDmModalOpen(true)}
                      title="Yeni Direkt Mesaj Başlat"
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {!isDmsCollapsed && (
                    <div className="space-y-0.5">
                      {directChannels.length === 0 ? (
                        <div className="my-1 rounded-xl border border-border border-dashed p-3 text-center">
                          <p className="text-2xs text-zinc-500 dark:text-zinc-400">
                            Henüz bir direkt mesaj yok.
                          </p>
                          <button
                            className="mt-1.5 inline-flex items-center gap-1 font-bold text-2xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            onClick={() => setIsNewDmModalOpen(true)}
                            type="button"
                          >
                            <UserPlus className="h-3 w-3" />
                            <span>Kişi Seç & DM Başlat</span>
                          </button>
                        </div>
                      ) : (
                        directChannels.map((channel) =>
                          renderChannelItem(channel)
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Chat Conversation Stream */}
        {selectedChannel ? (
          <div className="flex w-full flex-1 flex-col overflow-hidden bg-card dark:bg-card">
            {/* Active Chat Header */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-border border-b px-3 py-2.5 sm:px-6 sm:py-3.5 dark:border-border">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {/* Mobile Back Button */}
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 shadow-2xs transition hover:bg-zinc-200 active:scale-95 md:hidden dark:bg-zinc-800 dark:text-zinc-300"
                  onClick={() => setSelectedChannel(null)}
                  title="Listeye Dön"
                  type="button"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>

                {/* Avatar / Icon with online dot */}
                <div className="relative shrink-0">
                  {selectedChannel.type === "Direct" ? (
                    (() => {
                      const displayInfo =
                        getChannelDisplayInfo(selectedChannel);
                      return displayInfo.avatarUrl ? (
                        <img
                          alt={displayInfo.title}
                          className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-200 sm:h-10 sm:w-10 dark:ring-zinc-800"
                          height={40}
                          src={displayInfo.avatarUrl}
                          width={40}
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 text-xs sm:h-10 sm:w-10 dark:bg-blue-950/60 dark:text-blue-300">
                          {displayInfo.initials}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 font-bold text-zinc-700 sm:h-10 sm:w-10 dark:bg-zinc-800 dark:text-zinc-300">
                      <Hash className="h-4.5 w-4.5" />
                    </div>
                  )}

                  {selectedChannel.type === "Direct" && (
                    <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="max-w-[140px] truncate font-bold text-xs text-zinc-900 sm:max-w-xs sm:text-sm dark:text-foreground">
                      {selectedChannel.type === "Direct"
                        ? getChannelDisplayInfo(selectedChannel).title
                        : selectedChannel.title}
                    </h2>
                    {selectedChannel.type === "Direct" ? (
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.2 font-semibold text-3xs text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {getChannelDisplayInfo(selectedChannel).role}
                      </span>
                    ) : selectedChannel.isPrivate ? (
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : null}
                  </div>
                  <p className="max-w-[140px] truncate text-3xs text-zinc-500 sm:max-w-xs sm:text-xs dark:text-zinc-400">
                    {selectedChannel.type === "Direct"
                      ? getChannelDisplayInfo(selectedChannel).subtitle
                      : selectedChannel.description ||
                        `${selectedChannel.participants?.length || 1} Katılımcı`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50/50 p-3 sm:p-6 dark:bg-background/50 dark:bg-zinc-800/30">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Mesajlar yükleniyor...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-foreground dark:text-zinc-200">
                    Sohbet Başlatın
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
                    Bu konuşmada henüz bir mesaj bulunmuyor. Aşağıdan bir mesaj
                    yazabilir veya CRM kartı ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe =
                    (profile?.id && msg.senderUserId === profile.id) ||
                    msg.senderName.includes("Siz") ||
                    (profile?.fullName && msg.senderName === profile.fullName);
                  const isSystem = msg.messageType === "SystemEvent";
                  const isInternal = msg.messageType === "InternalNote";
                  const isEditing = editingMessageId === msg.id;

                  if (isSystem) {
                    return (
                      <div className="my-2 flex justify-center" key={msg.id}>
                        <span className="rounded-full bg-zinc-200/80 px-3 py-1 font-medium text-2xs text-zinc-600 dark:bg-muted dark:text-zinc-300">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  if (isInternal) {
                    return (
                      <div
                        className="group relative my-3 flex justify-center"
                        key={msg.id}
                      >
                        <div className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/40">
                          <div className="flex items-center justify-between font-bold text-amber-800 text-xs dark:text-amber-300">
                            <div className="flex items-center gap-1.5">
                              <Lock className="h-3.5 w-3.5" />
                              <span>Dahili Ekip Notu (Whisper)</span>
                              <span className="font-normal text-3xs text-amber-700/80 dark:text-amber-400">
                                • Sadece şirket çalışanları görebilir
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {msg.isEdited && (
                                <span className="font-normal text-3xs text-amber-600 italic dark:text-amber-400">
                                  (düzenlendi)
                                </span>
                              )}
                              <span className="font-normal text-3xs">
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-card p-2 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:bg-card dark:text-foreground"
                                onChange={(e) => setEditInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msg.id);
                                  } else if (e.key === "Escape") {
                                    handleCancelEdit();
                                  }
                                }}
                                rows={2}
                                value={editInput}
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  className="h-6 px-2 text-3xs"
                                  onClick={handleCancelEdit}
                                  size="sm"
                                  variant="outline"
                                >
                                  İptal
                                </Button>
                                <Button
                                  className="h-6 bg-blue-600 px-2 font-semibold text-3xs text-white shadow-xs hover:bg-blue-700"
                                  disabled={savingEdit || !editInput.trim()}
                                  onClick={() => handleSaveEdit(msg.id)}
                                  size="sm"
                                >
                                  Kaydet
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1.5 whitespace-pre-wrap text-amber-900 text-xs leading-relaxed dark:text-amber-100">
                              {msg.content}
                            </p>
                          )}

                          <div className="mt-2 flex items-center justify-between font-semibold text-3xs text-amber-700/90 dark:text-amber-400">
                            <span>Yazan: {msg.senderName}</span>

                            {/* Actions on hover */}
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900"
                                onClick={() => handleCopyMessage(msg)}
                                title="Kopyala"
                                type="button"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                              {isMe && (
                                <button
                                  className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900"
                                  onClick={() => handleStartEdit(msg)}
                                  title="Düzenle"
                                  type="button"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                className="rounded p-1 text-red-600 hover:bg-amber-100 dark:hover:bg-amber-900"
                                onClick={() => handleDeleteMessage(msg)}
                                title="Sil"
                                type="button"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      className={`group relative flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
                      key={msg.id}
                    >
                      {!isMe && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-200 font-bold text-xs text-zinc-700 dark:bg-muted dark:text-foreground dark:text-zinc-300">
                          {msg.senderName.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div
                        className={`flex max-w-lg flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-semibold text-2xs text-zinc-600 dark:text-zinc-400">
                            {msg.senderName}
                          </span>
                          <span className="text-3xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {msg.isEdited && (
                            <span className="text-3xs text-muted-foreground italic dark:text-zinc-500">
                              (düzenlendi)
                            </span>
                          )}
                        </div>

                        {/* Message Bubble Container with Hover Micro-Toolbar */}
                        <div className="group/bubble relative">
                          {/* Floating Micro Action Toolbar */}
                          {!isEditing && (
                            <div
                              className={`absolute -top-7 z-10 hidden items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-md group-hover/bubble:flex dark:border-border dark:bg-card ${ isMe ? "right-0" : "left-0" }`}
                            >
                              <button
                                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-muted dark:hover:bg-zinc-800"
                                onClick={() => handleCopyMessage(msg)}
                                title="Mesajı Kopyala"
                                type="button"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {isMe && msg.senderType !== "Customer" && (
                                <button
                                  className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:text-zinc-400 dark:hover:bg-muted dark:hover:bg-zinc-800"
                                  onClick={() => handleStartEdit(msg)}
                                  title="Mesajı Düzenle"
                                  type="button"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {msg.senderType !== "Customer" && (
                                <button
                                  className="rounded-md p-1 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40"
                                  onClick={() => handleDeleteMessage(msg)}
                                  title="Mesajı Sil"
                                  type="button"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${ isMe ? "rounded-br-xs bg-blue-600 text-white" : "rounded-bl-xs border border-border bg-card text-zinc-900 dark:border-border dark:bg-card dark:text-foreground" }`}
                          >
                            {isEditing ? (
                              <div className="min-w-[240px] space-y-2">
                                <textarea
                                  className="w-full rounded-lg border border-blue-400 bg-card p-2 text-xs text-zinc-900 focus:outline-none dark:bg-card dark:text-foreground"
                                  onChange={(e) => setEditInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit(msg.id);
                                    } else if (e.key === "Escape") {
                                      handleCancelEdit();
                                    }
                                  }}
                                  rows={2}
                                  value={editInput}
                                />
                                <div className="flex items-center justify-between text-3xs">
                                  <span className="opacity-80">
                                    Esc: iptal, Enter: kaydet
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      className="rounded bg-black/20 px-2 py-0.5 font-medium text-white hover:bg-black/30"
                                      onClick={handleCancelEdit}
                                      type="button"
                                    >
                                      İptal
                                    </button>
                                    <button
                                      className="rounded bg-card px-2 py-0.5 font-bold text-blue-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                      disabled={savingEdit || !editInput.trim()}
                                      onClick={() => handleSaveEdit(msg.id)}
                                      type="button"
                                    >
                                      Kaydet
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              msg.content && (
                                <p className="whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              )
                            )}

                            {/* Render Embedded Entity Card if any */}
                            {msg.entityEmbeds?.map((embed) => (
                              <div
                                className={`mt-2.5 rounded-xl border p-3 transition-all ${ isMe ? "border-blue-500 bg-blue-700/80 text-white" : "border-border bg-zinc-50 text-zinc-900 dark:text-zinc-100 dark:border-border dark:bg-muted/60 dark:text-foreground" }`}
                                key={embed.id}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`rounded-lg p-1.5 ${isMe ? "bg-blue-800" : "bg-card shadow-2xs dark:bg-card"}`}
                                    >
                                      {embed.entityType === "Customer" && (
                                        <Users2 className="h-4 w-4 text-blue-500" />
                                      )}
                                      {embed.entityType === "Order" && (
                                        <ShoppingCart className="h-4 w-4 text-emerald-500" />
                                      )}
                                      {embed.entityType === "Product" && (
                                        <Package className="h-4 w-4 text-blue-500" />
                                      )}
                                      {embed.entityType === "LeaveRequest" && (
                                        <Calendar className="h-4 w-4 text-amber-500" />
                                      )}
                                      {embed.entityType === "ShiftSchedule" && (
                                        <Clock className="h-4 w-4 text-cyan-500" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-bold text-3xs uppercase tracking-wider opacity-80">
                                        {embed.entityType === "Customer"
                                          ? "Müşteri Kartı"
                                          : embed.entityType === "Order"
                                            ? "Sipariş Kartı"
                                            : embed.entityType === "Product"
                                              ? "Ürün Kartı"
                                              : embed.entityType ===
                                                  "LeaveRequest"
                                                ? "İzin Talebi"
                                                : "Vardiya Planı"}
                                      </div>
                                      <div className="font-bold text-xs">
                                        {embed.entityTitle}
                                      </div>
                                    </div>
                                  </div>

                                  {embed.entityStatus && (
                                    <span className="rounded-md bg-card px-2 py-0.5 font-semibold text-3xs">
                                      {embed.entityStatus}
                                    </span>
                                  )}
                                </div>

                                {embed.entitySubtitle && (
                                  <p className="mt-1.5 text-2xs opacity-90">
                                    {embed.entitySubtitle}
                                  </p>
                                )}

                                <div className="mt-2.5 flex justify-end border-white/20 border-t pt-2">
                                  <Link
                                    className="flex items-center gap-1 font-bold text-3xs underline hover:opacity-80"
                                    href={
                                      embed.entityType === "Customer"
                                        ? `/${tenantSlug}/customers/${embed.entityId}`
                                        : embed.entityType === "Order"
                                          ? `/${tenantSlug}/orders/${embed.entityId}`
                                          : embed.entityType === "Product"
                                            ? `/${tenantSlug}/products/${embed.entityId}`
                                            : embed.entityType ===
                                                "LeaveRequest"
                                              ? `/${tenantSlug}/leaves`
                                              : `/${tenantSlug}/attendance`
                                    }
                                  >
                                    <span>Detayları İncele</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Rich Message Composer Bar */}
            <div className="border-border border-t bg-card p-3 pb-20 sm:p-4 md:pb-4 dark:border-border dark:bg-card">
              {/* Internal Note Banner if active */}
              {isInternalNote && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 text-xs dark:bg-amber-950/40 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Dahili Ekip Notu Modu (Müşteri görmez)</span>
                  </div>
                  <button
                    aria-label="Dahili not modunu kapat"
                    className="text-amber-700 hover:text-amber-900 dark:hover:text-amber-100"
                    onClick={() => setIsInternalNote(false)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="mb-2 flex items-center justify-between gap-1 overflow-x-auto pb-1">
                <div className="flex shrink-0 items-center gap-1">
                  {/* Entity Embed Button */}
                  <Button
                    className="h-7 gap-1.5 px-2 text-2xs text-zinc-600 hover:text-blue-600 sm:h-8 sm:px-3 sm:text-xs dark:text-zinc-400 dark:text-zinc-400 dark:hover:text-foreground"
                    onClick={() => setIsEntityPickerOpen(true)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                    <span>CRM Kartı</span>
                  </Button>

                  {/* Canned Responses Trigger */}
                  <Button
                    className="h-7 gap-1.5 px-2 text-2xs text-zinc-600 hover:text-emerald-600 sm:h-8 sm:px-3 sm:text-xs dark:text-zinc-400 dark:text-zinc-400 dark:hover:text-foreground"
                    onClick={() => setIsCannedResponsesOpen(true)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Zap className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Hazır Yanıt</span>
                  </Button>

                  {/* Internal Note Mode Toggle (For support chats) */}
                  {selectedChannel.type === "CustomerSupport" && (
                    <Button
                      className={`h-7 gap-1.5 px-2 font-medium text-2xs sm:h-8 sm:px-3 sm:text-xs ${
                        isInternalNote
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                          : "text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-zinc-400"
                      }`}
                      onClick={() => setIsInternalNote(!isInternalNote)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Dahili Not</span>
                    </Button>
                  )}
                </div>

                <div className="hidden shrink-0 text-2xs text-muted-foreground sm:block">
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-3xs">
                    Enter
                  </kbd>{" "}
                  gönder,{" "}
                  <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-3xs">
                    Shift+Enter
                  </kbd>{" "}
                  yeni satır
                </div>
              </div>

              {/* Text Input & Send */}
              <div className="flex items-end gap-2">
                <textarea
                  className="max-h-32 min-h-[42px] w-full resize-none rounded-xl border border-border bg-zinc-50 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none sm:p-3 dark:border-border dark:bg-muted/40 dark:text-foreground"
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMessageInput(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    selectedChannel.type === "Direct"
                      ? `${getChannelDisplayInfo(selectedChannel).title} kişisine mesaj yazın...`
                      : `#${selectedChannel.title} kanalına mesaj yazın...`
                  }
                  rows={1}
                  value={messageInput}
                />

                <Button
                  className="h-10 shrink-0 bg-blue-600 px-4 font-semibold text-white shadow-xs hover:bg-blue-700 sm:h-11 sm:px-5"
                  disabled={sendingMessage || !messageInput.trim()}
                  onClick={() => handleSendMessage()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center bg-zinc-50 md:flex dark:bg-background dark:bg-zinc-800/50">
            <div className="text-center">
              <MessagesSquare className="mx-auto h-12 w-12 text-zinc-300 dark:text-muted-foreground" />
              <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-foreground dark:text-zinc-200">
                Bir Sohbet Seçin
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-muted-foreground dark:text-zinc-400">
                Görüntülemek için sol listeden bir kanal veya direkt mesaj
                seçin.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: CRM Entity Picker Modal */}
      {isEntityPickerOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsEntityPickerOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-4 sm:max-w-xl sm:p-6"
            showCloseButton={false}
          >
            <div className="flex shrink-0 items-center justify-between border-border border-b pb-3 dark:border-border">
              <div className="min-w-0 pr-2">
                <DialogTitle className="truncate font-bold text-sm text-zinc-900 sm:text-base dark:text-foreground">
                  Sohbete CRM Kartı Ekle
                </DialogTitle>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  Paylaşmak istediğiniz varlığı seçin ve konuşmaya interaktif
                  canlı kart olarak ekleyin.
                </p>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="shrink-0 rounded-xl p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-muted dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            {/* Type Selector Tabs */}
            <div className="my-3 flex shrink-0 rounded-xl bg-muted p-1">
              <button
                className={`flex-1 rounded-lg py-1.5 font-semibold text-xs transition-all ${ entityType === "Customer" ? "bg-card text-blue-600 shadow-xs dark:bg-card" : "text-zinc-600 dark:text-zinc-400" }`}
                onClick={() => setEntityType("Customer")}
                type="button"
              >
                Müşteriler
              </button>
              <button
                className={`flex-1 rounded-lg py-1.5 font-semibold text-xs transition-all ${ entityType === "Order" ? "bg-card text-blue-600 shadow-xs dark:bg-card" : "text-zinc-600 dark:text-zinc-400" }`}
                onClick={() => setEntityType("Order")}
                type="button"
              >
                Siparişler
              </button>
              <button
                className={`flex-1 rounded-lg py-1.5 font-semibold text-xs transition-all ${ entityType === "Product" ? "bg-card text-blue-600 shadow-xs dark:bg-card" : "text-zinc-600 dark:text-zinc-400" }`}
                onClick={() => setEntityType("Product")}
                type="button"
              >
                Ürünler
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-2 shrink-0">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-xl border border-border bg-zinc-50 py-1.5 pr-3 pl-9 text-xs text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEntitySearch(e.target.value)
                }
                placeholder="Listede ara..."
                value={entitySearch}
              />
            </div>

            {/* Items List */}
            <div className="custom-scrollbar max-h-64 space-y-1.5 overflow-y-auto p-1">
              {loadingEntities ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Yükleniyor...
                </div>
              ) : entityType === "Customer" ? (
                customersList.map((cust) => (
                  <div
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 dark:border-border dark:hover:bg-muted/40"
                    key={cust.id}
                    onClick={() => {
                      handleSendMessage({
                        entityId: cust.id,
                        entityStatus: cust.status,
                        entitySubtitle: `${cust.email || ""} • ${cust.phone || ""}`,
                        entityTitle: cust.name,
                        entityType: "Customer",
                      });
                      setIsEntityPickerOpen(false);
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5 pr-2">
                      <Users2 className="h-4 w-4 shrink-0 text-blue-600" />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-xs text-zinc-900 dark:text-foreground">
                          {cust.name}
                        </div>
                        <div className="truncate text-2xs text-zinc-500 dark:text-zinc-400">
                          {cust.email || "E-posta yok"}
                        </div>
                      </div>
                    </div>
                    <Button
                      className="h-7 shrink-0 bg-blue-600 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
                      size="sm"
                    >
                      Ekle
                    </Button>
                  </div>
                ))
              ) : entityType === "Order" ? (
                ordersList.map((ord) => (
                  <div
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 dark:border-border dark:hover:bg-muted/40"
                    key={ord.id}
                    onClick={() => {
                      handleSendMessage({
                        entityId: ord.id,
                        entityStatus: ord.status,
                        entitySubtitle: `Müşteri: ${ord.customerName} • Tutar: ${ord.totalAmount} ${ord.currency}`,
                        entityTitle: `Sipariş #${ord.orderNumber}`,
                        entityType: "Order",
                      });
                      setIsEntityPickerOpen(false);
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5 pr-2">
                      <ShoppingCart className="h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-xs text-zinc-900 dark:text-foreground">
                          {ord.orderNumber} - {ord.customerName}
                        </div>
                        <div className="truncate text-2xs text-zinc-500 dark:text-zinc-400">
                          {ord.totalAmount} {ord.currency} • {ord.status}
                        </div>
                      </div>
                    </div>
                    <Button
                      className="h-7 shrink-0 bg-blue-600 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
                      size="sm"
                    >
                      Ekle
                    </Button>
                  </div>
                ))
              ) : (
                productsList.map((prod) => (
                  <div
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 dark:border-border dark:hover:bg-muted/40"
                    key={prod.id}
                    onClick={() => {
                      handleSendMessage({
                        entityId: prod.id,
                        entityStatus: `${prod.currentStock} Adet Stok`,
                        entitySubtitle: `SKU: ${prod.sku} • Fiyat: ${prod.sellingPrice} ₺`,
                        entityTitle: prod.name,
                        entityType: "Product",
                      });
                      setIsEntityPickerOpen(false);
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5 pr-2">
                      <Package className="h-4 w-4 shrink-0 text-blue-600" />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-xs text-zinc-900 dark:text-foreground">
                          {prod.name}
                        </div>
                        <div className="truncate text-2xs text-zinc-500 dark:text-zinc-400">
                          SKU: {prod.sku} • {prod.sellingPrice} ₺
                        </div>
                      </div>
                    </div>
                    <Button
                      className="h-7 shrink-0 bg-blue-600 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
                      size="sm"
                    >
                      Ekle
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 2: Canned Responses Modal */}
      {isCannedResponsesOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCannedResponsesOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-4 sm:max-w-lg sm:p-6"
            showCloseButton={false}
          >
            <div className="flex shrink-0 items-center justify-between border-border border-b pb-3 dark:border-border">
              <div className="min-w-0 pr-2">
                <DialogTitle className="truncate font-bold text-sm text-zinc-900 sm:text-base dark:text-foreground">
                  Hazır Yanıt Şablonları
                </DialogTitle>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  Sık kullanılan yanıtı seçin, mesaj kutunuza otomatik eklensin.
                </p>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="shrink-0 rounded-xl p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-muted dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <div className="custom-scrollbar mt-4 max-h-72 space-y-2 overflow-y-auto">
              {cannedResponses.map((item) => (
                <div
                  className="flex cursor-pointer items-start justify-between rounded-xl border border-border p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 dark:border-border dark:bg-card"
                  key={item.id}
                  onClick={() => {
                    setMessageInput((prev) =>
                      prev ? `${prev} ${item.content}` : item.content
                    );
                    setIsCannedResponsesOpen(false);
                  }}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-zinc-900 dark:text-foreground">
                        {item.title}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.2 font-mono text-3xs text-zinc-600 dark:bg-muted dark:bg-zinc-800 dark:text-zinc-300">
                        /{item.shortcut}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-2xs text-zinc-500 dark:text-zinc-400">
                      {item.content}
                    </p>
                  </div>
                  <Button
                    className="h-7 shrink-0 bg-blue-600 font-semibold text-white text-xs shadow-xs hover:bg-blue-700"
                    size="sm"
                  >
                    Kullan
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3: Create Channel Modal */}
      {isCreateChannelOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateChannelOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-4 sm:max-w-md sm:p-6"
            showCloseButton={false}
          >
            <form onSubmit={handleCreateChannel}>
              <div className="flex shrink-0 items-center justify-between border-border border-b pb-3 dark:border-border">
                <DialogTitle className="truncate font-bold text-sm text-zinc-900 sm:text-base dark:text-foreground">
                  Yeni Sohbet Kanalı Oluştur
                </DialogTitle>
                <DialogClose asChild>
                  <button
                    aria-label="Kapat"
                    className="shrink-0 rounded-xl p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-muted dark:hover:bg-zinc-800"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </DialogClose>
              </div>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <label
                    className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300"
                    htmlFor="channel-name"
                  >
                    Kanal Adı *
                  </label>
                  <div className="relative">
                    <Hash className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                    <input
                      className="w-full rounded-xl border border-border bg-zinc-50 py-2 pr-3 pl-9 text-xs text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                      id="channel-name"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewChannelTitle(
                          e.target.value.toLowerCase().replace(/\s+/g, "-")
                        )
                      }
                      placeholder="örn: pazarlama-ekibi"
                      required
                      value={newChannelTitle}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300"
                    htmlFor="channel-desc"
                  >
                    Açıklama
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-zinc-50 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                    id="channel-desc"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewChannelDesc(e.target.value)
                    }
                    placeholder="Kanalın amacı ve kapsamı..."
                    value={newChannelDesc}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    checked={newChannelIsPrivate}
                    className="rounded border-border text-blue-600"
                    id="is-private"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewChannelIsPrivate(e.target.checked)
                    }
                    type="checkbox"
                  />
                  <label
                    className="cursor-pointer text-xs text-zinc-600 dark:text-zinc-300 dark:text-zinc-400"
                    htmlFor="is-private"
                  >
                    Özel Kanal (Sadece davet edilen üyeler erişebilir)
                  </label>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-border border-t pt-3 dark:border-border">
                <Button
                  onClick={() => setIsCreateChannelOpen(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  İptal
                </Button>
                <Button
                  className="bg-blue-600 font-semibold text-white shadow-xs hover:bg-blue-700"
                  size="sm"
                  type="submit"
                >
                  Kanalı Oluştur
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 4: New Direct Message Modal */}
      {isNewDmModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsNewDmModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-4 sm:max-w-md sm:p-6"
            showCloseButton={false}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-border border-b pb-3 dark:border-border">
              <div className="min-w-0 pr-2">
                <DialogTitle className="truncate font-bold text-sm text-zinc-900 sm:text-base dark:text-foreground">
                  Yeni Direkt Mesaj
                </DialogTitle>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  Çalışma arkadaşınızı seçerek doğrudan mesajlaşmaya başlayın.
                </p>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Kapat"
                  className="shrink-0 rounded-xl p-1.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            {/* Search Input */}
            <div className="py-3">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  className="w-full rounded-xl border border-border bg-zinc-50 py-2 pr-3 pl-9 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:bg-zinc-800/50 dark:text-zinc-100"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDmSearchQuery(e.target.value)
                  }
                  placeholder="İsim, e-posta veya unvana göre ara..."
                  value={dmSearchQuery}
                />
              </div>
            </div>

            {/* Teammates List */}
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {loadingTeamUsers ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Ekip üyeleri yükleniyor...
                  </p>
                </div>
              ) : filteredTeamUsers.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                  <p className="mt-2 font-semibold text-xs text-zinc-600 dark:text-zinc-400">
                    Kullanıcı bulunamadı
                  </p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">
                    Aramanızla eşleşen başka bir çalışma arkadaşı bulunmuyor.
                  </p>
                </div>
              ) : (
                filteredTeamUsers.map((u) => {
                  const initials = (u.fullName || u.email || "CA")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const roleName = u.roles?.[0]?.name || "Ekip Üyesi";
                  const isStarting = startingDmUserId === u.id;

                  return (
                    <div
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-2.5 transition-all hover:border-blue-200 hover:bg-blue-50/60 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/30"
                      key={u.id}
                      onClick={() => !isStarting && handleStartDirectMessage(u)}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="relative shrink-0">
                          {u.avatarUrl ? (
                            <img
                              alt={u.fullName || u.email}
                              className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                              height={36}
                              src={u.avatarUrl}
                              width={36}
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 text-xs shadow-2xs dark:bg-blue-950/60 dark:text-blue-300">
                              {initials}
                            </div>
                          )}
                          <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              {u.fullName || u.email}
                            </span>
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.2 font-medium text-3xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              {roleName}
                            </span>
                          </div>
                          <p className="truncate text-2xs text-zinc-500 dark:text-zinc-400">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <Button
                        className="h-7 shrink-0 bg-blue-600 px-3 font-semibold text-white text-xs opacity-0 transition-opacity hover:bg-blue-700 group-hover:opacity-100 dark:bg-blue-600"
                        disabled={isStarting}
                        size="sm"
                      >
                        {isStarting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Mesaj Yaz"
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-3 flex shrink-0 items-center justify-end border-border border-t pt-3 dark:border-border">
              <Button
                onClick={() => setIsNewDmModalOpen(false)}
                size="sm"
                type="button"
                variant="outline"
              >
                Kapat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* WhatsApp Cloud Chat Drawer */}
      <WhatsAppChatDrawer
        isOpen={isWhatsAppDrawerOpen}
        onClose={() => setIsWhatsAppDrawerOpen(false)}
        tenantSlug={tenantSlug}
        activeTenantId={activeTenantId}
      />
    </PageContainer>
  );
}

