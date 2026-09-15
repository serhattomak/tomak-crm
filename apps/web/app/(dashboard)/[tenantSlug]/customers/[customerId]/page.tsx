"use client";

import { PageContainer } from "@workspace/ui/components/page-container";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { CheckCircle2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type CustomerDetailDto,
  type CustomerNoteDto,
  type DealSummaryDto,
  type EmployeeDto,
  type OrderListDto,
  type QuoteSummaryDto,
  type TicketListDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";
import { AddActivityModal } from "./_components/add-activity-modal";
import { AddContactModal } from "./_components/add-contact-modal";
import { CustomerDetailHeader } from "./_components/customer-detail-header";
import { CustomerSidebarSummary } from "./_components/customer-sidebar-summary";
import {
  type CustomerTab,
  CustomerTabsContent,
} from "./_components/customer-tabs-content";
import { EditCustomerModal } from "./_components/edit-customer-modal";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const customerId = (params?.customerId as string) || "";
  const { activeTenant } = usePermissions();

  const [customer, setCustomer] = useState<CustomerDetailDto | null>(null);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [deals, setDeals] = useState<DealSummaryDto[]>([]);
  const [quotes, setQuotes] = useState<QuoteSummaryDto[]>([]);
  const [orders, setOrders] = useState<OrderListDto[]>([]);
  const [tickets, setTickets] = useState<TicketListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");

  // Modals
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [activityModalType, setActivityModalType] = useState<string>("Call");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittingNote, setSubmittingNote] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    if (!(activeTenant && customerId)) {
      return;
    }
    try {
      const [custRes, empRes, dealsRes, quotesRes, ordersRes, ticketsRes] =
        await Promise.allSettled([
          ApiClient.getCustomerById(customerId, activeTenant.id),
          ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
          ApiClient.getDeals({ customerId }, activeTenant.id),
          ApiClient.getQuotes({ customerId }, activeTenant.id),
          ApiClient.getOrders({ customerId }, activeTenant.id),
          ApiClient.getTickets({ customerId }, activeTenant.id),
        ]);

      if (
        custRes.status === "fulfilled" &&
        custRes.value.success &&
        custRes.value.data
      ) {
        setCustomer(custRes.value.data);
      } else {
        showToast("Müşteri bulunamadı.");
        router.push(`/${tenantSlug}/customers`);
      }

      if (
        empRes.status === "fulfilled" &&
        empRes.value.success &&
        empRes.value.data
      ) {
        setEmployees(empRes.value.data.items);
      }

      if (
        dealsRes.status === "fulfilled" &&
        dealsRes.value.success &&
        dealsRes.value.data?.items
      ) {
        setDeals(dealsRes.value.data.items);
      }

      if (
        quotesRes.status === "fulfilled" &&
        quotesRes.value.success &&
        quotesRes.value.data?.items
      ) {
        setQuotes(quotesRes.value.data.items);
      }

      if (
        ordersRes.status === "fulfilled" &&
        ordersRes.value.success &&
        ordersRes.value.data?.items
      ) {
        setOrders(ordersRes.value.data.items);
      }

      if (
        ticketsRes.status === "fulfilled" &&
        ticketsRes.value.success &&
        ticketsRes.value.data?.items
      ) {
        setTickets(ticketsRes.value.data.items);
      }
    } catch {
      showToast("Müşteri bilgileri yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, customerId, tenantSlug, router, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddNote = useCallback(
    async (content: string, isPinned: boolean) => {
      if (!(activeTenant && customer && content.trim())) {
        return;
      }
      setSubmittingNote(true);
      try {
        const res = await ApiClient.addCustomerNote(
          customer.id,
          { content: content.trim(), isPinned },
          activeTenant.id
        );
        if (res.success) {
          showToast("Not başarıyla eklendi.");
          loadData();
        }
      } catch {
        showToast("Not eklenirken hata oluştu.");
      } finally {
        setSubmittingNote(false);
      }
    },
    [activeTenant, customer, loadData, showToast]
  );

  const handleTogglePinNote = useCallback(
    (note: CustomerNoteDto) => {
      if (!customer) {
        return;
      }
      const updatedNotes = customer.notes.map((n) =>
        n.id === note.id ? { ...n, isPinned: !n.isPinned } : n
      );
      setCustomer({ ...customer, notes: updatedNotes });
      showToast(note.isPinned ? "İğne kaldırıldı." : "Not üste sabitlendi.");
    },
    [customer, showToast]
  );

  const handleSaveEditNote = useCallback(
    (noteId: string, content: string) => {
      if (!(customer && content.trim())) {
        return;
      }
      const updatedNotes = customer.notes.map((n) =>
        n.id === noteId ? { ...n, content: content.trim() } : n
      );
      setCustomer({ ...customer, notes: updatedNotes });
      showToast("Not güncellendi.");
    },
    [customer, showToast]
  );

  const handleDeleteContact = useCallback(
    async (contactId: string) => {
      if (!(activeTenant && customer)) {
        return;
      }
      if (!confirm("Bu yetkili kişiyi silmek istediğinize emin misiniz?")) {
        return;
      }

      try {
        const res = await ApiClient.deleteCustomerContact(
          customer.id,
          contactId,
          activeTenant.id
        );
        if (res.success) {
          showToast("Yetkili kişi silindi.");
          loadData();
        }
      } catch {
        showToast("Yetkili silinirken hata oluştu.");
      }
    },
    [activeTenant, customer, loadData, showToast]
  );

  const handleOpenActivityModal = useCallback((type?: string) => {
    setActivityModalType(type || "Call");
    setIsAddActivityModalOpen(true);
  }, []);

  if (loading) {
    return (
      <PageContainer className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <PageContainer className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fade-in fixed top-5 right-5 z-50 flex animate-in items-center gap-2 rounded-lg border border-border bg-popover px-4 py-2.5 text-popover-foreground text-xs shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <CustomerDetailHeader
        customer={customer}
        onOpenActivityModal={() => handleOpenActivityModal("Call")}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        tenantSlug={tenantSlug}
      />

      {/* 2. Main 360 View: Left Sidebar + Tabbed Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Contact info & Account Manager */}
        <div>
          <CustomerSidebarSummary customer={customer} />
        </div>

        {/* Right Column: Tabbed Content Canvas */}
        <div className="lg:col-span-2">
          <CustomerTabsContent
            activeTab={activeTab}
            customer={customer}
            deals={deals}
            onAddNote={handleAddNote}
            onDeleteContact={handleDeleteContact}
            onOpenAddActivity={handleOpenActivityModal}
            onOpenAddContact={() => setIsAddContactModalOpen(true)}
            onSaveEditNote={handleSaveEditNote}
            onTogglePinNote={handleTogglePinNote}
            orders={orders}
            quotes={quotes}
            setActiveTab={setActiveTab}
            submittingNote={submittingNote}
            tenantSlug={tenantSlug}
            tickets={tickets}
          />
        </div>
      </div>

      {/* Modals */}
      {isAddContactModalOpen && (
        <AddContactModal
          customerId={customer.id}
          isOpen={isAddContactModalOpen}
          onClose={() => setIsAddContactModalOpen(false)}
          onSuccess={() => {
            showToast("Yetkili kişi başarıyla eklendi.");
            setIsAddContactModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {isAddActivityModalOpen && (
        <AddActivityModal
          customerId={customer.id}
          initialType={activityModalType}
          isOpen={isAddActivityModalOpen}
          onClose={() => setIsAddActivityModalOpen(false)}
          onSuccess={() => {
            showToast("Aktivite başarıyla kaydedildi.");
            setIsAddActivityModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {isEditModalOpen && (
        <EditCustomerModal
          customer={customer}
          employees={employees}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            showToast("Müşteri bilgileri güncellendi.");
            setIsEditModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}
    </PageContainer>
  );
}
