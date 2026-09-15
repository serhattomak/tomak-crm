"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
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
  type AddTicketMessagePayload,
  ApiClient,
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
  const [cannedResponses, setCannedResponses] = useState<CannedResponseDto[]>(
    []
  );

  // Composer State
  const [messageMode, setMessageMode] = useState<"public" | "internal">(
    "public"
  );
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversation" | "activities">(
    "conversation"
  );
  const [includeInternal, setIncludeInternal] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<CannedResponseDto | null>(null);
  const [templateForm, setTemplateForm] = useState({
    category: "Genel",
    content: "",
    shortcut: "",
    title: "",
  });

  // Resolution modal / note
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTicket = useCallback(async () => {
    if (!(activeTenant && ticketId)) {
      return;
    }
    setIsLoading(true);

    try {
      const [ticketRes, usersRes, cannedRes] = await Promise.all([
        ApiClient.getTicketById(ticketId, activeTenant.id, includeInternal),
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
    } catch {
      toast.error("Bilet ayrıntıları yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant, ticketId, includeInternal]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(activeTenant && ticket && messageText.trim())) {
      return;
    }

    setIsSending(true);
    try {
      const payload: AddTicketMessagePayload = {
        content: messageText.trim(),
        isInternalNote: messageMode === "internal",
      };

      const res = await ApiClient.addTicketMessage(
        ticket.id,
        payload,
        activeTenant.id
      );
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
    } catch {
      toast.error("Mesaj gönderilirken hata oluştu.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!(activeTenant && ticket)) {
      return;
    }

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
    } catch {
      toast.error("Durum güncellenirken bir hata oluştu.");
    }
  };

  const handleResolveTicket = async () => {
    if (!(activeTenant && ticket)) {
      return;
    }
    try {
      const res = await ApiClient.updateTicket(
        ticket.id,
        {
          resolutionNotes: resolutionNotes.trim() || undefined,
          status: "Resolved",
        },
        activeTenant.id
      );
      if (res.success) {
        toast.success("Destek talebi çözüldü olarak işaretlendi!");
        setIsResolveModalOpen(false);
        setResolutionNotes("");
        loadTicket();
      } else {
        toast.error(res.message || "Çözümleme başarısız.");
      }
    } catch {
      toast.error("Talep çözümlenirken hata oluştu.");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!(activeTenant && ticket)) {
      return;
    }
    try {
      const res = await ApiClient.updateTicket(
        ticket.id,
        { priority: newPriority },
        activeTenant.id
      );
      if (res.success) {
        toast.success(`Öncelik "${newPriority}" olarak güncellendi.`);
        loadTicket();
      } else {
        toast.error(res.message || "Öncelik güncellenemedi.");
      }
    } catch {
      toast.error("Öncelik güncellenirken hata oluştu.");
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    if (!(activeTenant && ticket)) {
      return;
    }
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
      } else {
        toast.error(res.message || "Atama başarısız.");
      }
    } catch {
      toast.error("Atama sırasında hata oluştu.");
    }
  };

  const applyCannedResponse = (response: CannedResponseDto) => {
    setMessageText((prev) =>
      prev ? `${prev}\n\n${response.content}` : response.content
    );
    toast.info(`"${response.title}" şablonu eklendi.`);
  };

  const handleTemplateSave = async () => {
    if (
      !(
        activeTenant &&
        templateForm.title.trim() &&
        templateForm.content.trim()
      )
    ) {
      toast.error("Başlık ve içerik zorunlu.");
      return;
    }
    try {
      if (editingTemplate) {
        const res = await ApiClient.updateCannedResponse(
          editingTemplate.id,
          templateForm,
          activeTenant.id
        );
        if (res.success) {
          toast.success("Şablon güncellendi.");
          setIsTemplateManagerOpen(false);
          setEditingTemplate(null);
          setTemplateForm({
            category: "Genel",
            content: "",
            shortcut: "",
            title: "",
          });
          loadTicket();
        } else {
          toast.error(res.message || "Güncelleme başarısız.");
        }
      } else {
        const res = await ApiClient.createCannedResponse(
          templateForm,
          activeTenant.id
        );
        if (res.success) {
          toast.success("Şablon oluşturuldu.");
          setTemplateForm({
            category: "Genel",
            content: "",
            shortcut: "",
            title: "",
          });
          loadTicket();
        } else {
          toast.error(res.message || "Oluşturma başarısız.");
        }
      }
    } catch {
      toast.error("Şablon işlemi başarısız.");
    }
  };

  const handleTemplateDelete = async (id: string) => {
    if (!activeTenant) {
      return;
    }
    const res = await ApiClient.deleteCannedResponse(id, activeTenant.id);
    if (res.success) {
      toast.success("Şablon silindi.");
      loadTicket();
    } else {
      toast.error(res.message || "Silme başarısız.");
    }
  };

  const handleTemplateEdit = (t: CannedResponseDto) => {
    setEditingTemplate(t);
    setTemplateForm({
      category: t.category,
      content: t.content,
      shortcut: t.shortcut,
      title: t.title,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-8 dark:border-zinc-800/90 dark:bg-zinc-900">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
          Destek talebi ayrıntıları yükleniyor...
        </span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <h3 className="mt-4 font-bold text-lg text-zinc-900 dark:text-zinc-100">
          Talep Bulunamadı
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Aradığınız bilet silinmiş veya mevcut olmayabilir.
        </p>
        <Button
          className="mt-4 gap-2 rounded-xl bg-blue-600 text-white"
          onClick={() => router.push(`/${tenantSlug}/tickets`)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Taleplere Dön</span>
        </Button>
      </div>
    );
  }

  return (
    <PageContainer className="space-y-4">
      {/* 1. Top Bar & Navigation */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/90 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Button
            className="rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            onClick={() => router.push(`/${tenantSlug}/tickets`)}
            size="sm"
            variant="outline"
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
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
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
                  SLA:{" "}
                  {new Date(ticket.slaResolutionDueAt).toLocaleTimeString(
                    "tr-TR",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </span>
              ) : null}
            </div>
            <h1 className="line-clamp-1 font-bold text-base text-zinc-900 dark:text-zinc-100">
              {ticket.subject}
            </h1>
          </div>
        </div>

        {/* Status, Priority & Assignee Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Selector */}
          <Select onValueChange={handleStatusChange} value={ticket.status}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl border-zinc-200 font-medium text-xs dark:border-zinc-800">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">Yeni</SelectItem>
              <SelectItem value="InProgress">İşlemde</SelectItem>
              <SelectItem value="PendingCustomer">
                Müşteri Bekleniyor
              </SelectItem>
              <SelectItem value="OnHold">Beklemede</SelectItem>
              <SelectItem value="Resolved">Çözüldü</SelectItem>
              <SelectItem value="Closed">Kapatıldı</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Selector */}
          <Select onValueChange={handlePriorityChange} value={ticket.priority}>
            <SelectTrigger className="h-9 w-[120px] rounded-xl border-zinc-200 font-medium text-xs dark:border-zinc-800">
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
            onValueChange={handleAssigneeChange}
            value={ticket.assignedUserId || "unassigned"}
          >
            <SelectTrigger className="h-9 w-[150px] rounded-xl border-zinc-200 font-medium text-xs dark:border-zinc-800">
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
            className="h-9 rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
            onClick={() => loadTicket()}
            size="sm"
            variant="outline"
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
          <div className="flex items-center gap-2 border-zinc-200 border-b pb-2 dark:border-zinc-800">
            <button
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition-all ${
                activeTab === "conversation"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
              onClick={() => setActiveTab("conversation")}
              type="button"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Konuşma Akışı ({ticket.messages.length})</span>
            </button>

            <button
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition-all ${
                activeTab === "activities"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
              onClick={() => setActiveTab("activities")}
              type="button"
            >
              <History className="h-3.5 w-3.5" />
              <span>Denetim & İşlem Geçmişi ({ticket.activities.length})</span>
            </button>
            <label className="ml-auto flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 font-semibold text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <input
                checked={includeInternal}
                onChange={(e) => setIncludeInternal(e.target.checked)}
                type="checkbox"
              />
              <span>Dahili notları göster</span>
            </label>
          </div>

          {activeTab === "conversation" ? (
            <div className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
              {/* Messages Stream Container */}
              <div className="max-h-[520px] flex-1 space-y-4 overflow-y-auto bg-zinc-50 p-4 sm:p-6 dark:bg-zinc-800/50">
                {/* Initial Description if no messages */}
                {ticket.messages.length === 0 && (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>{ticket.customerName} (İlk Talep)</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {new Date(ticket.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-zinc-800 leading-relaxed dark:text-zinc-200">
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
                      <div className="my-2 flex justify-center" key={m.id}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 text-[11px] text-zinc-600 shadow-2xs dark:text-zinc-400">
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
                        className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-xs shadow-xs"
                        key={m.id}
                      >
                        <div className="flex items-center justify-between border-amber-200/70 border-b pb-2 text-amber-900">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-bold text-[11px] text-amber-800">
                              <Lock className="h-3 w-3 text-amber-600" />
                              Dahili Ekip Notu (Müşteri Göremez)
                            </span>
                            <span className="font-medium text-amber-700/80">
                              · {m.senderName}
                            </span>
                          </div>
                          <span className="text-[10px] text-amber-700/70">
                            {new Date(m.createdAt).toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-2.5 whitespace-pre-wrap font-medium text-amber-950 leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    );
                  }

                  return (
                    /* Regular Public Message Bubble */
                    <div
                      className={`flex gap-3 ${isCustomer ? "justify-start" : "justify-end"}`}
                      key={m.id}
                    >
                      {isCustomer && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-xs text-zinc-700 dark:text-zinc-300">
                          {m.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-xs shadow-2xs ${
                          isCustomer
                            ? "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                            : "border border-blue-600 bg-blue-600 text-white"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between gap-3 border-b pb-1.5 text-[10px] ${
                            isCustomer
                              ? "border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
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

                        <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                          {m.content}
                        </p>

                        {/* Embed Cards if attached */}
                        {m.entityEmbeds?.map((e) => (
                          <div
                            className={`mt-2.5 flex items-center gap-2 rounded-xl p-2.5 ${
                              isCustomer
                                ? "border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50"
                                : "border border-blue-400/40 bg-blue-700/60"
                            }`}
                            key={e.id}
                          >
                            <Package className="h-4 w-4 shrink-0" />
                            <div>
                              <div className="font-bold">{e.entityTitle}</div>
                              {e.entitySubtitle && (
                                <div className="text-[10px] opacity-80">
                                  {e.entitySubtitle}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {!isCustomer && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                          {m.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Two-Mode Response Composer */}
              <div className="border-zinc-200 border-t bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                {/* Mode Selector & Quick Tools */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
                  <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-800">
                    <button
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all ${
                        messageMode === "public"
                          ? "bg-white text-blue-700 shadow-xs dark:bg-zinc-900"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                      onClick={() => setMessageMode("public")}
                      type="button"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Müşteriye Yanıt</span>
                    </button>
                    <button
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all ${
                        messageMode === "internal"
                          ? "bg-amber-100 text-amber-900 shadow-xs"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                      onClick={() => setMessageMode("internal")}
                      type="button"
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Dahili Not (Gizli)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Canned Responses Dropdown */}
                    {cannedResponses.length > 0 && (
                      <Select
                        onValueChange={(val) => {
                          const found = cannedResponses.find(
                            (c) => c.id === val
                          );
                          if (found) {
                            applyCannedResponse(found);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-[160px] rounded-lg border-zinc-200 text-[11px] dark:border-zinc-800">
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
                    <button
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 font-semibold text-[11px] text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                      onClick={() => setIsTemplateManagerOpen(true)}
                      type="button"
                    >
                      Şablonları Yönet
                    </button>
                  </div>
                </div>

                <form className="space-y-2" onSubmit={handleSendMessage}>
                  <textarea
                    className={`w-full rounded-2xl border p-3 text-xs transition-all focus:outline-none ${
                      messageMode === "internal"
                        ? "border-amber-300 bg-amber-50/40 text-amber-950 focus:border-amber-500"
                        : "border-zinc-200 bg-white text-zinc-900 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    }`}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      messageMode === "internal"
                        ? "🔒 Yalnızca ekip arkadaşlarının göreceği dahili gizli not yazın..."
                        : "💬 Müşteriye iletilecek resmi destek yanıtınızı yazın..."
                    }
                    rows={3}
                    value={messageText}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {messageMode === "internal" ? (
                        <span className="font-medium text-amber-700">
                          ⚠️ Bu not müşteriye iletilmez
                        </span>
                      ) : (
                        "Resmi yanıt müşteriye gönderilecektir"
                      )}
                    </span>

                    <Button
                      className={`gap-2 rounded-xl font-semibold text-white text-xs shadow-sm ${
                        messageMode === "internal"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      disabled={isSending || !messageText.trim()}
                      type="submit"
                    >
                      {isSending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {messageMode === "internal"
                          ? "Dahili Notu Kaydet"
                          : "Yanıtı Gönder"}
                      </span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* ACTIVITY AUDIT LOG */
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
              <h3 className="mb-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                İşlem ve Durum Günlüğü
              </h3>
              <div className="relative ml-3 space-y-4 border-zinc-200 border-l dark:border-zinc-800">
                {ticket.activities.map((act) => (
                  <div className="relative pl-6 text-xs" key={act.id}>
                    <div className="absolute top-1 -left-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-xs" />
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {act.userName}
                      </span>
                      <span>
                        {new Date(act.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                      {act.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Customer 360 & Context (4 Cols) */}
        <div className="space-y-4 lg:col-span-4">
          {/* Customer Profile Card */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-zinc-100 border-b pb-2.5 dark:border-zinc-800">
              <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                Müşteri Profili
              </span>
              <Link
                className="inline-flex items-center gap-1 font-semibold text-blue-600 text-xs hover:underline"
                href={`/${tenantSlug}/customers/${ticket.customerId}`}
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
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    {ticket.customerName}
                  </h4>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Kayıtlı Müşteri
                  </span>
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

              <div className="grid grid-cols-2 gap-2 border-zinc-100 border-t pt-2.5 text-center dark:border-zinc-800">
                <div className="rounded-xl bg-zinc-50 p-2 dark:bg-zinc-800/50">
                  <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
                    Toplam Talep
                  </span>
                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    {ticket.customer360?.totalTicketsCount ?? 1}
                  </span>
                </div>
                <div className="rounded-xl bg-zinc-50 p-2 dark:bg-zinc-800/50">
                  <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
                    Açık Talepler
                  </span>
                  <span className="font-bold text-blue-600 text-sm">
                    {ticket.customer360?.openTicketsCount ?? 1}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Linked CRM Entity (e.g. Order or Product) */}
          {ticket.linkedEntityTitle && (
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
              <span className="mb-2 block font-bold text-xs text-zinc-800 dark:text-zinc-200">
                İlişkili CRM Kaydı
              </span>
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    {ticket.linkedEntityTitle}
                  </span>
                </div>
                {ticket.linkedEntityId && (
                  <Link
                    className="text-blue-600 hover:underline"
                    href={`/${tenantSlug}/orders/${ticket.linkedEntityId}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Previous Tickets History */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
            <span className="mb-2.5 block font-bold text-xs text-zinc-800 dark:text-zinc-200">
              Müşterinin Geçmiş Talepleri
            </span>
            {ticket.customer360?.recentTickets &&
            ticket.customer360.recentTickets.length > 0 ? (
              <div className="space-y-2">
                {ticket.customer360.recentTickets.map((pt) => (
                  <Link
                    className="flex items-center justify-between rounded-xl border border-zinc-100 p-2.5 text-xs transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-zinc-800"
                    href={`/${tenantSlug}/tickets/${pt.id}`}
                    key={pt.id}
                  >
                    <div className="max-w-[170px] space-y-0.5">
                      <span className="font-bold text-[11px] text-blue-600">
                        #{pt.ticketNumber}
                      </span>
                      <p className="line-clamp-1 font-medium text-[11px] text-zinc-800 dark:text-zinc-200">
                        {pt.subject}
                      </p>
                    </div>
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {pt.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Müşterinin başka bir geçmiş talebi yok.
              </p>
            )}
          </div>

          {/* Customer 360: Recent Orders with Products */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
            <span className="mb-2.5 block font-bold text-xs text-zinc-800 dark:text-zinc-200">
              Son Siparişler (Gerçek Veri)
            </span>
            {ticket.customer360?.recentOrders &&
            ticket.customer360.recentOrders.length > 0 ? (
              <div className="space-y-2.5">
                {ticket.customer360.recentOrders.map((ord) => (
                  <div
                    className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/30"
                    key={ord.id}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-[11px] text-blue-700">
                        {ord.orderNumber}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-bold text-[10px] ${ord.status === "Delivered" ? "bg-emerald-100 text-emerald-700" : ord.status === "Cancelled" ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-700"}`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>
                        {new Date(ord.orderDate).toLocaleDateString("tr-TR")}
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₺
                        {ord.totalAmount.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        · {ord.paymentStatus}
                      </span>
                    </div>
                    {ord.items && ord.items.length > 0 && (
                      <div className="mt-2 space-y-1 rounded-lg bg-white p-2 dark:bg-zinc-900">
                        {ord.items.slice(0, 3).map((it) => (
                          <div
                            className="flex justify-between text-[11px]"
                            key={it.id}
                          >
                            <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">
                              {it.productName} {it.sku ? `(${it.sku})` : ""}
                            </span>
                            <span className="shrink-0 font-mono text-zinc-500">
                              ×{it.quantity}
                            </span>
                          </div>
                        ))}
                        {ord.items.length > 3 && (
                          <div className="text-[10px] text-zinc-400">
                            +{ord.items.length - 3} ürün daha
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Son 5 sipariş bulunamadı.
              </p>
            )}
          </div>

          {/* Customer 360: Recent Shipments / Kargo */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900">
            <span className="mb-2.5 block font-bold text-xs text-zinc-800 dark:text-zinc-200">
              Kargo & Sevkiyat (Son 5)
            </span>
            {ticket.customer360?.recentShipments &&
            ticket.customer360.recentShipments.length > 0 ? (
              <div className="space-y-2">
                {ticket.customer360.recentShipments.map((sh) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-zinc-100 p-2.5 text-xs dark:border-zinc-800"
                    key={sh.id}
                  >
                    <div>
                      <div className="font-bold font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                        {sh.shipmentNumber}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {sh.carrierName || "Taşıyıcı yok"}
                        {sh.trackingNumber ? ` · ${sh.trackingNumber}` : ""}
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${sh.status === "Delivered" ? "bg-emerald-100 text-emerald-700" : sh.status === "InTransit" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700"}`}
                    >
                      {sh.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Kargo kaydı yok.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Notes Modal */}
      {isResolveModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsResolveModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
            showCloseButton={false}
          >
            <div className="flex items-center gap-2.5 border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Talebi Çözüldü Olarak İşaretle
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Çözüm detaylarını ve notlarınızı ekleyin
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-zinc-700 dark:text-zinc-300">
                  Çözüm Notu / Açıklaması
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-none dark:border-zinc-800"
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Müşteriye sunulan çözüm veya yapılan işlem..."
                  rows={3}
                  value={resolutionNotes}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  className="rounded-xl border-zinc-200 text-xs dark:border-zinc-800"
                  onClick={() => setIsResolveModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  İptal
                </Button>
                <Button
                  className="rounded-xl bg-emerald-600 font-medium text-white text-xs hover:bg-emerald-700"
                  onClick={handleResolveTicket}
                  type="button"
                >
                  Çözüldü Olarak Onayla
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Template Manager Modal (PUT/DELETE) */}
      {isTemplateManagerOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsTemplateManagerOpen(false);
              setEditingTemplate(null);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Hazır Şablonları Yönet (PUT/DELETE)
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
                  type="button"
                >
                  ✕
                </button>
              </DialogClose>
            </div>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {cannedResponses.map((t) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/40"
                  key={t.id}
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold text-zinc-900 dark:text-zinc-100">
                      {t.title}{" "}
                      <span className="font-mono text-[10px] text-zinc-500">
                        /{t.shortcut}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-zinc-500">
                      {t.content.slice(0, 80)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className="rounded-lg bg-blue-50 px-2 py-1 font-semibold text-[11px] text-blue-700 hover:bg-blue-100"
                      onClick={() => handleTemplateEdit(t)}
                      type="button"
                    >
                      Düzenle
                    </button>
                    <button
                      className="rounded-lg bg-rose-50 px-2 py-1 font-semibold text-[11px] text-rose-700 hover:bg-rose-100"
                      onClick={() => handleTemplateDelete(t.id)}
                      type="button"
                    >
                      Sil
                    </button>
                    <button
                      className="rounded-lg border border-zinc-200 px-2 py-1 font-semibold text-[11px] text-zinc-600 hover:bg-zinc-100"
                      onClick={() => applyCannedResponse(t)}
                      type="button"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              ))}
              {cannedResponses.length === 0 && (
                <p className="text-xs text-zinc-400">Henüz şablon yok.</p>
              )}
            </div>
            <div className="mt-4 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
              <div className="font-bold text-[11px] text-zinc-600 uppercase tracking-wider">
                {editingTemplate
                  ? "Şablonu Düzenle (PUT)"
                  : "Yeni Şablon (POST)"}
              </div>
              <input
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-800"
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Başlık"
                type="text"
                value={templateForm.title}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-800"
                  onChange={(e) =>
                    setTemplateForm((p) => ({ ...p, shortcut: e.target.value }))
                  }
                  placeholder="Kısayol (örn: selam)"
                  type="text"
                  value={templateForm.shortcut}
                />
                <input
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-800"
                  onChange={(e) =>
                    setTemplateForm((p) => ({ ...p, category: e.target.value }))
                  }
                  placeholder="Kategori"
                  type="text"
                  value={templateForm.category}
                />
              </div>
              <textarea
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-800"
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, content: e.target.value }))
                }
                placeholder="İçerik"
                rows={3}
                value={templateForm.content}
              />
              <div className="flex justify-end gap-2">
                {editingTemplate && (
                  <button
                    className="rounded-xl px-3 py-1.5 font-semibold text-xs text-zinc-600 hover:bg-zinc-100"
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateForm({
                        category: "Genel",
                        content: "",
                        shortcut: "",
                        title: "",
                      });
                    }}
                    type="button"
                  >
                    Vazgeç
                  </button>
                )}
                <button
                  className="rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white text-xs hover:bg-blue-700"
                  onClick={handleTemplateSave}
                  type="button"
                >
                  {editingTemplate ? "Güncelle (PUT)" : "Kaydet"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
