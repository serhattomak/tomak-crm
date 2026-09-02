"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
  Loader2,
  Ticket,
  X,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type CreateTicketPayload,
  type CustomerListDto,
  type DepartmentDto,
  type EmailMessageDto,
  type TenantUserDto,
} from "@/lib/api-client";

export interface ConvertToTicketModalProps {
  isOpen: boolean;
  message: EmailMessageDto | null;
  onClose: () => void;
  onSuccess?: (ticketId: string, ticketNumber: string) => void;
  tenantSlug: string;
}

interface ParsedSender {
  email: string;
  name: string;
}

const SENDER_REGEX = /^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/;

function parseSender(fromAddress: string): ParsedSender {
  const clean = fromAddress.trim();
  const match = clean.match(SENDER_REGEX);
  const name = match?.[1]?.trim() || match?.[2]?.trim() || clean;
  const email = match?.[2]?.trim() || clean;
  return { email, name };
}

function buildTicketPayload(
  message: EmailMessageDto,
  customerId: string,
  fields: {
    category: string;
    customerEmail: string;
    customerName: string;
    description: string;
    priority: string;
    selectedDepartmentId: string;
    selectedUserId: string;
    subject: string;
  },
  user?: TenantUserDto,
  dept?: DepartmentDto
): CreateTicketPayload {
  return {
    assignedUserId: fields.selectedUserId || undefined,
    assignedUserName: user ? user.fullName || user.email : undefined,
    category: fields.category,
    customerEmail: fields.customerEmail || undefined,
    customerId,
    customerName: fields.customerName,
    departmentId: fields.selectedDepartmentId || undefined,
    departmentName: dept?.name,
    description: fields.description.trim() || undefined,
    linkedEntityId: message.id,
    linkedEntityTitle: message.subject,
    linkedEntityType: "Email",
    priority: fields.priority,
    source: "Email",
    subject: fields.subject.trim(),
  };
}

export function ConvertToTicketModal({
  isOpen,
  message,
  onClose,
  onSuccess,
  tenantSlug,
}: ConvertToTicketModalProps): React.ReactElement | null {
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [existingCustomerId, setExistingCustomerId] = useState<string>("");

  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<string>("Medium");
  const [category, setCategory] = useState<string>("Destek");

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [users, setUsers] = useState<TenantUserDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdTicket, setCreatedTicket] = useState<{
    id: string;
    ticketNumber: string;
  } | null>(null);

  const handleCustomerNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomerName(e.target.value);
    },
    []
  );

  const handleSubjectChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubject(e.target.value);
    },
    []
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
    },
    []
  );

  const applyMeta = useCallback(
    (
      custItems?: CustomerListDto[],
      deptItems?: DepartmentDto[],
      userItems?: TenantUserDto[]
    ) => {
      if (custItems && custItems.length > 0) {
        const [matchCust] = custItems;
        if (matchCust) {
          setExistingCustomerId(matchCust.id);
          setCustomerName(matchCust.name);
        }
      }
      if (deptItems) {
        setDepartments(deptItems);
      }
      if (userItems) {
        setUsers(userItems);
      }
    },
    []
  );

  useEffect(() => {
    if (!(isOpen && message)) {
      return;
    }

    const parsed = parseSender(message.fromAddress);
    setCustomerName(parsed.name);
    setCustomerEmail(parsed.email);
    setSubject(message.subject || "E-posta Destek Talebi");
    setDescription(message.textBody || "");
    setPriority("Medium");
    setCategory("Destek");
    setCreatedTicket(null);

    let isMounted = true;
    setIsLoadingMeta(true);

    Promise.all([
      ApiClient.getCustomers(tenantSlug, { search: parsed.email }),
      ApiClient.getDepartments(tenantSlug),
      ApiClient.getTenantUsers(tenantSlug),
    ])
      .then(([custRes, deptRes, userRes]) => {
        if (!isMounted) {
          return;
        }
        applyMeta(
          custRes.success ? custRes.data?.items : undefined,
          deptRes.success ? deptRes.data : undefined,
          userRes.success ? userRes.data : undefined
        );
      })
      .catch((err) => {
        console.error("Meta loading error:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingMeta(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, message, tenantSlug, applyMeta]);

  const resolveCustomerId = useCallback(async (): Promise<string | null> => {
    if (existingCustomerId) {
      return existingCustomerId;
    }

    const createCustRes = await ApiClient.createCustomer(
      {
        email: customerEmail.trim() || undefined,
        name: customerName.trim() || "Bilinmeyen Müşteri",
        status: "Active",
        tier: "Standard",
        type: "Individual",
      },
      tenantSlug
    );

    if (!(createCustRes.success && createCustRes.data)) {
      toast.error(createCustRes.message || "Müşteri kartı oluşturulamadı.");
      return null;
    }

    return createCustRes.data;
  }, [existingCustomerId, customerEmail, customerName, tenantSlug]);

  const handleSubmit = useCallback(async () => {
    if (!message) {
      return;
    }

    if (!subject.trim()) {
      toast.error("Lütfen talep konusunu girin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCustomerId = await resolveCustomerId();
      if (!finalCustomerId) {
        setIsSubmitting(false);
        return;
      }

      const assignedUser = users.find((u) => u.id === selectedUserId);
      const department = departments.find((d) => d.id === selectedDepartmentId);
      const payload = buildTicketPayload(
        message,
        finalCustomerId,
        {
          category,
          customerEmail,
          customerName,
          description,
          priority,
          selectedDepartmentId,
          selectedUserId,
          subject,
        },
        assignedUser,
        department
      );

      const ticketRes = await ApiClient.createTicket(payload, tenantSlug);

      if (ticketRes.success && ticketRes.data) {
        const ticketData = {
          id: ticketRes.data.id,
          ticketNumber: ticketRes.data.ticketNumber,
        };
        setCreatedTicket(ticketData);
        toast.success(
          `Destek talebi #${ticketRes.data.ticketNumber} başarıyla oluşturuldu!`
        );
        onSuccess?.(ticketData.id, ticketData.ticketNumber);
      } else {
        toast.error(ticketRes.message || "Destek talebi oluşturulamadı.");
      }
    } catch {
      toast.error("Destek talebi oluşturulurken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    message,
    subject,
    resolveCustomerId,
    selectedUserId,
    users,
    selectedDepartmentId,
    departments,
    category,
    customerEmail,
    customerName,
    description,
    priority,
    tenantSlug,
    onSuccess,
  ]);

  if (!(isOpen && message)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        aria-label="Kapat"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        type="button"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-zinc-100 border-b bg-zinc-50/75 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                E-postadan Destek Talebi Aç
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gelen e-postayı müşteri yardım biletine dönüştürün
              </p>
            </div>
          </div>
          <button
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="custom-scrollbar max-h-[72vh] space-y-3.5 p-5">
          {isLoadingMeta ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Müşteri ve departman bilgileri kontrol ediliyor...
            </div>
          ) : null}

          {createdTicket ? (
            <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900 text-sm dark:text-emerald-200">
                  Destek Talebi Açıldı! (#{createdTicket.ticketNumber})
                </h3>
                <p className="mt-1 text-emerald-700 text-xs dark:text-emerald-300">
                  Talep başarıyla oluşturuldu ve destek paneline aktarıldı.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 font-medium text-white text-xs shadow-sm hover:bg-purple-700"
                  href={`/${tenantSlug}/tickets/${createdTicket.id}`}
                  onClick={onClose}
                >
                  <span>Talebe Git</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Button onClick={onClose} size="sm" variant="outline">
                  Kapat
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Customer Box */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Label className="font-medium text-xs">
                  Talep Eden Müşteri
                </Label>
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    className="h-8 font-medium text-xs"
                    onChange={handleCustomerNameChange}
                    placeholder="Müşteri Adı"
                    value={customerName}
                  />
                  <Input
                    className="h-8 text-xs text-zinc-500"
                    disabled
                    value={customerEmail}
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <Label className="font-medium text-xs">Talep Konusu *</Label>
                <Input
                  className="h-9 font-medium text-xs"
                  onChange={handleSubjectChange}
                  placeholder="Sorun veya talep özeti"
                  value={subject}
                />
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-medium text-xs">Öncelik</Label>
                  <Select onValueChange={setPriority} value={priority}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Öncelik" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Düşük</SelectItem>
                      <SelectItem value="Medium">Orta</SelectItem>
                      <SelectItem value="High">Yüksek</SelectItem>
                      <SelectItem value="Urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-medium text-xs">Kategori</Label>
                  <Select onValueChange={setCategory} value={category}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Destek">Destek</SelectItem>
                      <SelectItem value="Teknik">Teknik</SelectItem>
                      <SelectItem value="Satış">Satış</SelectItem>
                      <SelectItem value="Faturalama">Faturalama</SelectItem>
                      <SelectItem value="Genel">Genel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Department & Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-medium text-xs">Departman</Label>
                  <Select
                    onValueChange={setSelectedDepartmentId}
                    value={selectedDepartmentId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Departman seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-medium text-xs">Temsilci Ata</Label>
                  <Select
                    onValueChange={setSelectedUserId}
                    value={selectedUserId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Atanmamış" />
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
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label className="font-medium text-xs">
                  Açıklama / İlk Mesaj
                </Label>
                <Textarea
                  className="h-24 text-xs"
                  onChange={handleDescriptionChange}
                  placeholder="Talebin detayları..."
                  value={description}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {createdTicket ? null : (
          <div className="flex items-center justify-end gap-2.5 border-zinc-100 border-t bg-zinc-50/75 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <button
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 font-medium text-white text-xs shadow-sm hover:bg-purple-700 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-500"
              disabled={isSubmitting || !subject.trim()}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Ticket className="h-3.5 w-3.5" />
                  <span>Talebi Oluştur</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
