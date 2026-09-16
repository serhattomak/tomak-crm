"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { toast } from "@workspace/ui/components/sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  User,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type CustomerListDto,
  type WhatsAppMessageDto,
} from "@/lib/api-client";

interface WhatsAppChatDrawerProps {
  activeTenantId?: string;
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
}

export function WhatsAppChatDrawer({
  isOpen,
  onClose,
  tenantSlug,
  activeTenantId,
}: WhatsAppChatDrawerProps) {
  const [messages, setMessages] = useState<WhatsAppMessageDto[]>([]);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerListDto | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.getWhatsAppMessages({}, tenantSlug);
      if (res.data?.items) {
        setMessages(res.data.items);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug]);

  const loadCustomers = useCallback(async () => {
    if (!activeTenantId) return;
    try {
      const res = await ApiClient.getCustomers(activeTenantId, {
        page: 1,
        pageSize: 50,
      });
      if (res.data?.items) {
        setCustomers(res.data.items.filter((c) => !!c.phone));
      }
    } catch {
      // ignore
    }
  }, [activeTenantId]);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      loadCustomers();
    }
  }, [isOpen, loadMessages, loadCustomers]);

  // Group messages by phone number
  const conversations = Array.from(
    new Set(messages.map((m) => m.phoneNumber))
  ).map((phone) => {
    const phoneMsgs = messages.filter((m) => m.phoneNumber === phone);
    const lastMsg = phoneMsgs[0]; // descending
    const cust = customers.find(
      (c) => c.phone?.replace(/\D/g, "") === phone.replace(/\D/g, "")
    );
    return {
      customer: cust,
      lastMsg,
      phone,
      title: cust?.name || lastMsg?.customerName || phone,
    };
  });

  const activeMessages = selectedPhone
    ? messages.filter((m) => m.phoneNumber === selectedPhone)
    : [];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone.trim() || !inputText.trim()) return;

    setIsSending(true);
    try {
      const res = await ApiClient.sendWhatsAppMessage(
        {
          customerId: selectedCustomer?.id,
          messageText: inputText.trim(),
          phoneNumber: selectedPhone,
        },
        tenantSlug
      );

      if (res.data || res.success) {
        toast.success("WhatsApp mesajı iletildi.");
        setInputText("");
        loadMessages();
      } else {
        toast.error(res.message || "Mesaj gönderilemedi.");
      }
    } catch {
      toast.error("Hata oluştu.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

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
        className="data-[side=right]:w-full max-w-4xl data-[side=right]:sm:max-w-4xl flex-row"
        showCloseButton={false}
        side="right"
      >
        {/* Left Column: WhatsApp Conversations */}
        <div className="flex w-80 flex-col border-border border-r">
          <div className="flex items-center justify-between border-border border-b p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                <MessageCircle className="h-4 w-4" />
              </div>
              <SheetTitle className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                WhatsApp Business
              </SheetTitle>
            </div>
            <button
              className="rounded-lg p-1 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => loadMessages()}
              title="Yenile"
              type="button"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="p-3">
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full rounded-xl border border-border bg-zinc-50 py-1.5 pr-3 pl-8 text-xs text-zinc-900 outline-hidden dark:bg-zinc-900 dark:text-zinc-100"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Numara veya kişi ara..."
                type="text"
                value={searchQuery}
              />
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Henüz kayıtlı WhatsApp mesajı yok.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedPhone === conv.phone;
                return (
                  <button
                    className={`flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/60"
                    }`}
                    key={conv.phone}
                    onClick={() => {
                      setSelectedPhone(conv.phone);
                      setSelectedCustomer(conv.customer || null);
                    }}
                    type="button"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 font-bold text-xs dark:bg-zinc-800">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-semibold text-xs">
                          {conv.title}
                        </span>
                        {conv.lastMsg && (
                          <span className="text-3xs text-muted-foreground">
                            {new Date(
                              conv.lastMsg.createdAt
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-3xs text-muted-foreground">
                        {conv.phone}
                      </p>
                      <p className="mt-0.5 truncate text-2xs text-muted-foreground">
                        {conv.lastMsg?.messageText || "—"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-border border-b px-6 py-3.5">
            <div>
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                {selectedPhone ? `+${selectedPhone}` : "Konuşma Seçin"}
              </h4>
              {selectedCustomer && (
                <p className="text-2xs text-emerald-700 dark:text-emerald-400">
                  Cari: {selectedCustomer.name}
                </p>
              )}
            </div>
            <SheetClose asChild>
              <button
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                type="button"
              >
                ✕
              </button>
            </SheetClose>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50/50 p-6 dark:bg-zinc-900/30">
            {!selectedPhone ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <MessageCircle className="mb-2 h-8 w-8 text-zinc-300" />
                Soldaki listeden bir konuşma seçin veya yeni mesaj başlatın.
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground">
                Bu numara ile henüz mesaj geçmişi bulunmuyor.
              </div>
            ) : (
              activeMessages.map((m) => {
                const isOutbound = m.direction === "Outbound";
                return (
                  <div
                    className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                    key={m.id}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-xs ${isOutbound ? "bg-emerald-700 text-white" : "border border-border bg-card text-zinc-900 dark:text-zinc-100"}`}
                    >
                      <p className="leading-relaxed">{m.messageText}</p>
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-3xs ${
                          isOutbound
                            ? "text-emerald-200"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isOutbound && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Box */}
          {selectedPhone && (
            <form
              className="border-border border-t p-4"
              onSubmit={handleSendMessage}
            >
              <div className="flex gap-2">
                <input
                  className="h-10 flex-1 rounded-xl border border-border bg-zinc-50 px-3 text-xs text-zinc-900 outline-hidden focus:border-emerald-500 focus:bg-white dark:bg-zinc-900 dark:text-zinc-100"
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="WhatsApp mesajınızı yazın..."
                  type="text"
                  value={inputText}
                />
                <Button
                  className="bg-emerald-700 text-white hover:bg-emerald-800"
                  disabled={isSending || !inputText.trim()}
                  type="submit"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
