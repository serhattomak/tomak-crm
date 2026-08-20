"use client"

import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  Copy,
  CornerUpLeft,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Hash,
  Headphones,
  HelpCircle,
  Info,
  LifeBuoy,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
  Package,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smile,
  Sparkles,
  Tag,
  Trash2,
  Undo2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Users2,
  X,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ApiClient,
  type CannedResponseDto,
  type ChatChannelDto,
  type ChatMessageDto,
  type Customer360ChatContextDto,
  type CustomerListDto,
  type OrderListDto,
  type ProductListDto,
} from "@/lib/api-client"
import { usePermissions } from "@/lib/permissions/permission-context"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"

export default function MessagesPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = (params?.tenantSlug as string) || ""
  const { activeTenant } = usePermissions()

  // State
  const [activeTab, setActiveTab] = useState<"team" | "support">("team")
  const [channels, setChannels] = useState<ChatChannelDto[]>([])
  const [selectedChannel, setSelectedChannel] = useState<ChatChannelDto | null>(null)
  const [messages, setMessages] = useState<ChatMessageDto[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [supportFilter, setSupportFilter] = useState<"all" | "open" | "pending" | "resolved">("all")

  // Input & Messaging state
  const [messageInput, setMessageInput] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showCustomer360, setShowCustomer360] = useState(false)
  const [customerContext, setCustomerContext] = useState<Customer360ChatContextDto | null>(null)
  const [loadingCustomerContext, setLoadingCustomerContext] = useState(false)

  // Edit / Delete / Undo state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  // Modals state
  const [isEntityPickerOpen, setIsEntityPickerOpen] = useState(false)
  const [isCannedResponsesOpen, setIsCannedResponsesOpen] = useState(false)
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isNewSupportModalOpen, setIsNewSupportModalOpen] = useState(false)

  // Entity Picker data
  const [entityType, setEntityType] = useState<"Customer" | "Order" | "Product">("Customer")
  const [entitySearch, setEntitySearch] = useState("")
  const [customersList, setCustomersList] = useState<CustomerListDto[]>([])
  const [ordersList, setOrdersList] = useState<OrderListDto[]>([])
  const [productsList, setProductsList] = useState<ProductListDto[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)

  // Canned responses data
  const [cannedResponses, setCannedResponses] = useState<CannedResponseDto[]>([])

  // Form states for new channel
  const [newChannelTitle, setNewChannelTitle] = useState("")
  const [newChannelDesc, setNewChannelDesc] = useState("")
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false)

  // Form states for new support session
  const [newSupportCustomerName, setNewSupportCustomerName] = useState("")
  const [newSupportEmail, setNewSupportEmail] = useState("")
  const [newSupportSubject, setNewSupportSubject] = useState("")
  const [newSupportPriority, setNewSupportPriority] = useState("Medium")
  const [newSupportInitialMsg, setNewSupportInitialMsg] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Load Channels
  const fetchChannels = async () => {
    try {
      setLoadingChannels(true)
      const res = await ApiClient.getChatChannels({}, activeTenant?.id)
      if (res.success && res.data) {
        setChannels(res.data)
        if (!selectedChannel && res.data.length > 0) {
          const defaultChannel = activeTab === "team"
            ? res.data.find(c => c.type !== "CustomerSupport") || res.data[0]
            : res.data.find(c => c.type === "CustomerSupport") || res.data[0]
          setSelectedChannel(defaultChannel || null)
        }
      }
    } catch {
      toast.error("Kanallar yüklenirken bir hata oluştu.")
    } finally {
      setLoadingChannels(false)
    }
  }

  useEffect(() => {
    fetchChannels()
    fetchCannedResponses()
  }, [activeTenant?.id])

  // Load Messages when selectedChannel changes
  useEffect(() => {
    if (!selectedChannel) return

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true)
        const res = await ApiClient.getChatMessages(selectedChannel.id, 100, activeTenant?.id)
        if (res.success && res.data) {
          setMessages(res.data)
          setTimeout(scrollToBottom, 100)
        }
      } catch {
        toast.error("Mesajlar yüklenemedi.")
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchMessages()

    // If support channel, fetch customer context
    if (selectedChannel.type === "CustomerSupport" && selectedChannel.customerId) {
      fetchCustomerContext(selectedChannel.customerId)
    }
  }, [selectedChannel?.id, activeTenant?.id])

  const fetchCustomerContext = async (customerId: string) => {
    try {
      setLoadingCustomerContext(true)
      const res = await ApiClient.getCustomer360ChatContext(customerId, activeTenant?.id)
      if (res.success && res.data) {
        setCustomerContext(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoadingCustomerContext(false)
    }
  }

  const fetchCannedResponses = async () => {
    try {
      const res = await ApiClient.getCannedResponses({}, activeTenant?.id)
      if (res.success && res.data) {
        setCannedResponses(res.data)
      }
    } catch {
      // ignore
    }
  }

  // Handle Send Message
  const handleSendMessage = async (embedData?: {
    entityId: string
    entityStatus?: string
    entitySubtitle?: string
    entityTitle: string
    entityType: string
  }) => {
    if (!selectedChannel) return
    if (!messageInput.trim() && !embedData) return

    try {
      setSendingMessage(true)
      const payload = {
        channelId: selectedChannel.id,
        content: messageInput.trim(),
        entityEmbeds: embedData ? [embedData] : undefined,
        messageType: isInternalNote ? "InternalNote" : embedData ? "EntityEmbed" : "Text",
        senderName: "Siz (Temsilci)",
        senderType: "User",
      }

      const res = await ApiClient.sendChatMessage(payload, activeTenant?.id)
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data!])
        setMessageInput("")
        setIsInternalNote(false)
        setTimeout(scrollToBottom, 50)
      } else {
        toast.error(res.message || "Mesaj gönderilemedi.")
      }
    } catch {
      toast.error("Mesaj gönderilirken bir hata oluştu.")
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle Edit Message
  const handleStartEdit = (msg: ChatMessageDto) => {
    setEditingMessageId(msg.id)
    setEditInput(msg.content)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditInput("")
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editInput.trim()) return

    try {
      setSavingEdit(true)
      const res = await ApiClient.editChatMessage(messageId, { content: editInput.trim() }, activeTenant?.id)
      if (res.success && res.data) {
        setMessages(prev => prev.map(m => (m.id === messageId ? res.data! : m)))
        toast.success("Mesaj güncellendi.")
        setEditingMessageId(null)
        setEditInput("")
      } else {
        toast.error(res.message || "Mesaj düzenlenemedi.")
      }
    } catch {
      toast.error("Mesaj düzenlenirken bir hata oluştu.")
    } finally {
      setSavingEdit(false)
    }
  }

  // Handle Delete Message with Undo (Geri Al) Toast
  const handleDeleteMessage = async (msg: ChatMessageDto) => {
    // Optimistic removal
    const originalMessages = [...messages]
    setMessages(prev => prev.filter(m => m.id !== msg.id))

    try {
      const res = await ApiClient.deleteChatMessage(msg.id, activeTenant?.id)
      if (res.success) {
        toast("Mesaj silindi", {
          action: {
            label: "Geri Al",
            onClick: async () => {
              try {
                const restoreRes = await ApiClient.restoreChatMessage(msg.id, activeTenant?.id)
                if (restoreRes.success && restoreRes.data) {
                  setMessages(prev => [...prev, restoreRes.data!].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
                  toast.success("Mesaj geri yüklendi.")
                }
              } catch {
                toast.error("Mesaj geri alınırken hata oluştu.")
              }
            },
          },
          duration: 7000,
        })
      } else {
        setMessages(originalMessages)
        toast.error(res.message || "Mesaj silinemedi.")
      }
    } catch {
      setMessages(originalMessages)
      toast.error("Mesaj silinirken bir hata oluştu.")
    }
  }

  // Handle Copy Message
  const handleCopyMessage = (msg: ChatMessageDto) => {
    navigator.clipboard.writeText(msg.content)
    setCopiedMessageId(msg.id)
    toast.success("Mesaj kopyalandı.")
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  // Handle Support Status Update
  const handleUpdateStatus = async (newStatus: "Open" | "Pending" | "Resolved" | "Closed") => {
    if (!selectedChannel || selectedChannel.type !== "CustomerSupport") return

    try {
      const res = await ApiClient.updateSupportSessionStatus({
        channelId: selectedChannel.id,
        status: newStatus,
      }, activeTenant?.id)

      if (res.success) {
        toast.success(`Destek durumu '${newStatus}' olarak güncellendi.`)
        const msgRes = await ApiClient.getChatMessages(selectedChannel.id, 100, activeTenant?.id)
        if (msgRes.success && msgRes.data) {
          setMessages(msgRes.data)
        }
        fetchChannels()
      }
    } catch {
      toast.error("Durum güncellenirken hata oluştu.")
    }
  }

  // Create Channel
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelTitle.trim()) return

    try {
      const res = await ApiClient.createChatChannel({
        description: newChannelDesc.trim(),
        isPrivate: newChannelIsPrivate,
        title: newChannelTitle.trim(),
        type: "Group",
      }, activeTenant?.id)

      if (res.success && res.data) {
        toast.success("Kanal başarıyla oluşturuldu.")
        setIsCreateChannelOpen(false)
        setNewChannelTitle("")
        setNewChannelDesc("")
        setNewChannelIsPrivate(false)
        await fetchChannels()
        setSelectedChannel(res.data)
      }
    } catch {
      toast.error("Kanal oluşturulurken hata oluştu.")
    }
  }

  // Create Support Session
  const handleCreateSupportSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupportCustomerName.trim() || !newSupportSubject.trim()) return

    try {
      const res = await ApiClient.createCustomerSupportSession({
        customerEmail: newSupportEmail.trim() || undefined,
        customerId: "00000000-0000-0000-0000-000000000001",
        customerName: newSupportCustomerName.trim(),
        initialMessage: newSupportInitialMsg.trim() || "Müşteri canlı destek başlattı.",
        priority: newSupportPriority as any,
        subject: newSupportSubject.trim(),
      }, activeTenant?.id)

      if (res.success && res.data) {
        toast.success("Müşteri destek talebi oluşturuldu.")
        setIsNewSupportModalOpen(false)
        setNewSupportCustomerName("")
        setNewSupportEmail("")
        setNewSupportSubject("")
        setNewSupportInitialMsg("")
        await fetchChannels()
        setSelectedChannel(res.data)
        setActiveTab("support")
      }
    } catch {
      toast.error("Destek talebi oluşturulamadı.")
    }
  }

  // Load Entities for Picker Modal
  const loadEntities = async () => {
    if (!activeTenant?.id) return
    try {
      setLoadingEntities(true)
      if (entityType === "Customer") {
        const res = await ApiClient.getCustomers(activeTenant.id, { search: entitySearch })
        if (res.success && res.data) setCustomersList(res.data.items || [])
      } else if (entityType === "Order") {
        const res = await ApiClient.getOrders({ search: entitySearch }, activeTenant.id)
        if (res.success && res.data) setOrdersList(res.data.items || [])
      } else if (entityType === "Product") {
        const res = await ApiClient.getProducts({ search: entitySearch }, activeTenant.id)
        if (res.success && res.data) setProductsList(res.data.items || [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingEntities(false)
    }
  }

  useEffect(() => {
    if (isEntityPickerOpen) {
      loadEntities()
    }
  }, [isEntityPickerOpen, entityType, entitySearch])

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      // Tab filter
      if (activeTab === "team" && c.type === "CustomerSupport") return false
      if (activeTab === "support" && c.type !== "CustomerSupport") return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = c.title.toLowerCase().includes(q)
        const matchCustomer = c.customerName?.toLowerCase().includes(q)
        if (!matchTitle && !matchCustomer) return false
      }

      // Support status filter
      if (activeTab === "support" && supportFilter !== "all" && c.supportSession) {
        if (supportFilter === "open" && c.supportSession.status !== "Open") return false
        if (supportFilter === "pending" && c.supportSession.status !== "Pending") return false
        if (supportFilter === "resolved" && c.supportSession.status !== "Resolved" && c.supportSession.status !== "Closed") return false
      }

      return true
    })
  }, [channels, activeTab, searchQuery, supportFilter])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-50 dark:bg-background">
      {/* Top Header Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-border dark:bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-foreground">
                Sohbet & Canlı Destek Merkezi
              </h1>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                Ekip içi işbirliği ve müşteri canlı destek kanalları
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="ml-4 flex items-center rounded-xl bg-slate-100 p-1 dark:bg-muted">
            <button
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "team"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-card dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-foreground"
              }`}
              onClick={() => {
                setActiveTab("team")
                const first = channels.find(c => c.type !== "CustomerSupport")
                if (first) setSelectedChannel(first)
              }}
              type="button"
            >
              <Users className="h-4 w-4" />
              <span>Ekip İçi İletişim</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-muted dark:text-slate-300">
                {channels.filter(c => c.type !== "CustomerSupport").length}
              </span>
            </button>

            <button
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "support"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-card dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-foreground"
              }`}
              onClick={() => {
                setActiveTab("support")
                const first = channels.find(c => c.type === "CustomerSupport")
                if (first) setSelectedChannel(first)
              }}
              type="button"
            >
              <Headphones className="h-4 w-4" />
              <span>Müşteri Canlı Destek</span>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {channels.filter(c => c.type === "CustomerSupport").length}
              </span>
            </button>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {activeTab === "team" ? (
            <Button
              className="bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700"
              onClick={() => setIsCreateChannelOpen(true)}
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Yeni Kanal Aç
            </Button>
          ) : (
            <Button
              className="bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700"
              onClick={() => setIsNewSupportModalOpen(true)}
              size="sm"
            >
              <MessageSquarePlus className="mr-1.5 h-4 w-4" />
              Yeni Destek Talebi
            </Button>
          )}
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Channels / Conversations List */}
        <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-border dark:bg-card">
          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 dark:border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder={activeTab === "team" ? "Kanal veya kişi ara..." : "Müşteri veya konu ara..."}
                value={searchQuery}
              />
            </div>

            {/* Support Filter Chips */}
            {activeTab === "support" && (
              <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                <button
                  className={`rounded-lg px-2 py-1 font-medium transition-colors ${
                    supportFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-foreground dark:text-background"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground"
                  }`}
                  onClick={() => setSupportFilter("all")}
                  type="button"
                >
                  Tümü
                </button>
                <button
                  className={`rounded-lg px-2 py-1 font-medium transition-colors ${
                    supportFilter === "open"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}
                  onClick={() => setSupportFilter("open")}
                  type="button"
                >
                  Açık
                </button>
                <button
                  className={`rounded-lg px-2 py-1 font-medium transition-colors ${
                    supportFilter === "pending"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}
                  onClick={() => setSupportFilter("pending")}
                  type="button"
                >
                  Bekleyen
                </button>
                <button
                  className={`rounded-lg px-2 py-1 font-medium transition-colors ${
                    supportFilter === "resolved"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                  }`}
                  onClick={() => setSupportFilter("resolved")}
                  type="button"
                >
                  Çözüldü
                </button>
              </div>
            )}
          </div>

          {/* List Stream */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingChannels ? (
              <div className="p-4 text-center text-xs text-slate-400">Kanallar yükleniyor...</div>
            ) : filteredChannels.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {activeTab === "team" ? "Kanal bulunamadı" : "Destek talebi yok"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {activeTab === "team" ? "Yeni bir kanal oluşturarak başlayın." : "Tüm destek kuyruğu temiz."}
                </p>
              </div>
            ) : (
              filteredChannels.map((channel) => {
                const isSelected = selectedChannel?.id === channel.id
                const isSupport = channel.type === "CustomerSupport"
                const status = channel.supportSession?.status || "Open"
                const priority = channel.supportSession?.priority || "Medium"

                return (
                  <div
                    className={`flex cursor-pointer items-start gap-3 rounded-xl p-2.5 transition-all select-none ${
                      isSelected
                        ? "bg-blue-50/80 text-blue-950 shadow-2xs border border-blue-100 dark:bg-blue-950/50 dark:border-blue-900/50 dark:text-blue-100"
                        : "hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:hover:bg-muted/40"
                    }`}
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    {/* Icon / Avatar */}
                    <div className="relative shrink-0">
                      {isSupport ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-xs dark:bg-blue-900/60 dark:text-blue-300">
                          {channel.customerName?.slice(0, 2).toUpperCase() || "MŞ"}
                        </div>
                      ) : channel.type === "Direct" ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 font-bold text-xs dark:bg-violet-900/60 dark:text-violet-300">
                          <User className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold text-xs dark:bg-muted dark:text-slate-300">
                          <Hash className="h-5 w-5" />
                        </div>
                      )}

                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-card" />
                    </div>

                    {/* Channel Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold">
                          {isSupport ? channel.customerName : channel.title}
                        </span>
                        {channel.lastMessageAt && (
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {new Date(channel.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-muted-foreground">
                        {channel.lastMessagePreview || channel.description || "Henüz mesaj yok."}
                      </p>

                      {/* Badges for Support */}
                      {isSupport && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                            status === "Open" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                            status === "Pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" :
                            "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}>
                            {status === "Open" ? "Açık" : status === "Pending" ? "Beklemede" : "Çözüldü"}
                          </span>

                          <span className={`rounded-md px-1.5 py-0.2 text-[9px] font-semibold ${
                            priority === "Urgent" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold" :
                            priority === "High" ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" :
                            "bg-slate-100 text-slate-600 dark:bg-muted dark:text-slate-400"
                          }`}>
                            {priority === "Urgent" ? "Acil" : priority === "High" ? "Yüksek" : "Normal"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Middle Column: Chat Conversation Stream */}
        {selectedChannel ? (
          <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-card">
            {/* Active Chat Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-3.5 dark:border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-muted dark:text-foreground font-bold">
                  {selectedChannel.type === "CustomerSupport" ? (
                    <Headphones className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : selectedChannel.type === "Direct" ? (
                    <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  ) : (
                    <Hash className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">
                      {selectedChannel.type === "CustomerSupport"
                        ? selectedChannel.customerName
                        : selectedChannel.title}
                    </h2>
                    {selectedChannel.isPrivate && (
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    {selectedChannel.type === "CustomerSupport"
                      ? `${selectedChannel.description || "Destek Oturumu"} • Temsilci: ${selectedChannel.supportSession?.assignedUserName || "Atanmadı"}`
                      : selectedChannel.description || `${selectedChannel.participants?.length || 1} Katılımcı`}
                  </p>
                </div>
              </div>

              {/* Header Context Controls */}
              <div className="flex items-center gap-2">
                {selectedChannel.type === "CustomerSupport" && (
                  <>
                    {/* Status Dropdown */}
                    <Select
                      onValueChange={(val: any) => handleUpdateStatus(val)}
                      value={selectedChannel.supportSession?.status || "Open"}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">🟢 Açık</SelectItem>
                        <SelectItem value="Pending">🟡 Beklemede</SelectItem>
                        <SelectItem value="Resolved">🔵 Çözüldü</SelectItem>
                        <SelectItem value="Closed">⚪ Kapatıldı</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Müşteri 360 Toggle Button */}
                    <Button
                      className={`h-8 text-xs font-semibold ${
                        showCustomer360
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border-slate-200 hover:bg-slate-50 dark:border-border dark:hover:bg-muted"
                      }`}
                      onClick={() => setShowCustomer360(!showCustomer360)}
                      size="sm"
                      variant={showCustomer360 ? "default" : "outline"}
                    >
                      <Info className="mr-1.5 h-3.5 w-3.5" />
                      Müşteri 360°
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-background/50">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-slate-400">Mesajlar yükleniyor...</div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-foreground">
                    Sohbet Başlatın
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-muted-foreground">
                    Bu konuşmada henüz bir mesaj bulunmuyor. Aşağıdan bir mesaj yazabilir veya CRM kartı ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderType === "User" && msg.senderName.includes("Siz")
                  const isSystem = msg.messageType === "SystemEvent"
                  const isInternal = msg.messageType === "InternalNote"
                  const isEditing = editingMessageId === msg.id

                  if (isSystem) {
                    return (
                      <div className="flex justify-center my-2" key={msg.id}>
                        <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-600 dark:bg-muted dark:text-slate-300">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }

                  if (isInternal) {
                    return (
                      <div className="flex justify-center my-3 group relative" key={msg.id}>
                        <div className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/40">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                            <div className="flex items-center gap-1.5">
                              <Lock className="h-3.5 w-3.5" />
                              <span>Dahili Ekip Notu (Whisper)</span>
                              <span className="text-[10px] font-normal text-amber-700/80 dark:text-amber-400">
                                • Sadece şirket çalışanları görebilir
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {msg.isEdited && (
                                <span className="text-[10px] font-normal italic text-amber-600 dark:text-amber-400">
                                  (düzenlendi)
                                </span>
                              )}
                              <span className="text-[10px] font-normal">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:bg-card dark:text-foreground"
                                onChange={(e) => setEditInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSaveEdit(msg.id)
                                  } else if (e.key === "Escape") {
                                    handleCancelEdit()
                                  }
                                }}
                                rows={2}
                                value={editInput}
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  className="h-6 px-2 text-[10px]"
                                  onClick={handleCancelEdit}
                                  size="sm"
                                  variant="outline"
                                >
                                  İptal
                                </Button>
                                <Button
                                  className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                                  disabled={savingEdit || !editInput.trim()}
                                  onClick={() => handleSaveEdit(msg.id)}
                                  size="sm"
                                >
                                  Kaydet
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-xs text-amber-900 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          )}

                          <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-amber-700/90 dark:text-amber-400">
                            <span>Yazan: {msg.senderName}</span>

                            {/* Actions on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900"
                                onClick={() => handleCopyMessage(msg)}
                                title="Kopyala"
                                type="button"
                              >
                                {copiedMessageId === msg.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
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
                                className="rounded p-1 hover:bg-amber-100 text-red-600 dark:hover:bg-amber-900"
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
                    )
                  }

                  return (
                    <div
                      className={`flex items-end gap-2.5 group relative ${isMe ? "justify-end" : "justify-start"}`}
                      key={msg.id}
                    >
                      {!isMe && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 font-bold text-xs text-slate-700 dark:bg-muted dark:text-foreground">
                          {msg.senderName.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className={`flex max-w-lg flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.isEdited && (
                            <span className="text-[10px] text-slate-400 italic">
                              (düzenlendi)
                            </span>
                          )}
                        </div>

                        {/* Message Bubble Container with Hover Micro-Toolbar */}
                        <div className="relative group/bubble">
                          {/* Floating Micro Action Toolbar */}
                          {!isEditing && (
                            <div
                              className={`absolute -top-7 z-10 hidden group-hover/bubble:flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-md dark:border-border dark:bg-card ${
                                isMe ? "right-0" : "left-0"
                              }`}
                            >
                              <button
                                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-muted"
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
                                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-muted"
                                  onClick={() => handleStartEdit(msg)}
                                  title="Mesajı Düzenle"
                                  type="button"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {msg.senderType !== "Customer" && (
                                <button
                                  className="rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
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
                            className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                              isMe
                                ? "bg-blue-600 text-white rounded-br-xs"
                                : "bg-white text-slate-900 border border-slate-200 dark:bg-card dark:text-foreground dark:border-border rounded-bl-xs"
                            }`}
                          >
                            {isEditing ? (
                              <div className="space-y-2 min-w-[240px]">
                                <textarea
                                  className="w-full rounded-lg border border-blue-400 bg-white p-2 text-xs text-slate-900 focus:outline-none dark:bg-card dark:text-foreground"
                                  onChange={(e) => setEditInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault()
                                      handleSaveEdit(msg.id)
                                    } else if (e.key === "Escape") {
                                      handleCancelEdit()
                                    }
                                  }}
                                  rows={2}
                                  value={editInput}
                                />
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="opacity-80">Esc: iptal, Enter: kaydet</span>
                                  <div className="flex gap-1">
                                    <button
                                      className="rounded px-2 py-0.5 bg-black/20 hover:bg-black/30 text-white font-medium"
                                      onClick={handleCancelEdit}
                                      type="button"
                                    >
                                      İptal
                                    </button>
                                    <button
                                      className="rounded px-2 py-0.5 bg-white text-blue-700 font-bold hover:bg-slate-100"
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
                              msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {/* Render Embedded Entity Card if any */}
                            {msg.entityEmbeds?.map((embed) => (
                              <div
                                className={`mt-2.5 rounded-xl border p-3 transition-all ${
                                  isMe
                                    ? "bg-blue-700/80 border-blue-500 text-white"
                                    : "bg-slate-50 border-slate-200 text-slate-900 dark:bg-muted/60 dark:border-border dark:text-foreground"
                                }`}
                                key={embed.id}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${isMe ? "bg-blue-800" : "bg-white dark:bg-card shadow-2xs"}`}>
                                      {embed.entityType === "Customer" && <Users2 className="h-4 w-4 text-blue-500" />}
                                      {embed.entityType === "Order" && <ShoppingCart className="h-4 w-4 text-emerald-500" />}
                                      {embed.entityType === "Product" && <Package className="h-4 w-4 text-violet-500" />}
                                      {embed.entityType === "LeaveRequest" && <Calendar className="h-4 w-4 text-amber-500" />}
                                      {embed.entityType === "ShiftSchedule" && <Clock className="h-4 w-4 text-cyan-500" />}
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                        {embed.entityType === "Customer" ? "Müşteri Kartı" :
                                         embed.entityType === "Order" ? "Sipariş Kartı" :
                                         embed.entityType === "Product" ? "Ürün Kartı" :
                                         embed.entityType === "LeaveRequest" ? "İzin Talebi" : "Vardiya Planı"}
                                      </div>
                                      <div className="font-bold text-xs">{embed.entityTitle}</div>
                                    </div>
                                  </div>

                                  {embed.entityStatus && (
                                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                                      {embed.entityStatus}
                                    </span>
                                  )}
                                </div>

                                {embed.entitySubtitle && (
                                  <p className="mt-1.5 text-[11px] opacity-90">{embed.entitySubtitle}</p>
                                )}

                                <div className="mt-2.5 pt-2 border-t border-white/20 flex justify-end">
                                  <Link
                                    className="flex items-center gap-1 text-[10px] font-bold underline hover:opacity-80"
                                    href={
                                      embed.entityType === "Customer" ? `/${tenantSlug}/customers/${embed.entityId}` :
                                      embed.entityType === "Order" ? `/${tenantSlug}/orders/${embed.entityId}` :
                                      embed.entityType === "Product" ? `/${tenantSlug}/products/${embed.entityId}` :
                                      embed.entityType === "LeaveRequest" ? `/${tenantSlug}/leaves` :
                                      `/${tenantSlug}/attendance`
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
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Rich Message Composer Bar */}
            <div className="border-t border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
              {/* Internal Note Banner if active */}
              {isInternalNote && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Dahili Ekip Notu Modu (Müşteri görmez)</span>
                  </div>
                  <button
                    className="text-amber-700 hover:text-amber-900 dark:hover:text-amber-100"
                    onClick={() => setIsInternalNote(false)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {/* Entity Embed Button */}
                  <Button
                    className="h-8 gap-1.5 text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-foreground"
                    onClick={() => setIsEntityPickerOpen(true)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                    <span>CRM Kartı Ekle</span>
                  </Button>

                  {/* Canned Responses Trigger */}
                  <Button
                    className="h-8 gap-1.5 text-xs text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-foreground"
                    onClick={() => setIsCannedResponsesOpen(true)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Zap className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Hazır Yanıtlar</span>
                  </Button>

                  {/* Internal Note Mode Toggle (For support chats) */}
                  {selectedChannel.type === "CustomerSupport" && (
                    <Button
                      className={`h-8 gap-1.5 text-xs font-medium ${
                        isInternalNote
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                          : "text-slate-600 hover:text-amber-600 dark:text-slate-400"
                      }`}
                      onClick={() => setIsInternalNote(!isInternalNote)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Fısıltı / Dahili Not</span>
                    </Button>
                  )}
                </div>

                <div className="text-[11px] text-slate-400">
                  <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-muted">Enter</kbd> gönder, <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-muted">Shift+Enter</kbd> yeni satır
                </div>
              </div>

              {/* Text Input & Send */}
              <div className="flex items-end gap-2">
                <textarea
                  className={`w-full min-h-[44px] max-h-32 rounded-xl p-3 text-xs resize-none focus:outline-none ${
                    isInternalNote
                      ? "border border-amber-300 bg-amber-50/40 focus:border-amber-400 dark:border-amber-900/60 dark:bg-amber-950/20 text-slate-900 dark:text-foreground"
                      : "border border-slate-200 bg-slate-50 focus:border-blue-500 dark:border-border dark:bg-muted/40 text-slate-900 dark:text-foreground"
                  }`}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={
                    isInternalNote
                      ? "Müşterinin görmeyeceği dahili not yazın..."
                      : "Bir mesaj yazın..."
                  }
                  rows={1}
                  value={messageInput}
                />

                <Button
                  className="h-11 px-5 bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700 shrink-0"
                  disabled={sendingMessage || !messageInput.trim()}
                  onClick={() => handleSendMessage()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-background">
            <div className="text-center">
              <MessagesSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-foreground">Bir Sohbet Seçin</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                Görüntülemek için sol listeden bir kanal veya destek talebi seçin.
              </p>
            </div>
          </div>
        )}

        {/* Right Column: Customer 360 Context Drawer */}
        {showCustomer360 && selectedChannel?.type === "CustomerSupport" && (
          <div className="w-80 shrink-0 border-l border-slate-200 bg-white p-5 overflow-y-auto dark:border-border dark:bg-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border">
              <h3 className="text-sm font-bold text-slate-900 dark:text-foreground">Müşteri 360° Özeti</h3>
              <button
                className="text-slate-400 hover:text-slate-600 dark:hover:text-foreground"
                onClick={() => setShowCustomer360(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingCustomerContext ? (
              <div className="py-8 text-center text-xs text-slate-400">Veriler yükleniyor...</div>
            ) : customerContext ? (
              <div className="mt-4 space-y-5">
                {/* Profile Card */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-border dark:bg-muted/40">
                  <div className="font-bold text-xs text-slate-900 dark:text-foreground">
                    {customerContext.customerName}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-muted-foreground">
                    {customerContext.email || "E-posta yok"} • {customerContext.phone || "Telefon yok"}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {customerContext.customerType || "Kurumsal"}
                    </span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      VIP Tier
                    </span>
                  </div>
                </div>

                {/* Financial KPIs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-100 p-3 bg-white dark:border-border dark:bg-card">
                    <span className="text-[10px] font-semibold text-slate-400">Toplam Harcama</span>
                    <div className="mt-1 text-sm font-bold text-slate-900 dark:text-foreground">
                      {customerContext.totalRevenue.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3 bg-white dark:border-border dark:bg-card">
                    <span className="text-[10px] font-semibold text-slate-400">Bakiye</span>
                    <div className="mt-1 text-sm font-bold text-emerald-600">
                      {customerContext.balance.toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <span>Son Siparişler ({customerContext.recentOrders?.length || 0})</span>
                  </div>
                  <div className="space-y-2">
                    {customerContext.recentOrders?.map((ord) => (
                      <div
                        className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 text-xs bg-slate-50/50 dark:border-border dark:bg-muted/30"
                        key={ord.id}
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-foreground">{ord.orderNumber}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(ord.orderDate).toLocaleDateString("tr-TR")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 dark:text-foreground">
                            {ord.totalAmount.toLocaleString("tr-TR")} ₺
                          </div>
                          <span className="text-[9px] font-semibold text-emerald-600">{ord.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Actions */}
                <div className="pt-2">
                  <Button
                    className="w-full bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700"
                    onClick={() => router.push(`/${tenantSlug}/customers/${customerContext.customerId}`)}
                    size="sm"
                  >
                    <span>Müşteri Profilini Aç</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Modal 1: CRM Entity Picker Modal */}
      {isEntityPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-card border border-slate-200 dark:border-border">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-border">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-foreground">Sohbete CRM Kartı Ekle</h3>
                <p className="text-xs text-slate-500">
                  Paylaşmak istediğiniz varlığı seçin ve konuşmaya interaktif canlı kart olarak ekleyin.
                </p>
              </div>
              <button
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted"
                onClick={() => setIsEntityPickerOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type Selector Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 my-3 dark:bg-muted">
              <button
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  entityType === "Customer" ? "bg-white text-blue-600 shadow-xs dark:bg-card" : "text-slate-600"
                }`}
                onClick={() => setEntityType("Customer")}
                type="button"
              >
                Müşteriler
              </button>
              <button
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  entityType === "Order" ? "bg-white text-blue-600 shadow-xs dark:bg-card" : "text-slate-600"
                }`}
                onClick={() => setEntityType("Order")}
                type="button"
              >
                Siparişler
              </button>
              <button
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  entityType === "Product" ? "bg-white text-blue-600 shadow-xs dark:bg-card" : "text-slate-600"
                }`}
                onClick={() => setEntityType("Product")}
                type="button"
              >
                Ürünler
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEntitySearch(e.target.value)}
                placeholder="Listede ara..."
                value={entitySearch}
              />
            </div>

            {/* Items List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 p-1">
              {loadingEntities ? (
                <div className="py-6 text-center text-xs text-slate-400">Yükleniyor...</div>
              ) : entityType === "Customer" ? (
                customersList.map((cust) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all dark:border-border dark:hover:bg-muted/40"
                    key={cust.id}
                    onClick={() => {
                      handleSendMessage({
                        entityId: cust.id,
                        entityStatus: cust.status,
                        entitySubtitle: `${cust.email || ""} • ${cust.phone || ""}`,
                        entityTitle: cust.name,
                        entityType: "Customer",
                      })
                      setIsEntityPickerOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users2 className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-foreground">{cust.name}</div>
                        <div className="text-[11px] text-slate-500">{cust.email || "E-posta yok"}</div>
                      </div>
                    </div>
                    <Button className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" size="sm">
                      Ekle
                    </Button>
                  </div>
                ))
              ) : entityType === "Order" ? (
                ordersList.map((ord) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all dark:border-border dark:hover:bg-muted/40"
                    key={ord.id}
                    onClick={() => {
                      handleSendMessage({
                        entityId: ord.id,
                        entityStatus: ord.status,
                        entitySubtitle: `Müşteri: ${ord.customerName} • Tutar: ${ord.totalAmount} ${ord.currency}`,
                        entityTitle: `Sipariş #${ord.orderNumber}`,
                        entityType: "Order",
                      })
                      setIsEntityPickerOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingCart className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-foreground">{ord.orderNumber} - {ord.customerName}</div>
                        <div className="text-[11px] text-slate-500">{ord.totalAmount} {ord.currency} • {ord.status}</div>
                      </div>
                    </div>
                    <Button className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" size="sm">
                      Ekle
                    </Button>
                  </div>
                ))
              ) : (
                productsList.map((prod) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all dark:border-border dark:hover:bg-muted/40"
                    key={prod.id}
                    onClick={() => {
                      handleSendMessage({
                        entityId: prod.id,
                        entityStatus: `${prod.currentStock} Adet Stok`,
                        entitySubtitle: `SKU: ${prod.sku} • Fiyat: ${prod.sellingPrice} ₺`,
                        entityTitle: prod.name,
                        entityType: "Product",
                      })
                      setIsEntityPickerOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="h-4 w-4 text-violet-600" />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-foreground">{prod.name}</div>
                        <div className="text-[11px] text-slate-500">SKU: {prod.sku} • {prod.sellingPrice} ₺</div>
                      </div>
                    </div>
                    <Button className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" size="sm">
                      Ekle
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Canned Responses Modal */}
      {isCannedResponsesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-card border border-slate-200 dark:border-border">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-border">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-foreground">Hazır Yanıt Şablonları</h3>
                <p className="text-xs text-slate-500">
                  Sık kullanılan yanıtı seçin, mesaj kutunuza otomatik eklensin.
                </p>
              </div>
              <button
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted"
                onClick={() => setIsCannedResponsesOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto mt-4">
              {cannedResponses.map((item) => (
                <div
                  className="flex items-start justify-between rounded-xl border border-slate-100 p-3 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all dark:border-border dark:bg-card"
                  key={item.id}
                  onClick={() => {
                    setMessageInput(prev => (prev ? `${prev} ${item.content}` : item.content))
                    setIsCannedResponsesOpen(false)
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-foreground">{item.title}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 dark:bg-muted dark:text-slate-300">
                        /{item.shortcut}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{item.content}</p>
                  </div>
                  <Button className="h-7 text-xs shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" size="sm">
                    Kullan
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Create Channel Modal */}
      {isCreateChannelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-card border border-slate-200 dark:border-border">
            <form onSubmit={handleCreateChannel}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-border">
                <h3 className="text-base font-bold text-slate-900 dark:text-foreground">Yeni Sohbet Kanalı Oluştur</h3>
                <button
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted"
                  onClick={() => setIsCreateChannelOpen(false)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="channel-name">Kanal Adı *</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                      id="channel-name"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewChannelTitle(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      placeholder="örn: pazarlama-ekibi"
                      required
                      value={newChannelTitle}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="channel-desc">Açıklama</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                    id="channel-desc"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewChannelDesc(e.target.value)}
                    placeholder="Kanalın amacı ve kapsamı..."
                    value={newChannelDesc}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    checked={newChannelIsPrivate}
                    className="rounded border-slate-300 text-blue-600"
                    id="is-private"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewChannelIsPrivate(e.target.checked)}
                    type="checkbox"
                  />
                  <label className="text-xs cursor-pointer text-slate-600 dark:text-slate-300" htmlFor="is-private">
                    Özel Kanal (Sadece davet edilen üyeler erişebilir)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-border">
                <Button onClick={() => setIsCreateChannelOpen(false)} type="button" variant="outline">
                  İptal
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" type="submit">
                  Kanalı Oluştur
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: New Support Session Modal */}
      {isNewSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-card border border-slate-200 dark:border-border">
            <form onSubmit={handleCreateSupportSession}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-border">
                <h3 className="text-base font-bold text-slate-900 dark:text-foreground">Yeni Destek Talebi Oluştur</h3>
                <button
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-muted"
                  onClick={() => setIsNewSupportModalOpen(false)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="cust-name">Müşteri Adı *</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                    id="cust-name"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSupportCustomerName(e.target.value)}
                    placeholder="örn: Ahmet Yılmaz"
                    required
                    value={newSupportCustomerName}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="cust-email">E-posta</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                    id="cust-email"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSupportEmail(e.target.value)}
                    placeholder="örn: ahmet@sirket.com"
                    type="email"
                    value={newSupportEmail}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="cust-subject">Talep Konusu *</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                    id="cust-subject"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSupportSubject(e.target.value)}
                    placeholder="örn: Sipariş kargo takip sorgusu"
                    required
                    value={newSupportSubject}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Öncelik Seviyesi</label>
                  <Select onValueChange={setNewSupportPriority} value={newSupportPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Düşük</SelectItem>
                      <SelectItem value="Medium">Orta / Normal</SelectItem>
                      <SelectItem value="High">Yüksek</SelectItem>
                      <SelectItem value="Urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="cust-init">İlk Mesaj / Müşteri Notu</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-muted/50 dark:text-foreground"
                    id="cust-init"
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSupportInitialMsg(e.target.value)}
                    placeholder="Müşterinin ilettiği mesaj..."
                    rows={2}
                    value={newSupportInitialMsg}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-border">
                <Button onClick={() => setIsNewSupportModalOpen(false)} type="button" variant="outline">
                  İptal
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" type="submit">
                  Talebi Başlat
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
