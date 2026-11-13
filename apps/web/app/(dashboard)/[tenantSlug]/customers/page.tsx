/* Customers list — coordinator page (ADR-0003 decomposition).
   System: docs/crm-ui-standards.md (ADR-0004). */
"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Plus } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BulkActionBar, BulkDeleteIcon } from "@/components/bulk-action-bar";
import { PermissionGate } from "@/components/permission-gate";
import {
  ApiClient,
  type CustomerListDto,
  type CustomerStatsDto,
  type EmployeeDto,
} from "@/lib/api-client";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { usePermissions } from "@/lib/permissions/permission-context";
import { CreateCustomerModal } from "./_components/create-customer-modal";
import { CustomerFiltersBar } from "./_components/customer-filters-bar";
import { CustomerGridView } from "./_components/customer-grid-view";
import { CustomerStatsBanner } from "./_components/customer-stats-banner";
import { CustomerTableView } from "./_components/customer-table-view";
import { DeleteCustomerDialog } from "./_components/delete-customer-dialog";

export default function CustomersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant } = usePermissions();
  const { getParam, getIntParam, setParams } = useUrlFilters();

  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [stats, setStats] = useState<CustomerStatsDto | null>(null);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(25);

  // Filters — initialized from URL
  const [search, setSearch] = useState(() => getParam("search", ""));
  const [statusFilter, setStatusFilter] = useState(() =>
    getParam("status", "")
  );
  const [typeFilter, setTypeFilter] = useState(() => getParam("type", ""));
  const [tierFilter, setTierFilter] = useState(() => getParam("tier", ""));
  const [page] = useState(() => getIntParam("page", 1));
  const [viewMode, setViewMode] = useState<"table" | "grid">(() =>
    getParam("view", "table") === "grid" ? "grid" : "table"
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modals & Messages
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    () => searchParams.get("create") === "true"
  );
  const [deletingCustomer, setDeletingCustomer] =
    useState<CustomerListDto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    try {
      const [custRes, statsRes, empRes] = await Promise.all([
        ApiClient.getCustomers(activeTenant.id, {
          page,
          pageSize,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          tier: tierFilter || undefined,
          type: typeFilter || undefined,
        }),
        ApiClient.getCustomerStats(activeTenant.id),
        ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
      ]);

      if (custRes.success && custRes.data) {
        setCustomers(custRes.data.items);
        setTotalCount(custRes.data.totalCount);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
    } catch {
      showToast("Müşteri verileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [
    activeTenant,
    page,
    pageSize,
    search,
    statusFilter,
    typeFilter,
    tierFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!(activeTenant && deletingCustomer)) {
      return;
    }
    try {
      const res = await ApiClient.deleteCustomer(
        deletingCustomer.id,
        activeTenant.id
      );
      if (res.success) {
        showToast(`'${deletingCustomer.name}' başarıyla silindi.`);
        setDeletingCustomer(null);
        loadData();
      } else {
        showToast(res.message || "Silme işlemi başarısız.");
      }
    } catch {
      showToast("Silme sırasında hata oluştu.");
    }
  };

  // Bulk operations
  const allPageIds = customers.map((c) => c.id);
  const allSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected =
    allPageIds.some((id) => selectedIds.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPageIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!(activeTenant && selectedIds.size > 0)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      const { deletedCount, failedCount } = await ApiClient.bulkDeleteCustomers(
        Array.from(selectedIds),
        activeTenant.id
      );
      setSelectedIds(new Set());
      loadData();
      if (failedCount > 0) {
        showToast(
          `${deletedCount} müşteri silindi, ${failedCount} silinemedi.`
        );
      } else {
        showToast(`${deletedCount} müşteri başarıyla silindi.`);
      }
    } catch {
      showToast("Toplu silme sırasında hata oluştu.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setParams({ search: val || undefined });
  };

  const handleStatusFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setStatusFilter(v);
    setParams({ status: v || undefined });
  };

  const handleTypeFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setTypeFilter(v);
    setParams({ type: v || undefined });
  };

  const handleTierFilter = (val: string) => {
    const v = val === "all" ? "" : val;
    setTierFilter(v);
    setParams({ tier: v || undefined });
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setTierFilter("");
    setParams({
      search: undefined,
      status: undefined,
      tier: undefined,
      type: undefined,
    });
  };

  const handleViewMode = (mode: "table" | "grid") => {
    setViewMode(mode);
    setParams({ view: mode === "grid" ? "grid" : undefined });
  };

  return (
    <PageContainer className="space-y-5">
      {/* 1. Header */}
      <PageHeader
        actions={
          <PermissionGate permission="Customers.Create">
            <Button
              className="gap-1.5"
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Müşteri Ekle</span>
            </Button>
          </PermissionGate>
        }
        badge={
          <Badge className="gap-1 px-2 py-0.5 text-2xs" variant="accent">
            {totalCount} Kayıt
          </Badge>
        }
        description="Kurumsal ve bireysel tüm müşterilerinizi, yetkililerini ve ticari geçmişini yönetin."
        title="Müşteriler"
      />

      {/* 2. KPI Summary Cards */}
      <CustomerStatsBanner loading={loading} stats={stats} />

      {/* 3. Filters & View Switcher Bar */}
      <CustomerFiltersBar
        onExport={() =>
          showToast("Müşteri listesi CSV olarak dışa aktarılıyor...")
        }
        onResetFilters={handleResetFilters}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilter}
        onTierFilterChange={handleTierFilter}
        onTypeFilterChange={handleTypeFilter}
        onViewModeChange={handleViewMode}
        search={search}
        statusFilter={statusFilter}
        tierFilter={tierFilter}
        typeFilter={typeFilter}
        viewMode={viewMode}
      />

      {/* 4. Table / Grid View */}
      {viewMode === "table" ? (
        <CustomerTableView
          allSelected={allSelected}
          customers={customers}
          loading={loading}
          onCreateCustomer={() => setIsCreateModalOpen(true)}
          onDeleteCustomer={(c) => setDeletingCustomer(c)}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectOne={toggleSelectOne}
          selectedIds={selectedIds}
          someSelected={someSelected}
          tenantSlug={tenantSlug}
        />
      ) : (
        <CustomerGridView customers={customers} tenantSlug={tenantSlug} />
      )}

      {/* 5. Create Customer Modal */}
      {isCreateModalOpen && (
        <CreateCustomerModal
          employees={employees}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            showToast("Yeni müşteri başarıyla eklendi.");
            setIsCreateModalOpen(false);
            loadData();
          }}
          tenantId={activeTenant?.id || ""}
        />
      )}

      {/* 6. Delete Confirmation Dialog */}
      {deletingCustomer && (
        <DeleteCustomerDialog
          customer={deletingCustomer}
          onClose={() => setDeletingCustomer(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* 7. Bulk Action Bar */}
      <BulkActionBar
        actions={[
          {
            disabled: isBulkDeleting,
            icon: <BulkDeleteIcon />,
            label: isBulkDeleting ? "Siliniyor..." : "Seçilenleri Sil",
            onClick: handleBulkDelete,
            variant: "danger",
          },
        ]}
        onClear={() => setSelectedIds(new Set())}
        selectedCount={selectedIds.size}
      />
    </PageContainer>
  );
}
