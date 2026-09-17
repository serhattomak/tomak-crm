"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Input } from "@workspace/ui/components/input";
import {
  Check,
  Clock,
  Edit2,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Pin,
  PinOff,
  Plus,
  Receipt,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useMemo, useState } from "react";
import type {
  CustomerDetailDto,
  CustomerNoteDto,
  DealSummaryDto,
  OrderListDto,
  QuoteSummaryDto,
  TicketListDto,
} from "@/lib/api-client";

export type CustomerTab =
  | "overview"
  | "deals"
  | "quotes"
  | "orders"
  | "tickets"
  | "contacts"
  | "timeline"
  | "notes"
  | "finance";

interface CustomerTabsContentProps {
  activeTab: CustomerTab;
  customer: CustomerDetailDto;
  deals: DealSummaryDto[];
  onAddNote: (content: string, isPinned: boolean) => Promise<void>;
  onDeleteContact: (contactId: string) => void;
  onOpenAddActivity: (type?: string) => void;
  onOpenAddContact: () => void;
  onSaveEditNote: (noteId: string, content: string) => void;
  onTogglePinNote: (note: CustomerNoteDto) => void;
  orders: OrderListDto[];
  quotes: QuoteSummaryDto[];
  setActiveTab: (tab: CustomerTab) => void;
  submittingNote: boolean;
  tenantSlug: string;
  tickets: TicketListDto[];
}

export function CustomerTabsContent({
  customer,
  deals,
  quotes,
  orders,
  tickets,
  tenantSlug,
  activeTab,
  setActiveTab,
  onOpenAddContact,
  onOpenAddActivity,
  onDeleteContact,
  onAddNote,
  onTogglePinNote,
  onSaveEditNote,
  submittingNote,
}: CustomerTabsContentProps) {
  // Activity filter & search state
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("All");
  const [activitySearch, setActivitySearch] = useState<string>("");

  // Quick note inline form state
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [quickNotePinned, setQuickNotePinned] = useState(false);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const sortedNotes = useMemo(
    () =>
      [...customer.notes].sort((a, b) => {
        if (a.isPinned && !b.isPinned) {
          return -1;
        }
        if (!a.isPinned && b.isPinned) {
          return 1;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }),
    [customer.notes]
  );

  const totalOrdersAmount = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
    [orders]
  );

  const totalPaidAmount = useMemo(
    () =>
      orders
        .filter((o) => o.paymentStatus === "Paid")
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
    [orders]
  );

  const totalPendingAmount = Math.max(0, totalOrdersAmount - totalPaidAmount);

  const tabs: { id: CustomerTab; label: string; count?: number }[] = [
    { id: "overview", label: "Genel Bakış" },
    { count: deals.length, id: "deals", label: "Fırsatlar" },
    { count: quotes.length, id: "quotes", label: "Teklifler" },
    { count: orders.length, id: "orders", label: "Siparişler" },
    { count: tickets.length, id: "tickets", label: "Destek" },
    { count: customer.contacts.length, id: "contacts", label: "Yetkililer" },
    {
      count: customer.activities.length,
      id: "timeline",
      label: "Aktivite",
    },
    { count: customer.notes.length, id: "notes", label: "Notlar" },
    { id: "finance", label: "Finans" },
  ];

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteContent.trim()) {
      return;
    }
    await onAddNote(quickNoteContent, quickNotePinned);
    setQuickNoteContent("");
    setQuickNotePinned(false);
  };

  const handleSaveEdit = (noteId: string) => {
    if (!editingNoteContent.trim()) {
      return;
    }
    onSaveEditNote(noteId, editingNoteContent);
    setEditingNoteId(null);
    setEditingNoteContent("");
  };

  const activityFilterTabs = [
    { count: customer.activities.length, key: "All", label: "Tümü" },
    {
      count: customer.activities.filter((a) => a.activityType === "Call")
        .length,
      key: "Call",
      label: "Aramalar",
    },
    {
      count: customer.activities.filter((a) => a.activityType === "Meeting")
        .length,
      key: "Meeting",
      label: "Toplantılar",
    },
    {
      count: customer.activities.filter((a) => a.activityType === "Email")
        .length,
      key: "Email",
      label: "E-Postalar",
    },
    {
      count: customer.activities.filter((a) => a.activityType === "Note")
        .length,
      key: "Note",
      label: "Notlar",
    },
  ];

  const filteredActivities = customer.activities.filter((act) => {
    if (
      activityTypeFilter !== "All" &&
      act.activityType !== activityTypeFilter
    ) {
      return false;
    }
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchDesc = act.description?.toLowerCase().includes(q);
      if (!(matchTitle || matchDesc)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Modern Pill/Segmented Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border/80 bg-muted/40 p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-xs transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 font-semibold text-3xs ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-3.5">
                <div className="font-medium text-2xs text-muted-foreground">
                  Toplam Ciro
                </div>
                <div className="mt-1 font-bold text-base text-foreground tracking-tight sm:text-lg">
                  ₺
                  {(customer.totalRevenue || totalOrdersAmount).toLocaleString(
                    "tr-TR"
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5">
                <div className="font-medium text-2xs text-muted-foreground">
                  Fırsatlar
                </div>
                <div className="mt-1 font-bold text-base text-foreground tracking-tight sm:text-lg">
                  {deals.length} Adet
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5">
                <div className="font-medium text-2xs text-muted-foreground">
                  Teklifler
                </div>
                <div className="mt-1 font-bold text-base text-foreground tracking-tight sm:text-lg">
                  {quotes.length} Adet
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5">
                <div className="font-medium text-2xs text-muted-foreground">
                  Destek Talepleri
                </div>
                <div className="mt-1 font-bold text-base text-foreground tracking-tight sm:text-lg">
                  {tickets.length} Talep
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities Snapshot */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2.5">
              <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Son Müşteri Aktiviteleri
              </CardTitle>
              <Button
                className="h-7 text-primary text-xs"
                onClick={() => setActiveTab("timeline")}
                size="sm"
                variant="ghost"
              >
                Tümünü Gör →
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {customer.activities.length === 0 ? (
                <EmptyState
                  title="Aktivite Bulunmuyor"
                  description="Henüz müşteriye ait etkileşim kaydı girilmedi."
                  icon={Clock}
                  action={
                    <Button onClick={() => onOpenAddActivity("Call")} size="sm">
                      İlk Aktiviteyi Kaydet
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {customer.activities.slice(0, 4).map((act) => (
                    <div
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs"
                      key={act.id}
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {act.title}
                        </span>
                      </div>
                      <span className="text-3xs text-muted-foreground">
                        {new Date(act.performedAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: DEALS */}
      {activeTab === "deals" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Müşteri Satış Fırsatları & Huniler
            </h4>
            <Button asChild className="h-8 gap-1 text-xs" size="sm">
              <Link href={`/${tenantSlug}/pipelines?create=true`}>
                <Plus className="h-3.5 w-3.5" />
                <span>Yeni Fırsat</span>
              </Link>
            </Button>
          </div>

          {deals.length === 0 ? (
            <EmptyState
              description="Bu müşteriye ait açık veya sonuçlanmış bir satış fırsatı bulunmuyor."
              icon={TrendingUp}
              title="Fırsat Bulunamadı"
            />
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <Card
                  className="transition-all hover:border-border"
                  key={deal.id}
                >
                  <CardContent className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">
                          {deal.title}
                        </span>
                        <Badge size="sm" variant="secondary">
                          {deal.stageName}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-2xs text-muted-foreground">
                        <span>
                          Sorumlu: {deal.assignedUserName || "Atanmadı"}
                        </span>
                        <span>Durum: {deal.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right font-bold text-foreground text-sm">
                        ₺{(deal.value || 0).toLocaleString("tr-TR")}
                      </div>
                      <Button
                        asChild
                        className="h-7 gap-1 text-xs"
                        size="sm"
                        variant="outline"
                      >
                        <Link
                          href={`/${tenantSlug}/pipelines?dealId=${deal.id}`}
                        >
                          <span>İncele</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUOTES */}
      {activeTab === "quotes" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Müşteri Teklif Geçmişi
            </h4>
            <Button asChild className="h-8 gap-1 text-xs" size="sm">
              <Link href={`/${tenantSlug}/quotes`}>
                <Plus className="h-3.5 w-3.5" />
                <span>Teklif Hazırla</span>
              </Link>
            </Button>
          </div>

          {quotes.length === 0 ? (
            <EmptyState
              description="Bu müşteriye henüz bir teklif taslağı veya teklif iletilmedi."
              icon={FileText}
              title="Teklif Bulunamadı"
            />
          ) : (
            <div className="space-y-2">
              {quotes.map((quote) => (
                <Card
                  className="transition-all hover:border-border"
                  key={quote.id}
                >
                  <CardContent className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">
                          {quote.quoteNumber} - {quote.title}
                        </span>
                        <Badge size="sm" variant="accent">
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-2xs text-muted-foreground">
                        <span>Revizyon: v{quote.revisionNumber}</span>
                        <span>
                          Tarih:{" "}
                          {new Date(quote.createdAt).toLocaleDateString(
                            "tr-TR"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right font-bold text-foreground text-sm">
                        ₺{(quote.totalAmount || 0).toLocaleString("tr-TR")}
                      </div>
                      <Button
                        asChild
                        className="h-7 gap-1 text-xs"
                        size="sm"
                        variant="outline"
                      >
                        <Link href={`/${tenantSlug}/quotes`}>
                          <span>Görüntüle</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Müşteri Siparişleri & Satışlar
            </h4>
            <Button asChild className="h-8 gap-1 text-xs" size="sm">
              <Link href={`/${tenantSlug}/orders`}>
                <Plus className="h-3.5 w-3.5" />
                <span>Yeni Sipariş</span>
              </Link>
            </Button>
          </div>

          {orders.length === 0 ? (
            <EmptyState
              description="Bu müşteriye ait kayıtlı sipariş veya fatura bulunmuyor."
              icon={Receipt}
              title="Sipariş Bulunamadı"
            />
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <Card
                  className="transition-all hover:border-border"
                  key={order.id}
                >
                  <CardContent className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">
                          {order.orderNumber}
                        </span>
                        <Badge size="sm" variant="secondary">
                          {order.status}
                        </Badge>
                        <Badge
                          size="sm"
                          variant={
                            order.paymentStatus === "Paid"
                              ? "success"
                              : "warning"
                          }
                        >
                          {order.paymentStatus === "Paid"
                            ? "Ödendi"
                            : "Beklemede"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-2xs text-muted-foreground">
                        <span>{order.itemsCount} Kalem Ürün</span>
                        <span>
                          Tarih:{" "}
                          {new Date(order.createdAt).toLocaleDateString(
                            "tr-TR"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right font-bold text-foreground text-sm">
                        ₺{(order.totalAmount || 0).toLocaleString("tr-TR")}
                      </div>
                      <Button
                        asChild
                        className="h-7 gap-1 text-xs"
                        size="sm"
                        variant="outline"
                      >
                        <Link href={`/${tenantSlug}/orders/${order.id}`}>
                          <span>Detay</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TICKETS */}
      {activeTab === "tickets" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Destek & Helpdesk Talepleri
            </h4>
            <Button asChild className="h-8 gap-1 text-xs" size="sm">
              <Link href={`/${tenantSlug}/tickets`}>
                <Plus className="h-3.5 w-3.5" />
                <span>Destek Talebi Aç</span>
              </Link>
            </Button>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              description="Bu müşteriye ait açık veya çözülmüş destek bileti bulunmuyor."
              icon={MessageSquare}
              title="Destek Talebi Bulunamadı"
            />
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <Card
                  className="transition-all hover:border-border"
                  key={ticket.id}
                >
                  <CardContent className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">
                          {ticket.ticketNumber}: {ticket.subject}
                        </span>
                        <Badge
                          size="sm"
                          variant={
                            ticket.priority === "Urgent"
                              ? "destructive"
                              : ticket.priority === "High"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {ticket.priority}
                        </Badge>
                        <Badge size="sm" variant="neutral">
                          {ticket.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-2xs text-muted-foreground">
                        <span>Kategori: {ticket.category}</span>
                        <span>Mesaj: {ticket.messageCount}</span>
                        {ticket.isSlaBreached && (
                          <span className="font-bold text-destructive">
                            SLA İhlali
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <Button
                        asChild
                        className="h-7 gap-1 text-xs"
                        size="sm"
                        variant="outline"
                      >
                        <Link href={`/${tenantSlug}/tickets/${ticket.id}`}>
                          <span>Talep Detayı</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CONTACTS */}
      {activeTab === "contacts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Kayıtlı Şirket Yetkilileri
            </h4>
            <Button
              className="h-8 gap-1 text-xs"
              onClick={onOpenAddContact}
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yetkili Ekle</span>
            </Button>
          </div>

          {customer.contacts.length === 0 ? (
            <EmptyState
              title="Yetkili Kişi Kaydedilmedi"
              description="Bu şirket için irtibat kurulabilecek bir yetkili henüz eklenmemiş."
              icon={Phone}
              action={
                <Button onClick={onOpenAddContact} size="sm">
                  Yetkili Ekle
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customer.contacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="flex h-full flex-col justify-between p-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-foreground text-xs">
                            {contact.fullName}
                          </div>
                          <div className="text-2xs text-muted-foreground">
                            {contact.title || "Yetkili"}
                          </div>
                        </div>
                        {contact.isPrimary && (
                          <Badge size="sm" variant="accent">
                            Birincil
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-muted-foreground text-xs">
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end border-border/60 border-t pt-2.5">
                      <Button
                        className="h-7 text-2xs text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteContact(contact.id)}
                        size="sm"
                        variant="ghost"
                      >
                        Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: TIMELINE & TOUCHPOINTS */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {/* Timeline Filter & Search Bar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border/80 bg-muted/40 p-1">
              {activityFilterTabs.map((tab) => {
                const isSelected = activityTypeFilter === tab.key;
                return (
                  <button
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 font-medium text-xs transition-all ${
                      isSelected
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    key={tab.key}
                    onClick={() => setActivityTypeFilter(tab.key)}
                    type="button"
                  >
                    <span>{tab.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-3xs text-muted-foreground">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-full sm:w-56">
              <Input
                leftIcon={<Search className="h-3.5 w-3.5" />}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Aktivitelerde ara..."
                value={activitySearch}
              />
            </div>
          </div>

          {/* Connected Vertical Timeline */}
          {filteredActivities.length === 0 ? (
            <EmptyState
              action={
                <Button onClick={() => onOpenAddActivity("Call")} size="sm">
                  İlk Aktiviteyi Kaydet
                </Button>
              }
              description={
                activitySearch || activityTypeFilter !== "All"
                  ? "Arama veya filtre kriterlerinize uygun aktivite kaydı bulunamadı."
                  : "Bu müşteriye ait henüz bir etkileşim kaydı girilmedi."
              }
              icon={MessageSquare}
              title="Aktivite Bulunamadı"
            />
          ) : (
            <div className="relative pl-6 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-0.5 before:bg-border">
              <div className="space-y-4">
                {filteredActivities.map((activity) => {
                  const isCall = activity.activityType === "Call";
                  const isMeeting = activity.activityType === "Meeting";
                  const isEmail = activity.activityType === "Email";
                  const isNote = activity.activityType === "Note";

                  const badgeVariant:
                    | "success"
                    | "accent"
                    | "secondary"
                    | "warning" = isCall
                    ? "success"
                    : isMeeting
                      ? "secondary"
                      : isEmail
                        ? "accent"
                        : "warning";

                  const badgeLabel = isCall
                    ? "Telefon Araması"
                    : isMeeting
                      ? "Toplantı"
                      : isEmail
                        ? "E-Posta"
                        : isNote
                          ? "Not"
                          : activity.activityType || "Sistem";

                  const dateObj = new Date(activity.performedAt);
                  const isToday =
                    new Date().toDateString() === dateObj.toDateString();

                  return (
                    <div
                      className="relative flex items-start gap-3"
                      key={activity.id}
                    >
                      {/* Timeline Node Icon */}
                      <div className="relative -left-6 z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs ring-4 ring-background">
                        {isCall ? (
                          <PhoneCall className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                        ) : isMeeting ? (
                          <Video className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        ) : isEmail ? (
                          <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        ) : isNote ? (
                          <FileText className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Timeline Content Card */}
                      <Card className="-ml-3 flex-1 transition-all hover:border-border">
                        <CardContent className="p-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge size="sm" variant={badgeVariant}>
                                {badgeLabel}
                              </Badge>
                              <h5 className="font-semibold text-foreground text-xs">
                                {activity.title}
                              </h5>
                            </div>

                            <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {isToday
                                  ? `Bugün ${dateObj.toLocaleTimeString(
                                      "tr-TR",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}`
                                  : dateObj.toLocaleString("tr-TR", {
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                              </span>
                            </div>
                          </div>

                          {activity.description && (
                            <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                              {activity.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: NOTES */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {/* Add Note Card */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Özel Müşteri Notu Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleNoteSubmit}>
                <textarea
                  className="w-full rounded-md border border-input bg-background p-2.5 text-foreground text-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(e) => setQuickNoteContent(e.target.value)}
                  placeholder="Müşteri hakkında dahili ekip notlarınızı buraya yazın..."
                  rows={3}
                  value={quickNoteContent}
                />
                <div className="mt-2.5 flex items-center justify-between">
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-muted-foreground text-xs">
                    <input
                      checked={quickNotePinned}
                      className="rounded border-border text-primary focus:ring-primary"
                      onChange={(e) => setQuickNotePinned(e.target.checked)}
                      type="checkbox"
                    />
                    <Pin className="h-3 w-3 text-amber-500" />
                    <span>Üste İğnele</span>
                  </label>

                  <Button
                    className="h-8 gap-1 text-xs"
                    disabled={!quickNoteContent.trim() || submittingNote}
                    size="sm"
                    type="submit"
                  >
                    <Send className="h-3 w-3" />
                    <span>
                      {submittingNote ? "Kaydediliyor..." : "Notu Kaydet"}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notes List with Pin Highlight & In-Place Editing */}
          {customer.notes.length === 0 ? (
            <EmptyState
              description="Bu müşteri için henüz bir dahili not eklenmedi."
              icon={FileText}
              title="Not Bulunmuyor"
            />
          ) : (
            <div className="space-y-2">
              {sortedNotes.map((note) => (
                <Card
                  className={`transition-all ${
                    note.isPinned
                      ? "border-amber-500/30 bg-amber-500/5 shadow-2xs"
                      : ""
                  }`}
                  key={note.id}
                >
                  <CardContent className="p-3.5">
                    <div className="mb-2 flex items-center justify-between text-2xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {note.isPinned && (
                          <Badge className="gap-1" size="sm" variant="warning">
                            <Pin className="h-2.5 w-2.5" />
                            <span>İğneli Not</span>
                          </Badge>
                        )}
                        <span className="font-medium">
                          {new Date(note.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => onTogglePinNote(note)}
                          size="icon"
                          title={
                            note.isPinned ? "İğneyi Kaldır" : "Üste İğnele"
                          }
                          variant="ghost"
                        >
                          {note.isPinned ? (
                            <PinOff className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                          ) : (
                            <Pin className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Button
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingNoteContent(note.content);
                          }}
                          size="icon"
                          title="Notu Düzenle"
                          variant="ghost"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <textarea
                          autoFocus
                          className="w-full rounded-md border border-input bg-background p-2.5 text-foreground text-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          onChange={(e) =>
                            setEditingNoteContent(e.target.value)
                          }
                          rows={3}
                          value={editingNoteContent}
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            className="h-7 text-xs"
                            onClick={() => setEditingNoteId(null)}
                            size="sm"
                            variant="ghost"
                          >
                            İptal
                          </Button>
                          <Button
                            className="h-7 gap-1 text-xs"
                            onClick={() => handleSaveEdit(note.id)}
                            size="sm"
                          >
                            <Check className="h-3 w-3" />
                            <span>Kaydet</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-foreground text-xs leading-relaxed">
                        {note.content}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 9: FINANCE */}
      {activeTab === "finance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2.5">
              <CardTitle className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Müşteri Finansal Özeti & Bakiye
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5">
                  <span className="font-medium text-2xs text-muted-foreground">
                    Toplam Sipariş Tutarı
                  </span>
                  <div className="mt-1 font-bold text-base text-foreground tracking-tight sm:text-lg">
                    ₺
                    {totalOrdersAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5">
                  <span className="font-medium text-2xs text-muted-foreground">
                    Tahsil Edilen (Ödenen)
                  </span>
                  <div className="mt-1 font-bold text-base text-emerald-700 dark:text-emerald-300 tracking-tight sm:text-lg">
                    ₺
                    {totalPaidAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5">
                  <span className="font-medium text-2xs text-muted-foreground">
                    Bekleyen Bakiye
                  </span>
                  <div
                    className={`mt-1 font-bold text-base tracking-tight sm:text-lg ${
                      totalPendingAmount > 0
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-foreground"
                    }`}
                  >
                    ₺
                    {totalPendingAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              {/* Billing & Tax details snippet */}
              <div className="grid grid-cols-1 gap-3 border-border/60 border-t pt-2 sm:grid-cols-2">
                <div className="space-y-1 text-xs">
                  <span className="font-medium text-muted-foreground">
                    Vergi Numarası & Dairesi:
                  </span>
                  <p className="font-semibold text-foreground">
                    {customer.taxNumber
                      ? `${customer.taxNumber} (${customer.taxOffice || "Vergi Dairesi Yok"})`
                      : "Kayıtlı vergi bilgisi yok"}
                  </p>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-medium text-muted-foreground">
                    Fatura Adresi:
                  </span>
                  <p className="text-foreground">
                    {customer.addressLine
                      ? `${customer.addressLine}, ${customer.city || ""}`
                      : "Fatura adresi belirtilmemiş"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
