"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Forward,
  LifeBuoy,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  Reply,
  UserPlus,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClient,
  type EmailAttachmentDto,
  type EmailMessageDto,
  type EmailThreadDto,
} from "@/lib/api-client";
import { renderEmailPreviewHtml } from "@/lib/email-preview";
import { ConvertToLeadModal } from "./convert-to-lead-modal";
import { ConvertToTicketModal } from "./convert-to-ticket-modal";

interface EmailThreadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onReply: (message: EmailMessageDto, isForward?: boolean) => void;
  onStatusChange?: () => void;
  tenantId: string;
  threadId: string | null;
}

function formatDateTr(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "-";
  }
  return `${d.toLocaleDateString("tr-TR")} ${d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

interface MessageCardProps {
  index: number;
  isExpanded: boolean;
  message: EmailMessageDto;
  onConvertToLead: (message: EmailMessageDto) => void;
  onConvertToTicket: (message: EmailMessageDto) => void;
  onReply: (message: EmailMessageDto, isForward?: boolean) => void;
  onToggleExpand: (id: string) => void;
  onToggleRead: (message: EmailMessageDto) => void;
}

interface MessageCardBodyProps {
  index: number;
  isDark: boolean;
  message: EmailMessageDto;
  onConvertToLead: () => void;
  onConvertToTicket: () => void;
  onForward: () => void;
  onRead: () => void;
  onReply: () => void;
}

function MessageCardBody({
  index,
  isDark,
  message,
  onConvertToLead,
  onConvertToTicket,
  onForward,
  onRead,
  onReply,
}: MessageCardBodyProps) {
  return (
    <div className="space-y-4 border-border border-t px-5 py-4">
      {/* Meta details */}
      {message.ccAddresses && message.ccAddresses.length > 0 ? (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium">Bilgi (Cc):</span>{" "}
          {message.ccAddresses.join(", ")}
        </div>
      ) : null}

      {/* Sandboxed HTML render via iframe srcDoc */}
      <div
        className={`rounded-lg border p-3 transition-colors ${ isDark ? "border-zinc-800 bg-zinc-950 text-zinc-100" : "border-border bg-card text-zinc-900" }`}
      >
        {message.htmlBody ? (
          <iframe
            className="min-h-[160px] w-full border-0"
            sandbox="allow-same-origin allow-popups"
            srcDoc={renderEmailPreviewHtml(message.htmlBody, isDark)}
            title={`İleti Gövdesi ${index + 1}`}
          />
        ) : (
          <p className="whitespace-pre-wrap font-sans text-sm text-zinc-700 dark:text-zinc-300">
            {message.textBody || "(Boş ileti gövdesi)"}
          </p>
        )}
      </div>

      {/* Attachments */}
      {message.attachments.length > 0 ? (
        <div className="space-y-2 pt-2">
          <p className="font-semibold text-xs text-zinc-600 dark:text-zinc-400">
            Ekler ({message.attachments.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att: EmailAttachmentDto) => (
              <a
                className="flex items-center gap-2 rounded-lg border border-border bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                href={att.storagePath}
                key={att.id}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
                <span className="line-clamp-1 max-w-[160px] font-medium">
                  {att.filename}
                </span>
                <span className="text-[10px] text-zinc-400">
                  ({formatBytes(att.sizeBytes)})
                </span>
                <Download className="ml-1 h-3.5 w-3.5 text-zinc-400" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* Message Action Toolbar */}
      <div className="flex items-center justify-between border-border border-t pt-2">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={onReply}
            type="button"
          >
            <Reply className="h-3.5 w-3.5" />
            Yanıtla
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={onForward}
            type="button"
          >
            <Forward className="h-3.5 w-3.5" />
            İlet
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 py-1.5 font-medium text-blue-700 text-xs hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
            onClick={onConvertToLead}
            title="E-postayı satış fırsatına dönüştür"
            type="button"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Fırsat Yap
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/50 px-2.5 py-1.5 font-medium text-purple-700 text-xs hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
            onClick={onConvertToTicket}
            title="E-postayı destek talebine dönüştür"
            type="button"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Talep Aç
          </button>
        </div>

        <button
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          onClick={onRead}
          type="button"
        >
          {message.isRead ? (
            <>
              <Mail className="h-3.5 w-3.5" />
              <span>Okunmadı İşaretle</span>
            </>
          ) : (
            <>
              <MailOpen className="h-3.5 w-3.5" />
              <span>Okundu İşaretle</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function MessageCard({
  index,
  isExpanded,
  message,
  onConvertToLead,
  onConvertToTicket,
  onReply,
  onToggleExpand,
  onToggleRead,
}: MessageCardProps) {
  const isOutbound = message.direction === "Outbound";
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const handleHeaderClick = useCallback(() => {
    onToggleExpand(message.id);
  }, [onToggleExpand, message.id]);

  const handleReplyClick = useCallback(() => {
    onReply(message, false);
  }, [onReply, message]);

  const handleForwardClick = useCallback(() => {
    onReply(message, true);
  }, [onReply, message]);

  const handleReadClick = useCallback(() => {
    onToggleRead(message);
  }, [onToggleRead, message]);

  const handleConvertToLeadClick = useCallback(() => {
    onConvertToLead(message);
  }, [onConvertToLead, message]);

  const handleConvertToTicketClick = useCallback(() => {
    onConvertToTicket(message);
  }, [onConvertToTicket, message]);

  return (
    <div
      className={`rounded-xl border transition-all ${ isOutbound ? "border-sky-200/80 bg-sky-50/30 dark:border-sky-900/30 dark:bg-sky-950/20" : "border-border bg-card" } shadow-2xs`}
    >
      {/* Message Header / Accordion trigger */}
      <button
        className="flex w-full cursor-pointer items-center justify-between p-4 text-left"
        onClick={handleHeaderClick}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-xs ${
              isOutbound
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {message.fromAddress.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {message.fromAddress}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${
                  isOutbound
                    ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {message.direction === "Inbound" ? "Gelen" : "Giden"}
              </span>
              {message.status === "Failed" ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-[10px] text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  Başarısız
                </span>
              ) : null}
            </div>
            <p className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
              Kime: {message.toAddresses.join(", ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {formatDateTr(message.createdAt)}
          </span>
          {message.attachments.length > 0 ? (
            <span
              className="flex items-center gap-1 text-xs text-zinc-400"
              title={`${message.attachments.length} dosya eki`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              {message.attachments.length}
            </span>
          ) : null}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Message Body (When Expanded) */}
      {isExpanded ? (
        <MessageCardBody
          index={index}
          isDark={isDark}
          message={message}
          onConvertToLead={handleConvertToLeadClick}
          onConvertToTicket={handleConvertToTicketClick}
          onForward={handleForwardClick}
          onRead={handleReadClick}
          onReply={handleReplyClick}
        />
      ) : null}
    </div>
  );
}

export function EmailThreadDrawer({
  isOpen,
  onClose,
  onReply,
  onStatusChange,
  tenantId,
  threadId,
}: EmailThreadDrawerProps) {
  const [thread, setThread] = useState<EmailThreadDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    new Set()
  );

  const loadThread = useCallback(async () => {
    if (!threadId) {
      setThread(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getEmailThread(threadId, tenantId);
      if (res.success && res.data) {
        setThread(res.data);
        const msgs = res.data.messages;
        if (msgs.length > 0) {
          const lastMsg = msgs.at(-1);
          if (lastMsg) {
            setExpandedMessageIds(new Set([lastMsg.id]));
          }
        }
      } else {
        setError(res.message || "E-posta dizisi yüklenemedi.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsLoading(false);
    }
  }, [threadId, tenantId]);

  useEffect(() => {
    if (isOpen && threadId) {
      loadThread();
    }
  }, [isOpen, threadId, loadThread]);

  const toggleExpand = useCallback((messageId: string) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const handleToggleRead = useCallback(
    async (message: EmailMessageDto) => {
      try {
        const newStatus = !message.isRead;
        const res = await ApiClient.markEmailRead(
          message.id,
          newStatus,
          tenantId
        );
        if (res.success) {
          toast.success(
            newStatus
              ? "Okundu olarak işaretlendi"
              : "Okunmadı olarak işaretlendi"
          );
          setThread((prev) => {
            if (!prev) {
              return null;
            }
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === message.id ? { ...m, isRead: newStatus } : m
              ),
            };
          });
          onStatusChange?.();
        }
      } catch {
        toast.error("Durum güncellenirken hata oluştu");
      }
    },
    [tenantId, onStatusChange]
  );

  const [leadModalMessage, setLeadModalMessage] =
    useState<EmailMessageDto | null>(null);
  const [ticketModalMessage, setTicketModalMessage] =
    useState<EmailMessageDto | null>(null);

  const handleOpenLeadModal = useCallback((msg: EmailMessageDto) => {
    setLeadModalMessage(msg);
  }, []);

  const handleCloseLeadModal = useCallback(() => {
    setLeadModalMessage(null);
  }, []);

  const handleOpenTicketModal = useCallback((msg: EmailMessageDto) => {
    setTicketModalMessage(msg);
  }, []);

  const handleCloseTicketModal = useCallback(() => {
    setTicketModalMessage(null);
  }, []);

  const handleHeaderConvertToLead = useCallback(() => {
    if (!thread?.messages || thread.messages.length === 0) {
      return;
    }
    const msgs = [...thread.messages].reverse();
    const lastInbound =
      msgs.find((m: EmailMessageDto) => m.direction !== "Outbound") || msgs[0];
    if (lastInbound) {
      setLeadModalMessage(lastInbound);
    }
  }, [thread]);

  const handleHeaderConvertToTicket = useCallback(() => {
    if (!thread?.messages || thread.messages.length === 0) {
      return;
    }
    const msgs = [...thread.messages].reverse();
    const lastInbound =
      msgs.find((m: EmailMessageDto) => m.direction !== "Outbound") || msgs[0];
    if (lastInbound) {
      setTicketModalMessage(lastInbound);
    }
  }, [thread]);

  if (!isOpen) {
    return null;
  }

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <SheetContent
        aria-describedby={undefined}
        className="data-[side=right]:w-full max-w-2xl data-[side=right]:sm:max-w-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              aria-label="Geri"
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <SheetTitle className="line-clamp-1 font-semibold text-base text-zinc-900 dark:text-zinc-100">
                {thread?.subject || "E-posta Dizisi"}
              </SheetTitle>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{thread?.messages.length || 0} ileti</span>
                {thread?.messages && thread.messages.length > 0 ? (
                  <>
                    <span>•</span>
                    <span>
                      Son aktivite:{" "}
                      {formatDateTr(thread.messages.at(-1)?.createdAt)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 font-medium text-blue-700 text-xs hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              onClick={handleHeaderConvertToLead}
              title="E-postadan Müşteri ve Satış Fırsatı Oluştur"
              type="button"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fırsata Dönüştür</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 font-medium text-purple-700 text-xs hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
              onClick={handleHeaderConvertToTicket}
              title="E-postadan Destek Talebi Aç"
              type="button"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Destek Talebi Aç</span>
            </button>
            <SheetClose asChild>
              <button
                aria-label="Kapat"
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </SheetClose>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              <span className="text-sm">İletiler yükleniyor...</span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            </div>
          ) : null}

          {!(isLoading || error) &&
          thread?.messages &&
          thread.messages.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-zinc-500">
              <Mail className="mb-2 h-8 w-8 text-zinc-300" />
              <p className="text-sm">Bu dizide henüz ileti bulunmuyor.</p>
            </div>
          ) : null}

          {!(isLoading || error) && thread?.messages
            ? thread.messages.map((message, index) => (
                <MessageCard
                  index={index}
                  isExpanded={expandedMessageIds.has(message.id)}
                  key={message.id}
                  message={message}
                  onConvertToLead={handleOpenLeadModal}
                  onConvertToTicket={handleOpenTicketModal}
                  onReply={onReply}
                  onToggleExpand={toggleExpand}
                  onToggleRead={handleToggleRead}
                />
              ))
            : null}
        </div>
      </SheetContent>

      <ConvertToLeadModal
        isOpen={Boolean(leadModalMessage)}
        message={leadModalMessage}
        onClose={handleCloseLeadModal}
        tenantSlug={tenantId}
      />
      <ConvertToTicketModal
        isOpen={Boolean(ticketModalMessage)}
        message={ticketModalMessage}
        onClose={handleCloseTicketModal}
        tenantSlug={tenantId}
      />
    </Sheet>
  );
}
