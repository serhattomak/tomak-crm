"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Flame,
  History,
  Info,
  Lock,
  Mail,
  MessageSquare,
  Package,
  Phone,
  RefreshCw,
  Send,
  ShoppingCart,
  Timer,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiClient,
  type AddTicketMessagePayload,
  type CannedResponseDto,
  type TenantUserDto,
  type TicketDetailDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const ticketId = (params?.ticketId as string) || "";
  const { activeTenant } = usePermissions();

  const [isLoading, setIsLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketDetailDto | null>(null);

  // References
  const [users, setUsers] = useState<TenantUserDto[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponseDto[]>([]);

  // Composer State
  const [messageMode, setMessageMode] = useState<"public" | "internal">("public");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversation" | "activities">("conversation");

  // Resolution modal / note
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTicket = useCallback(async () => {
    if (!activeTenant || !ticketId) return;
    setIsLoading(true);

    try {
      const [ticketRes, usersRes, cannedRes] = await Promise.all([
        ApiClient.getTicketById(ticketId, activeTenant.id),
        ApiClient.getTenantUsers(activeTenant.id),
        ApiClient.getCannedResponses({}, activeTenant.id),
      ]);

      if (ticketRes.success && ticketRes.data) {
        setTicket(ticketRes.data);
      } else {
        toast.error(ticketRes.message || "Destek talebi bulunamadı.");
      }

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (cannedRes.success && cannedRes.data) {
        setCannedResponses(cannedRes.data);
      }
    } catch (err) {
      console.error("Error loading ticket detail:", err);
      toast.error("Bilet ayrıntıları yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant, ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !ticket || !messageText.trim()) return;

    setIsSending(true);
    try {
      const payload: AddTicketMessagePayload = {
        content: messageText.trim(),
        isInternalNote: messageMode === "internal",
      };

      const res = await ApiClient.addTicketMessage(ticket.id, payload, activeTenant.id);
      if (res.success && res.data) {
        setMessageText("");
        toast.success(
          messageMode === "internal"
            ? "🔒 Dahili ekip notu eklendi."
            : "💬 Müşteriye yanıt gönderildi."
        );
        loadTicket();
      } else {
        toast.error(res.message || "Mesaj gönderilemedi.");
      }
    } catch (err) {
      console.error("Error adding ticket message:", err);
      toast.error("Mesaj gönderilirken hata oluştu.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeTenant || !ticket) return;

    if (newStatus === "Resolved") {
      setIsResolveModalOpen(true);
      return;
    }

    try {
      const res = await ApiClient.updateTicket(
        ticket.id,
        { status: newStatus },
        activeTenant.id
      );
      if (res.success) {
        toast.success(`Bilet durumu "${newStatus}" olarak güncellendi.`);
        loadTicket();
      } else {
        toast.error(res.message || "Durum güncellenemedi.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Durum güncellenirken bir hata oluştu.");
    }
  };

  const handleResolveTicket = async () => {
    if (!activeTenant || !ticket) return;
    try {
      const res = await ApiClient.updateTicket(
        ticket.id,
        {
          status: "Resolved",
          resolutionNotes: resolutionNotes.trim() || undefined,
        },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Destek talebi çözüldü olarak işaretlendi!");
        setIsResolveModalOpen(false);
        setResolutionNotes("");
        loadTicket();
      }
    } catch (err) {
      console.error("Error resolving ticket:", err);
      toast.error("Talep çözümlenirken hata oluştu.");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!activeTenant || !ticket) return;
    try {
      const res = await ApiClient.updateTicket(
        ticket.id,
        { priority: newPriority },
        activeTenant.id
      );
      if (res.success) {
        toast.success(`Öncelik "${newPriority}" olarak güncellendi.`);
        loadTicket();
      }
    } catch (err) {
      console.error("Error updating priority:", err);
      toast.error("Öncelik güncellenirken hata oluştu.");
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    if (!activeTenant || !ticket) return;
    const selectedUser = users.find((u) => u.id === userId);
    try {
      const res = await ApiClient.updateTicket(
        ticket.id,
        {
          assignedUserId: userId === "unassigned" ? undefined : userId,
          assignedUserName: selectedUser?.fullName || selectedUser?.email,
        },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Temsilci ataması yapıldı.");
        loadTicket();
      }
    } catch (err) {
      console.error("Error assigning ticket:", err);
      toast.error("Atama sırasında hata oluştu.");
    }
  };

  const applyCannedResponse = (response: CannedResponseDto) => {
    setMessageText((prev) => (prev ? `${prev}\n\n${response.content}` : response.content));
    toast.info(`"${response.title}" şablonu eklendi.`);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="font-medium text-zinc-500 dark:text-zinc-400 text-sm">Destek talebi ayrıntıları yükleniyor...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <h3 className="mt-4 font-bold text-lg text-zinc-900 dark:text-zinc-100">Talep Bulunamadı</h3>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">Aradığınız bilet silinmiş veya mevcut olmayabilir.</p>
        <Button
          onClick={() => router.push(`/${tenantSlug}/tickets`)}
          className="mt-4 gap-2 rounded-xl bg-blue-600 text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Taleplere Dön</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Top Bar & Navigation */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${tenantSlug}/tickets`)}
            className="rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-800/50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Tüm Talepler</span>
          </Button>

          <div className="h-6 w-px bg-slate-200" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-600 text-sm">
                #{ticket.ticketNumber}
              </span>
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                {ticket.category}
              </span>
              {ticket.isSlaBreached ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 font-bold text-[11px] text-red-700">
                  <Flame className="h-3 w-3 animate-pulse" />
                  SLA Aşıldı
                </span>
              ) : ticket.slaResolutionDueAt ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-[11px] text-emerald-700">
                  <Timer className="h-3 w-3 text-emerald-600" />
                  SLA: {new Date(ticket.slaResolutionDueAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : null}
            </div>
            <h1 className="font-bold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {ticket.subject}
            </h1>
          </div>
        </div>

        {/* Status, Priority & Assignee Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Selector */}
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl border-zinc-200 dark:border-zinc-800 font-medium text-xs">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">Yeni</SelectItem>
              <SelectItem value="InProgress">İşlemde</SelectItem>
              <SelectItem value="PendingCustomer">Müşteri Bekleniyor</SelectItem>
              <SelectItem value="OnHold">Beklemede</SelectItem>
              <SelectItem value="Resolved">Çözüldü</SelectItem>
              <SelectItem value="Closed">Kapatıldı</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Selector */}
          <Select value={ticket.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="h-9 w-[120px] rounded-xl border-zinc-200 dark:border-zinc-800 font-medium text-xs">
              <SelectValue placeholder="Öncelik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Düşük</SelectItem>
              <SelectItem value="Medium">Orta</SelectItem>
              <SelectItem value="High">Yüksek</SelectItem>
              <SelectItem value="Urgent">Acil / Kritik</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee Selector */}
          <Select
            value={ticket.assignedUserId || "unassigned"}
            onValueChange={handleAssigneeChange}
          >
            <SelectTrigger className="h-9 w-[150px] rounded-xl border-zinc-200 dark:border-zinc-800 font-medium text-xs">
              <SelectValue placeholder="Temsilci" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Atanmamış</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTicket()}
            className="h-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800/50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Main Workspace Split (70% Conversation & Timeline + 30% Customer 360) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left / Center: Conversation Flow (8 Cols) */}
        <div className="space-y-4 lg:col-span-8">
          {/* Tabs for Conversation / Activity Audit */}
          <div className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800 border-b pb-2">
            <button
              onClick={() => setActiveTab("conversation")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition-all ${
                activeTab === "conversation"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800"
              }`}
              type="button"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Konuşma Akışı ({ticket.messages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("activities")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition-all ${
                activeTab === "activities"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800"
              }`}
              type="button"
            >
              <History className="h-3.5 w-3.5" />
              <span>Denetim & İşlem Geçmişi ({ticket.activities.length})</span>
            </button>
          </div>

          {activeTab === "conversation" ? (
            <div className="flex flex-col rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden min-h-[500px]">
              {/* Messages Stream Container */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800/50/40 max-h-[520px]">
                {/* Initial Description if no messages */}
                {ticket.messages.length === 0 && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-xs shadow-2xs">
                    <div className="flex items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>{ticket.customerName} (İlk Talep)</span>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">
                        {new Date(ticket.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <p className="mt-2 text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {ticket.description || ticket.subject}
                    </p>
                  </div>
                )}

                {/* Message Bubbles */}
                {ticket.messages.map((m) => {
                  const isInternal = m.messageType === "InternalNote";
                  const isSystem = m.messageType === "SystemEvent";
                  const isCustomer = m.senderType === "Customer";

                  if (isSystem) {
                    return (
                      <div key={m.id} className="flex justify-center my-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 text-[11px] text-zinc-600 dark:text-zinc-400 shadow-2xs">
                          <Info className="h-3 w-3" />
                          {m.content}
                        </span>
                      </div>
                    );
                  }

                  if (isInternal) {
                    return (
                      /* Yellow / Amber Internal Whisper Note */
                      <div
                        key={m.id}
                        className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between border-amber-200/70 border-b pb-2 text-amber-900">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-bold text-[11px] text-amber-800">
                              <Lock className="h-3 w-3 text-amber-600" />
                              Dahili Ekip Notu (Müşteri Göremez)
                            </span>
                            <span className="text-amber-700/80 font-medium">· {m.senderName}</span>
                          </div>
                          <span className="text-amber-700/70 text-[10px]">
                            {new Date(m.createdAt).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-2.5 font-medium text-amber-950 leading-relaxed whitespace-pre-wrap">
                          {m.content}
                        </p>
                      </div>
                    );
                  }

                  return (
                    /* Regular Public Message Bubble */
                    <div
                      key={m.id}
                      className={`flex gap-3 ${isCustomer ? "justify-start" : "justify-end"}`}
                    >
                      {isCustomer && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-xs text-zinc-700 dark:text-zinc-300">
                          {m.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-xs shadow-2xs ${
                          isCustomer
                            ? "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                            : "border border-blue-600 bg-blue-600 text-white"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between gap-3 text-[10px] pb-1.5 border-b ${
                            isCustomer
                              ? "border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400"
                              : "border-blue-500/80 text-blue-100"
                          }`}
                        >
                          <span className="font-semibold">{m.senderName}</span>
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="mt-2 leading-relaxed whitespace-pre-wrap">{m.content}</p>

                        {/* Embed Cards if attached */}
                        {m.entityEmbeds?.map((e) => (
                          <div
                            key={e.id}
                            className={`mt-2.5 flex items-center gap-2 rounded-xl p-2.5 ${
                              isCustomer ? "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800" : "bg-blue-700/60 border border-blue-400/40"
                            }`}
                          >
                            <Package className="h-4 w-4 shrink-0" />
                            <div>
                              <div className="font-bold">{e.entityTitle}</div>
                              {e.entitySubtitle && (
                                <div className="text-[10px] opacity-80">{e.entitySubtitle}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {!isCustomer && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-xs text-blue-700">
                          {m.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Two-Mode Response Composer */}
              <div className="border-zinc-200 dark:border-zinc-800 border-t bg-white dark:bg-zinc-900 p-3.5">
                {/* Mode Selector & Quick Tools */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
                  <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setMessageMode("public")}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all ${
                        messageMode === "public"
                          ? "bg-white dark:bg-zinc-900 text-blue-700 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Müşteriye Yanıt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageMode("internal")}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all ${
                        messageMode === "internal"
                          ? "bg-amber-100 text-amber-900 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Dahili Not (Gizli)</span>
                    </button>
                  </div>

                  {/* Canned Responses Dropdown */}
                  {cannedResponses.length > 0 && (
                    <Select onValueChange={(val) => {
                      const found = cannedResponses.find((c) => c.id === val);
                      if (found) applyCannedResponse(found);
                    }}>
                      <SelectTrigger className="h-7 w-[160px] rounded-lg border-zinc-200 dark:border-zinc-800 text-[11px]">
                        <Zap className="mr-1 h-3 w-3 text-amber-500" />
                        <SelectValue placeholder="Hazır Şablonlar" />
                      </SelectTrigger>
                      <SelectContent>
                        {cannedResponses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title} (/{c.shortcut})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="space-y-2">
                  <textarea
                    rows={3}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      messageMode === "internal"
                        ? "🔒 Yalnızca ekip arkadaşlarının göreceği dahili gizli not yazın..."
                        : "💬 Müşteriye iletilecek resmi destek yanıtınızı yazın..."
                    }
                    className={`w-full rounded-2xl border p-3 text-xs focus:outline-none transition-all ${
                      messageMode === "internal"
                        ? "border-amber-300 bg-amber-50/40 text-amber-950 focus:border-amber-500"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-blue-500"
                    }`}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {messageMode === "internal" ? (
                        <span className="text-amber-700 font-medium">⚠️ Bu not müşteriye iletilmez</span>
                      ) : (
                        "Resmi yanıt müşteriye gönderilecektir"
                      )}
                    </span>

                    <Button
                      type="submit"
                      disabled={isSending || !messageText.trim()}
                      className={`gap-2 rounded-xl text-xs font-semibold shadow-sm text-white ${
                        messageMode === "internal"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isSending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {messageMode === "internal" ? "Dahili Notu Kaydet" : "Yanıtı Gönder"}
                      </span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* ACTIVITY AUDIT LOG */
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-3">İşlem ve Durum Günlüğü</h3>
              <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3 space-y-4">
                {ticket.activities.map((act) => (
                  <div key={act.id} className="relative pl-6 text-xs">
                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-xs" />
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{act.userName}</span>
                      <span>{new Date(act.createdAt).toLocaleString("tr-TR")}</span>
                    </div>
                    <p className="mt-0.5 text-zinc-800 dark:text-zinc-200">{act.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Customer 360 & Context (4 Cols) */}
        <div className="space-y-4 lg:col-span-4">
          {/* Customer Profile Card */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="flex items-center justify-between border-zinc-100 dark:border-zinc-800 border-b pb-2.5">
              <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Müşteri Profili</span>
              <Link
                href={`/${tenantSlug}/customers/${ticket.customerId}`}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 text-xs hover:underline"
              >
                <span>360 Kartı</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700 text-sm">
                  {ticket.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{ticket.customerName}</h4>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Kayıtlı Müşteri</span>
                </div>
              </div>

              {ticket.customerEmail && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Mail className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="truncate">{ticket.customerEmail}</span>
                </div>
              )}

              {ticket.customerPhone && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Phone className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>{ticket.customerPhone}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 border-zinc-100 dark:border-zinc-800 border-t pt-2.5 text-center">
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-2">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Toplam Talep</span>
                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    {ticket.customer360?.totalTicketsCount ?? 1}
                  </span>
                </div>
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-2">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Açık Talepler</span>
                  <span className="font-bold text-sm text-blue-600">
                    {ticket.customer360?.openTicketsCount ?? 1}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Linked CRM Entity (e.g. Order or Product) */}
          {ticket.linkedEntityTitle && (
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs">
              <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block mb-2">
                İlişkili CRM Kaydı
              </span>
              <div className="flex items-center justify-between rounded-xl bg-blue-50/70 p-3 text-xs border border-blue-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">{ticket.linkedEntityTitle}</span>
                </div>
                {ticket.linkedEntityId && (
                  <Link
                    href={`/${tenantSlug}/orders/${ticket.linkedEntityId}`}
                    className="text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Previous Tickets History */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block mb-2.5">
              Müşterinin Geçmiş Talepleri
            </span>
            {ticket.customer360?.recentTickets && ticket.customer360.recentTickets.length > 0 ? (
              <div className="space-y-2">
                {ticket.customer360.recentTickets.map((pt) => (
                  <Link
                    key={pt.id}
                    href={`/${tenantSlug}/tickets/${pt.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-zinc-800 p-2.5 text-xs transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="space-y-0.5 max-w-[170px]">
                      <span className="font-bold text-blue-600 text-[11px]">#{pt.ticketNumber}</span>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 text-[11px]">{pt.subject}</p>
                    </div>
                    <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600 dark:text-zinc-400">
                      {pt.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-zinc-400 dark:text-zinc-500 text-xs">Müşterinin başka bir geçmiş talebi yok.</p>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Notes Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 border-zinc-100 dark:border-zinc-800 border-b pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Talebi Çözüldü Olarak İşaretle</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">Çözüm detaylarını ve notlarınızı ekleyin</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Çözüm Notu / Açıklaması
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Müşteriye sunulan çözüm veya yapılan işlem..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs"
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  onClick={handleResolveTicket}
                  className="rounded-xl bg-emerald-600 font-medium text-white text-xs hover:bg-emerald-700"
                >
                  Çözüldü Olarak Onayla
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
