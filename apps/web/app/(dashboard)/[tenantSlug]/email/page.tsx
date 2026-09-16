"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Mail,
  Moon,
  Paperclip,
  PenSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Sun,
  Trash2,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ComposeModal } from "@/components/email/compose-modal";
import { EmailAccountModal } from "@/components/email/email-account-modal";
import { EmailThreadDrawer } from "@/components/email/email-thread-drawer";
import { TemplateModal } from "@/components/email/template-modal";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type EmailAccountDto,
  type EmailMessageDto,
  type EmailStatsDto,
  type QuoteTemplateDto,
} from "@/lib/api-client";
import { renderEmailPreviewHtml } from "@/lib/email-preview";

type EmailTab = "inbox" | "sent" | "drafts" | "accounts" | "templates";

const PAGE_SIZE = 20;

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

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function resolveDirectionAndStatus(tab: EmailTab): {
  direction?: string;
  status?: string;
} {
  if (tab === "inbox") {
    return { direction: "Inbound" };
  }
  if (tab === "sent") {
    return { direction: "Outbound", status: "Sent" };
  }
  if (tab === "drafts") {
    return { direction: "Outbound", status: "Draft" };
  }
  return {};
}

// ---------------------------------------------------------------------------
// KPI Cards Component
// ---------------------------------------------------------------------------
interface KpiCardsProps {
  isLoading: boolean;
  stats: EmailStatsDto;
}

function KpiCards({ isLoading, stats }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-xs text-muted-foreground">
            Gelen Kutusu
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
            <Inbox className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono font-semibold text-2xl text-zinc-900 dark:text-zinc-100">
            {isLoading ? "-" : stats.inboxTotal}
          </span>
          <span className="text-xs text-muted-foreground">toplam ileti</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-xs text-muted-foreground">
            Okunmamış İletiler
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            <Mail className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono font-semibold text-2xl text-zinc-900 dark:text-zinc-100">
            {isLoading ? "-" : stats.unreadCount}
          </span>
          {stats.unreadCount > 0 ? (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 font-medium text-3xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Aksiyon Bekliyor
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-xs text-muted-foreground">
            Bugün Gönderilen
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Send className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono font-semibold text-2xl text-zinc-900 dark:text-zinc-100">
            {isLoading ? "-" : stats.sentToday}
          </span>
          <span className="text-xs text-muted-foreground">başarılı çıkış</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messages Table Row Component
// ---------------------------------------------------------------------------
interface MessageRowProps {
  accounts: EmailAccountDto[];
  activeTab: EmailTab;
  msg: EmailMessageDto;
  onDelete: (msg: EmailMessageDto) => void;
  onEditDraft?: (msg: EmailMessageDto) => void;
  onOpenThread: (msg: EmailMessageDto) => void;
}

function MessageRow({
  accounts,
  activeTab,
  msg,
  onDelete,
  onEditDraft,
  onOpenThread,
}: MessageRowProps) {
  const isUnread = !msg.isRead && msg.direction === "Inbound";
  const boundAccount =
    accounts.find((a) => a.id === msg.accountId)?.email || "-";

  const handleRowClick = useCallback(() => {
    onOpenThread(msg);
  }, [onOpenThread, msg]);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(msg);
    },
    [onDelete, msg]
  );

  const handleEditDraftClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEditDraft?.(msg);
    },
    [onEditDraft, msg]
  );

  return (
    <TableRow
      className={`cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
        isUnread ? "bg-sky-50/20 font-semibold dark:bg-sky-950/10" : ""
      }`}
      onClick={handleRowClick}
    >
      <TableCell className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-2">
          {isUnread ? (
            <span className="h-2 w-2 shrink-0 rounded-full bg-sky-600" />
          ) : null}
          <span className="line-clamp-1 max-w-[180px] text-zinc-900 dark:text-zinc-100">
            {activeTab === "inbox"
              ? msg.fromAddress
              : msg.toAddresses.join(", ") || "-"}
          </span>
        </div>
      </TableCell>

      <TableCell className="max-w-md px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="line-clamp-1 text-zinc-900 dark:text-zinc-100">
            {msg.subject || "(Konusuz)"}
          </span>
          {msg.hasAttachments ? (
            <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : null}
        </div>
        <p className="line-clamp-1 font-normal text-2xs text-muted-foreground">
          {msg.textBody || msg.htmlBody?.replace(/<[^>]+>/g, " ") || "-"}
        </p>
      </TableCell>

      <TableCell className="whitespace-nowrap px-4 py-3 font-mono text-2xs text-muted-foreground">
        {boundAccount}
      </TableCell>

      {activeTab === "sent" ? (
        <TableCell className="whitespace-nowrap px-4 py-3">
          {msg.status === "Sent" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-3xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Gönderildi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-3xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <XCircle className="h-3 w-3" />
              Başarısız
            </span>
          )}
        </TableCell>
      ) : null}

      <TableCell className="whitespace-nowrap px-4 py-3 text-right font-mono text-2xs text-muted-foreground">
        {formatDateTr(msg.createdAt)}
      </TableCell>

      <TableCell className="whitespace-nowrap px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {activeTab === "drafts" && onEditDraft ? (
            <button
              className="rounded-lg p-1 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={handleEditDraftClick}
              title="Düzenle"
              type="button"
            >
              <PenSquare className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            className="rounded-lg p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
            onClick={handleDeleteClick}
            title="Sil"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Account Row Component
// ---------------------------------------------------------------------------
interface AccountRowProps {
  account: EmailAccountDto;
  onDelete: (account: EmailAccountDto) => void;
  onEdit: (account: EmailAccountDto) => void;
  onTest: (account: EmailAccountDto) => void;
  onToggle: (account: EmailAccountDto) => void;
}

function AccountRow({
  account,
  onDelete,
  onEdit,
  onTest,
  onToggle,
}: AccountRowProps) {
  const handleToggle = useCallback(() => {
    onToggle(account);
  }, [onToggle, account]);

  const handleTest = useCallback(() => {
    onTest(account);
  }, [onTest, account]);

  const handleEdit = useCallback(() => {
    onEdit(account);
  }, [onEdit, account]);

  const handleDelete = useCallback(() => {
    onDelete(account);
  }, [onDelete, account]);

  return (
    <TableRow className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <TableCell className="px-4 py-3">
        <div className="font-medium text-zinc-900 dark:text-zinc-100">
          {account.email}
        </div>
        {account.description ? (
          <div className="text-2xs text-muted-foreground">
            {account.description}
          </div>
        ) : null}
      </TableCell>

      <TableCell className="px-4 py-3">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium font-mono text-3xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {account.provider}
        </span>
      </TableCell>

      <TableCell className="px-4 py-3 font-mono text-2xs text-zinc-600 dark:text-zinc-400">
        {account.provider === "generic_imap" ? (
          <div>
            <div>
              IMAP: {account.imapHost}:{account.imapPort}
            </div>
            <div>
              SMTP: {account.smtpHost}:{account.smtpPort}
            </div>
          </div>
        ) : (
          <span>Resend API Token ({account.secretMasked || "****"})</span>
        )}
      </TableCell>

      <TableCell className="px-4 py-3">
        <button
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-3xs transition ${
            account.isActive
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
          onClick={handleToggle}
          type="button"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              account.isActive ? "bg-emerald-500" : "bg-zinc-400"
            }`}
          />
          {account.isActive ? "Aktif" : "Devre Dışı"}
        </button>
      </TableCell>

      <TableCell className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            className="rounded-lg border border-border bg-card px-2 py-1 font-medium text-2xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300"
            onClick={handleTest}
            title="Bağlantıyı Test Et"
            type="button"
          >
            Test Et
          </button>

          <button
            className="rounded-lg p-1 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={handleEdit}
            title="Düzenle"
            type="button"
          >
            <PenSquare className="h-3.5 w-3.5" />
          </button>

          <button
            className="rounded-lg p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
            onClick={handleDelete}
            title="Sil"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Template Delete Action Component
// ---------------------------------------------------------------------------
interface DeleteActionButtonProps {
  isConfirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteActionButton({
  isConfirming,
  onCancel,
  onConfirm,
}: DeleteActionButtonProps) {
  if (isConfirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          className="rounded bg-rose-600 px-1.5 py-0.5 font-medium text-3xs text-white hover:bg-rose-700"
          onClick={onConfirm}
          type="button"
        >
          Sil
        </button>
        <button
          className="rounded px-1 py-0.5 text-3xs text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={onCancel}
          type="button"
        >
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      className="p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
      onClick={onConfirm}
      title="Şablonu Sil"
      type="button"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Template Card Component
// ---------------------------------------------------------------------------
interface TemplateCardProps {
  onCompose: (template: QuoteTemplateDto) => void;
  onDelete?: (template: QuoteTemplateDto) => void;
  onEdit?: (template: QuoteTemplateDto) => void;
  onPreview: (template: QuoteTemplateDto) => void;
  template: QuoteTemplateDto;
}

function TemplateCard({
  onCompose,
  onDelete,
  onEdit,
  onPreview,
  template,
}: TemplateCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handlePreview = useCallback(() => {
    onPreview(template);
  }, [onPreview, template]);

  const handleCompose = useCallback(() => {
    onCompose(template);
  }, [onCompose, template]);

  const handleEdit = useCallback(() => {
    onEdit?.(template);
  }, [onEdit, template]);

  const handleDelete = useCallback(() => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    onDelete?.(template);
    setIsConfirmingDelete(false);
  }, [isConfirmingDelete, onDelete, template]);

  const handleCancelDelete = useCallback(() => {
    setIsConfirmingDelete(false);
  }, []);

  return (
    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-border bg-card p-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="line-clamp-1 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {template.name}
          </h3>
          {template.isDefault ? (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-3xs text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              Varsayılan
            </span>
          ) : null}
        </div>
        {template.subject ? (
          <p className="mt-1 line-clamp-1 font-mono text-xs text-muted-foreground">
            Konu: {template.subject}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-border border-t pt-3">
        <div className="flex items-center gap-1.5">
          <button
            className="inline-flex items-center gap-1 font-medium text-sky-600 text-xs hover:underline dark:text-sky-400"
            onClick={handlePreview}
            type="button"
          >
            <span>Önizle</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          {onEdit ? (
            <button
              className="inline-flex items-center gap-1 font-medium text-xs text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={handleEdit}
              title="Şablonu Düzenle"
              type="button"
            >
              <PenSquare className="h-3 w-3" />
              <span>Düzenle</span>
            </button>
          ) : null}

          {onDelete ? (
            <DeleteActionButton
              isConfirming={isConfirmingDelete}
              onCancel={handleCancelDelete}
              onConfirm={handleDelete}
            />
          ) : null}
        </div>

        <button
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-zinc-50 px-2.5 py-1 font-medium text-xs text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300"
          onClick={handleCompose}
          type="button"
        >
          <span>Bu Şablonla Yaz</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messages Table View Component
// ---------------------------------------------------------------------------
interface MessagesTableViewProps {
  accounts: EmailAccountDto[];
  activeTab: EmailTab;
  isLoading: boolean;
  messages: EmailMessageDto[];
  onDelete: (msg: EmailMessageDto) => void;
  onEditDraft?: (msg: EmailMessageDto) => void;
  onOpenNewAccount: () => void;
  onOpenThread: (msg: EmailMessageDto) => void;
}

function MessagesTableView({
  accounts,
  activeTab,
  isLoading,
  messages,
  onDelete,
  onEditDraft,
  onOpenNewAccount,
  onOpenThread,
}: MessagesTableViewProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm">İletiler yükleniyor...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    let emptyMessage = "Gelen kutunuzda henüz yeni bir e-posta yok.";
    if (activeTab === "sent") {
      emptyMessage = "Henüz gönderilmiş bir e-posta bulunmuyor.";
    } else if (activeTab === "drafts") {
      emptyMessage = "Kayıtlı taslak iletiniz bulunmuyor.";
    }

    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <Mail className="mb-2 h-10 w-10 text-zinc-300" />
        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
          İleti bulunamadı
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{emptyMessage}</p>
        {accounts.length === 0 ? (
          <button
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            onClick={onOpenNewAccount}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            İlk Hesabınızı Bağlayın
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="border-border bg-zinc-50 text-muted-foreground dark:bg-zinc-800/50">
          <TableRow>
            <TableHead className="px-4 py-3 font-medium h-auto">
              {activeTab === "inbox" ? "Gönderen" : "Alıcı"}
            </TableHead>
            <TableHead className="px-4 py-3 font-medium h-auto">Konu & Özet</TableHead>
            <TableHead className="px-4 py-3 font-medium h-auto">Hesap</TableHead>
            {activeTab === "sent" ? (
              <TableHead className="px-4 py-3 font-medium h-auto">Durum</TableHead>
            ) : null}
            <TableHead className="px-4 py-3 text-right font-medium h-auto">Tarih</TableHead>
            <TableHead className="px-4 py-3 text-right font-medium h-auto">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {messages.map((msg) => (
            <MessageRow
              accounts={accounts}
              activeTab={activeTab}
              key={msg.id}
              msg={msg}
              onDelete={onDelete}
              onEditDraft={activeTab === "drafts" ? onEditDraft : undefined}
              onOpenThread={onOpenThread}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accounts Table View Component
// ---------------------------------------------------------------------------
interface AccountsTableViewProps {
  accounts: EmailAccountDto[];
  isLoading: boolean;
  onDeleteAccount: (acc: EmailAccountDto) => void;
  onEditAccount: (acc: EmailAccountDto) => void;
  onOpenNewAccount: () => void;
  onTestAccount: (acc: EmailAccountDto) => void;
  onToggleAccount: (acc: EmailAccountDto) => void;
}

function AccountsTableView({
  accounts,
  isLoading,
  onDeleteAccount,
  onEditAccount,
  onOpenNewAccount,
  onTestAccount,
  onToggleAccount,
}: AccountsTableViewProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm">Hesaplar yükleniyor...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
        <Server className="mb-2 h-10 w-10 text-zinc-300" />
        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
          Henüz bağlı e-posta hesabı yok
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Ortak gelen kutusunu kullanmak için kurumsal e-posta hesabınızı
          bağlayın.
        </p>
        <button
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          onClick={onOpenNewAccount}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          İlk Hesabınızı Bağlayın
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="border-border bg-zinc-50 text-muted-foreground dark:bg-zinc-800/50">
          <TableRow>
            <TableHead className="px-4 py-3 font-medium h-auto">E-posta & Açıklama</TableHead>
            <TableHead className="px-4 py-3 font-medium h-auto">Sağlayıcı</TableHead>
            <TableHead className="px-4 py-3 font-medium h-auto">Sunucu Yapılandırması</TableHead>
            <TableHead className="px-4 py-3 font-medium h-auto">Durum</TableHead>
            <TableHead className="px-4 py-3 text-right font-medium h-auto">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {accounts.map((acc) => (
            <AccountRow
              account={acc}
              key={acc.id}
              onDelete={onDeleteAccount}
              onEdit={onEditAccount}
              onTest={onTestAccount}
              onToggle={onToggleAccount}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Templates Grid View Component
// ---------------------------------------------------------------------------
interface TemplatesGridViewProps {
  isLoading: boolean;
  onCompose: (template: QuoteTemplateDto) => void;
  onDelete?: (template: QuoteTemplateDto) => void;
  onEdit?: (template: QuoteTemplateDto) => void;
  onPreview: (template: QuoteTemplateDto) => void;
  templates: QuoteTemplateDto[];
}

function TemplatesGridView({
  isLoading,
  onCompose,
  onDelete,
  onEdit,
  onPreview,
  templates,
}: TemplatesGridViewProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm">Şablonlar yükleniyor...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <FileText className="mx-auto mb-2 h-10 w-10 text-zinc-300" />
        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
          Henüz kayıtlı şablon bulunmuyor
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Yeni bir e-posta veya teklif şablonu oluşturarak başlayabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((tpl) => (
        <TemplateCard
          key={tpl.id}
          onCompose={onCompose}
          onDelete={onDelete}
          onEdit={onEdit}
          onPreview={onPreview}
          template={tpl}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Nav Header Component
// ---------------------------------------------------------------------------
interface EmailNavHeaderProps {
  accountsCount: number;
  activeTab: EmailTab;
  onTabAccounts: () => void;
  onTabDrafts: () => void;
  onTabInbox: () => void;
  onTabSent: () => void;
  onTabTemplates: () => void;
  unreadCount: number;
}

function EmailNavHeader({
  accountsCount,
  activeTab,
  onTabAccounts,
  onTabDrafts,
  onTabInbox,
  onTabSent,
  onTabTemplates,
  unreadCount,
}: EmailNavHeaderProps) {
  return (
    <div className="border-border border-b">
      <nav className="flex space-x-6">
        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium text-sm transition ${
            activeTab === "inbox"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-muted-foreground hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={onTabInbox}
          type="button"
        >
          <Inbox className="h-4 w-4" />
          <span>Gelen Kutusu</span>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-semibold text-3xs text-white dark:bg-zinc-100 dark:text-zinc-900">
              {unreadCount}
            </span>
          ) : null}
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium text-sm transition ${
            activeTab === "sent"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-muted-foreground hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={onTabSent}
          type="button"
        >
          <Send className="h-4 w-4" />
          <span>Gönderilenler</span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium text-sm transition ${
            activeTab === "drafts"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-muted-foreground hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={onTabDrafts}
          type="button"
        >
          <Clock className="h-4 w-4" />
          <span>Taslaklar</span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium text-sm transition ${
            activeTab === "accounts"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-muted-foreground hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={onTabAccounts}
          type="button"
        >
          <Server className="h-4 w-4" />
          <span>Bağlı Hesaplar</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-3xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {accountsCount}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 pb-3 font-medium text-sm transition ${
            activeTab === "templates"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-muted-foreground hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={onTabTemplates}
          type="button"
        >
          <FileText className="h-4 w-4" />
          <span>Şablonlar</span>
        </button>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messages Filter Bar Component
// ---------------------------------------------------------------------------
interface MessagesFilterBarProps {
  accounts: EmailAccountDto[];
  activeTab: EmailTab;
  isReadFilter: string;
  onAccountFilterChange: (value: string) => void;
  onReadFilterChange: (value: string) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchQuery: string;
  selectedAccountId: string;
  totalCount: number;
}

function MessagesFilterBar({
  accounts,
  activeTab,
  isReadFilter,
  onAccountFilterChange,
  onReadFilterChange,
  onSearchChange,
  searchQuery,
  selectedAccountId,
  totalCount,
}: MessagesFilterBarProps) {
  if (activeTab !== "inbox" && activeTab !== "sent" && activeTab !== "drafts") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-border bg-card py-2 pr-3 pl-9 text-xs text-zinc-900 focus:outline-none dark:text-zinc-100"
            onChange={onSearchChange}
            placeholder="Gönderen, konu veya içerik ara..."
            type="text"
            value={searchQuery}
          />
        </div>

        <div className="w-full sm:w-[220px]">
          <Combobox
            emptyMessage="Hesap bulunamadı."
            onChange={onAccountFilterChange}
            options={[
              { label: "Tüm Hesaplar", value: "" },
              ...accounts.map((acc) => ({
                description: acc.description || acc.provider,
                label: acc.email,
                value: acc.id,
              })),
            ]}
            placeholder="Tüm Hesaplar"
            searchPlaceholder="Hesap ara..."
            value={selectedAccountId}
          />
        </div>

        {activeTab === "inbox" ? (
          <div className="w-full sm:w-[170px]">
            <SelectField
              onChange={onReadFilterChange}
              options={[
                { label: "Tüm Durumlar", value: "all" },
                { label: "Sadece Okunmamış", value: "unread" },
                { label: "Sadece Okunmuş", value: "read" },
              ]}
              placeholder="Tüm Durumlar"
              value={isReadFilter}
            />
          </div>
        ) : null}
      </div>

      <span className="text-xs text-muted-foreground">Toplam {totalCount} ileti</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Preview Modal Component
// ---------------------------------------------------------------------------
interface TemplatePreviewModalProps {
  onClose: () => void;
  template: QuoteTemplateDto | null;
}

function TemplatePreviewModal({
  onClose,
  template,
}: TemplatePreviewModalProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [previewThemeMode, setPreviewThemeMode] = useState<
    "auto" | "light" | "dark"
  >("auto");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark =
    previewThemeMode === "auto"
      ? mounted && resolvedTheme === "dark"
      : previewThemeMode === "dark";

  const handleTogglePreviewTheme = useCallback(() => {
    setPreviewThemeMode((prev) => {
      if (prev === "auto") {
        return isDark ? "light" : "dark";
      }
      return prev === "dark" ? "light" : "dark";
    });
  }, [isDark]);

  if (!template) {
    return null;
  }

  const displayHtml = renderEmailPreviewHtml(template.htmlBody || "", isDark);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] w-full flex-col gap-0 p-6 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-border border-b pb-3">
          <div className="flex items-center gap-3">
            <DialogTitle className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              {template.name} Önizleme
            </DialogTitle>

            <button
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-0.5 font-medium text-2xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300"
              onClick={handleTogglePreviewTheme}
              title={isDark ? "Açık (Kağıt) Görünüme Geç" : "Koyu Görünüme Geç"}
              type="button"
            >
              {isDark ? (
                <Sun className="h-3 w-3 text-amber-500" />
              ) : (
                <Moon className="h-3 w-3 text-muted-foreground" />
              )}
              <span>{isDark ? "Kağıt Görünümü" : "Koyu Görünüm"}</span>
            </button>
          </div>

          <DialogClose asChild>
            <button
              aria-label="Kapat"
              className="rounded-lg p-1 text-muted-foreground hover:text-zinc-600"
              type="button"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <div
            className={`rounded-xl border p-2 transition-colors ${ isDark ? "border-zinc-800 bg-zinc-950 text-zinc-100" : "border-border bg-card text-zinc-900" }`}
          >
            <iframe
              className="min-h-[350px] w-full border-0"
              sandbox="allow-same-origin"
              srcDoc={displayHtml}
              title="Şablon Önizleme"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Workbench Page Component
// ---------------------------------------------------------------------------
export default function EmailWorkbenchPage() {
  const params = useParams();
  const tenantSlug = (params.tenantSlug as string) || "";
  const tenantId = tenantSlug;

  const [activeTab, setActiveTab] = useState<EmailTab>("inbox");

  const [stats, setStats] = useState<EmailStatsDto>({
    inboxTotal: 0,
    sentToday: 0,
    unreadCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  const [accounts, setAccounts] = useState<EmailAccountDto[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);

  const [messages, setMessages] = useState<EmailMessageDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isReadFilter, setIsReadFilter] = useState<string>("all");

  const [templates, setTemplates] = useState<QuoteTemplateDto[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] =
    useState<QuoteTemplateDto | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] =
    useState<boolean>(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] =
    useState<QuoteTemplateDto | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composePrefill, setComposePrefill] = useState<{
    accountId?: string;
    cc?: string[];
    draftId?: string;
    htmlBody?: string;
    subject?: string;
    to?: string[];
  }>({});

  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] =
    useState<EmailAccountDto | null>(null);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isThreadDrawerOpen, setIsThreadDrawerOpen] = useState<boolean>(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await ApiClient.getEmailStats(tenantId);
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoadingStats(false);
    }
  }, [tenantId]);

  const fetchAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await ApiClient.getEmailAccounts(tenantId);
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [tenantId]);

  const fetchMessages = useCallback(async () => {
    if (activeTab === "accounts" || activeTab === "templates") {
      return;
    }

    setIsLoadingMessages(true);
    try {
      const { direction, status } = resolveDirectionAndStatus(activeTab);

      let readParam: boolean | undefined;
      if (isReadFilter === "unread") {
        readParam = false;
      }
      if (isReadFilter === "read") {
        readParam = true;
      }

      const res = await ApiClient.getEmailMessages(
        {
          accountId: selectedAccountId || undefined,
          direction,
          isRead: readParam,
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status,
        },
        tenantId
      );

      if (res.success && res.data) {
        setMessages(res.data.items);
        setTotalCount(res.data.totalCount || 0);
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoadingMessages(false);
    }
  }, [
    activeTab,
    selectedAccountId,
    isReadFilter,
    debouncedSearch,
    page,
    tenantId,
  ]);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await ApiClient.getQuoteTemplates(tenantId);
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStats();
    fetchAccounts();
  }, [fetchStats, fetchAccounts]);

  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    } else if (activeTab !== "accounts") {
      fetchMessages();
    }
  }, [activeTab, fetchMessages, fetchTemplates]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      if (activeTab === "inbox") {
        fetchMessages();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchMessages, activeTab]);

  const handleTabSelect = useCallback((tab: EmailTab) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const handleTabInbox = useCallback(
    () => handleTabSelect("inbox"),
    [handleTabSelect]
  );
  const handleTabSent = useCallback(
    () => handleTabSelect("sent"),
    [handleTabSelect]
  );
  const handleTabDrafts = useCallback(
    () => handleTabSelect("drafts"),
    [handleTabSelect]
  );
  const handleTabAccounts = useCallback(
    () => handleTabSelect("accounts"),
    [handleTabSelect]
  );
  const handleTabTemplates = useCallback(
    () => handleTabSelect("templates"),
    [handleTabSelect]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPage(1);
    },
    []
  );

  const handleAccountFilterChange = useCallback((value: string) => {
    setSelectedAccountId(value);
    setPage(1);
  }, []);

  const handleReadFilterChange = useCallback((value: string) => {
    setIsReadFilter(value);
    setPage(1);
  }, []);

  const handleOpenCompose = useCallback(() => {
    setComposePrefill({});
    setIsComposeOpen(true);
  }, []);

  const handleOpenNewAccount = useCallback(() => {
    setSelectedAccountForEdit(null);
    setIsAccountModalOpen(true);
  }, []);

  const handleRefreshAll = useCallback(() => {
    fetchStats();
    fetchAccounts();
    if (activeTab === "templates") {
      fetchTemplates();
    } else {
      fetchMessages();
    }
  }, [fetchStats, fetchAccounts, activeTab, fetchTemplates, fetchMessages]);

  const handleOpenThread = useCallback((msg: EmailMessageDto) => {
    const targetThreadId = msg.threadId || msg.id;
    setActiveThreadId(targetThreadId);
    setIsThreadDrawerOpen(true);
  }, []);

  const handleReplyFromThread = useCallback(
    (msg: EmailMessageDto, isForward = false) => {
      setIsThreadDrawerOpen(false);
      const prefix = isForward ? "Fwd: " : "Re: ";
      const cleanSubj = msg.subject || "";
      const newSubject = cleanSubj.startsWith(prefix)
        ? cleanSubj
        : `${prefix}${cleanSubj}`;

      const quoteBlock = `
<br/><br/>
<blockquote style="border-left: 2px solid #e4e4e7; margin-left: 0; padding-left: 12px; color: #71717a;">
  <strong>Kimden:</strong> ${msg.fromAddress}<br/>
  <strong>Tarih:</strong> ${formatDateTr(msg.createdAt)}<br/>
  <strong>Konu:</strong> ${msg.subject || ""}<br/><br/>
  ${msg.htmlBody || msg.textBody || ""}
</blockquote>`;

      setComposePrefill({
        accountId: msg.accountId,
        htmlBody: quoteBlock,
        subject: newSubject,
        to: isForward ? [] : [msg.fromAddress],
      });
      setIsComposeOpen(true);
    },
    []
  );

  const handleEditDraft = useCallback((msg: EmailMessageDto) => {
    setComposePrefill({
      accountId: msg.accountId,
      cc: msg.ccAddresses,
      draftId: msg.id,
      htmlBody: msg.htmlBody || "",
      subject: msg.subject || "",
      to: msg.toAddresses,
    });
    setIsComposeOpen(true);
  }, []);

  const handleDeleteMessage = useCallback(
    async (msg: EmailMessageDto) => {
      try {
        const res = await ApiClient.deleteEmailMessage(msg.id, tenantId);
        if (res.success) {
          toast.success("İleti silindi.");
          fetchMessages();
          fetchStats();
        } else {
          toast.error(res.message || "İleti silinemedi.");
        }
      } catch {
        toast.error("Hata oluştu.");
      }
    },
    [tenantId, fetchMessages, fetchStats]
  );

  const handleToggleAccount = useCallback(
    async (acc: EmailAccountDto) => {
      try {
        const res = await ApiClient.toggleEmailAccount(
          acc.id,
          !acc.isActive,
          tenantId
        );
        if (res.success) {
          toast.success(
            acc.isActive
              ? "Hesap devre dışı bırakıldı."
              : "Hesap aktifleştirildi."
          );
          fetchAccounts();
        }
      } catch {
        toast.error("İşlem başarısız.");
      }
    },
    [tenantId, fetchAccounts]
  );

  const handleDeleteAccount = useCallback(
    async (acc: EmailAccountDto) => {
      try {
        const res = await ApiClient.deleteEmailAccount(acc.id, tenantId);
        if (res.success) {
          toast.success("Hesap kaldırıldı.");
          fetchAccounts();
          fetchStats();
        }
      } catch {
        toast.error("Hesap silinemedi.");
      }
    },
    [tenantId, fetchAccounts, fetchStats]
  );

  const handleEditAccount = useCallback((acc: EmailAccountDto) => {
    setSelectedAccountForEdit(acc);
    setIsAccountModalOpen(true);
  }, []);

  const handleTestAccount = useCallback(
    async (acc: EmailAccountDto) => {
      toast.info("Bağlantı test ediliyor...");
      try {
        const res = await ApiClient.testEmailAccountConnection(
          acc.id,
          tenantId
        );
        if (res.success && res.data) {
          if (res.data.success) {
            toast.success(res.data.message || "Bağlantı başarılı!");
          } else {
            toast.error(res.data.message || "Bağlantı testi başarısız.");
          }
        }
      } catch {
        toast.error("Test sırasında hata oluştu.");
      }
    },
    [tenantId]
  );

  const handlePreviewTemplate = useCallback((tpl: QuoteTemplateDto) => {
    setPreviewTemplate(tpl);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  const handleComposeWithTemplate = useCallback((tpl: QuoteTemplateDto) => {
    setComposePrefill({
      htmlBody: tpl.htmlBody || "",
      subject: tpl.subject || "",
    });
    setIsComposeOpen(true);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleCloseThreadDrawer = useCallback(() => {
    setIsThreadDrawerOpen(false);
  }, []);

  const handleThreadStatusChange = useCallback(() => {
    fetchMessages();
    fetchStats();
  }, [fetchMessages, fetchStats]);

  const handleCloseCompose = useCallback(() => {
    setIsComposeOpen(false);
  }, []);

  const handleComposeSent = useCallback(() => {
    fetchMessages();
    fetchStats();
  }, [fetchMessages, fetchStats]);

  const handleCloseAccountModal = useCallback(() => {
    setIsAccountModalOpen(false);
  }, []);

  const handleAccountSaved = useCallback(() => {
    fetchAccounts();
    fetchStats();
  }, [fetchAccounts, fetchStats]);

  const handleOpenNewTemplate = useCallback(() => {
    setSelectedTemplateForEdit(null);
    setIsTemplateModalOpen(true);
  }, []);

  const handleEditTemplate = useCallback((tpl: QuoteTemplateDto) => {
    setSelectedTemplateForEdit(tpl);
    setIsTemplateModalOpen(true);
  }, []);

  const handleDeleteTemplate = useCallback(
    async (tpl: QuoteTemplateDto) => {
      try {
        const res = await ApiClient.deleteQuoteTemplate(tpl.id, tenantId);
        if (res.success) {
          toast.success("Şablon silindi.");
          fetchTemplates();
        } else {
          toast.error(res.message || "Şablon silinemedi.");
        }
      } catch {
        toast.error("Şablon silinirken hata oluştu.");
      }
    },
    [tenantId, fetchTemplates]
  );

  const handleCloseTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(false);
  }, []);

  const handleTemplateSaved = useCallback(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <PageContainer className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
            E-posta Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground">
            Ortak gelen kutusu, hesap bağlama, şablonlu gönderim ve ileti
            dizileri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300"
            onClick={handleRefreshAll}
            title="Yenile"
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Yenile</span>
          </button>

          <PermissionGate permission="Emails.Send">
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white text-xs shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={handleOpenCompose}
              type="button"
            >
              <PenSquare className="h-4 w-4" />
              <span>E-posta Yaz</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <KpiCards isLoading={isLoadingStats} stats={stats} />

      {/* 5-Tab Navigation Header */}
      <EmailNavHeader
        accountsCount={accounts.length}
        activeTab={activeTab}
        onTabAccounts={handleTabAccounts}
        onTabDrafts={handleTabDrafts}
        onTabInbox={handleTabInbox}
        onTabSent={handleTabSent}
        onTabTemplates={handleTabTemplates}
        unreadCount={stats.unreadCount}
      />

      {/* FILTER BAR FOR MESSAGES */}
      <MessagesFilterBar
        accounts={accounts}
        activeTab={activeTab}
        isReadFilter={isReadFilter}
        onAccountFilterChange={handleAccountFilterChange}
        onReadFilterChange={handleReadFilterChange}
        onSearchChange={handleSearchChange}
        searchQuery={searchQuery}
        selectedAccountId={selectedAccountId}
        totalCount={totalCount}
      />

      {/* MESSAGES TABLE CONTAINER */}
      {activeTab === "inbox" ||
      activeTab === "sent" ||
      activeTab === "drafts" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
          <MessagesTableView
            accounts={accounts}
            activeTab={activeTab}
            isLoading={isLoadingMessages}
            messages={messages}
            onDelete={handleDeleteMessage}
            onEditDraft={activeTab === "drafts" ? handleEditDraft : undefined}
            onOpenNewAccount={handleOpenNewAccount}
            onOpenThread={handleOpenThread}
          />

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-border border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Sayfa {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Önceki sayfa"
                  className="rounded-lg border border-border p-1 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-400"
                  disabled={page <= 1}
                  onClick={handlePrevPage}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  aria-label="Sonraki sayfa"
                  className="rounded-lg border border-border p-1 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-400"
                  disabled={page >= totalPages}
                  onClick={handleNextPage}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* CONNECTED ACCOUNTS TAB */}
      {activeTab === "accounts" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Bağlı E-posta Hesapları
              </h2>
              <p className="text-xs text-muted-foreground">
                Gelen kutusu ve SMTP gönderimi için yapılandırılmış posta
                kutuları.
              </p>
            </div>

            <PermissionGate permission="Emails.ManageAccounts">
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                onClick={handleOpenNewAccount}
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Hesap Bağla</span>
              </button>
            </PermissionGate>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
            <AccountsTableView
              accounts={accounts}
              isLoading={isLoadingAccounts}
              onDeleteAccount={handleDeleteAccount}
              onEditAccount={handleEditAccount}
              onOpenNewAccount={handleOpenNewAccount}
              onTestAccount={handleTestAccount}
              onToggleAccount={handleToggleAccount}
            />
          </div>
        </div>
      ) : null}

      {/* TEMPLATES TAB */}
      {activeTab === "templates" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                E-posta ve Teklif Şablonları
              </h2>
              <p className="text-xs text-muted-foreground">
                Müşterilere gönderilen teklif ve bilgi maillerinde kullanılan
                dinamik Handlebars şablonları.
              </p>
            </div>

            <PermissionGate permission="Emails.ManageAccounts">
              <button
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-medium text-white text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                onClick={handleOpenNewTemplate}
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Şablon Ekle</span>
              </button>
            </PermissionGate>
          </div>

          <TemplatesGridView
            isLoading={isLoadingTemplates}
            onCompose={handleComposeWithTemplate}
            onDelete={handleDeleteTemplate}
            onEdit={handleEditTemplate}
            onPreview={handlePreviewTemplate}
            templates={templates}
          />

          {/* Template preview modal */}
          <TemplatePreviewModal
            onClose={handleClosePreview}
            template={previewTemplate}
          />
        </div>
      ) : null}

      {/* DRAWERS & MODALS */}
      <EmailThreadDrawer
        isOpen={isThreadDrawerOpen}
        onClose={handleCloseThreadDrawer}
        onReply={handleReplyFromThread}
        onStatusChange={handleThreadStatusChange}
        tenantId={tenantId}
        threadId={activeThreadId}
      />

      <ComposeModal
        accounts={accounts}
        isOpen={isComposeOpen}
        onClose={handleCloseCompose}
        onSent={handleComposeSent}
        prefill={composePrefill}
        tenantId={tenantId}
      />

      <EmailAccountModal
        account={selectedAccountForEdit}
        isOpen={isAccountModalOpen}
        onClose={handleCloseAccountModal}
        onSaved={handleAccountSaved}
        tenantId={tenantId}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={handleCloseTemplateModal}
        onSaved={handleTemplateSaved}
        template={selectedTemplateForEdit}
        tenantId={tenantId}
      />
    </PageContainer>
  );
}
