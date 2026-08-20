"use client";

import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "@workspace/ui/components/sonner";
import {
  Briefcase,
  Building,
  Building2,
  Calendar,
  ChevronRight,
  Edit2,
  Eye,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  Network,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiClient,
  type DepartmentDto,
  type EmployeeDetailDto,
  type EmployeeDto,
  type JobPositionDto,
  type OrgChartNodeDto,
  type TenantUserDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function OrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-8 text-slate-500 shadow-xs">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-fuchsia-500" />
          <p className="font-semibold text-xs">Organizasyon yükleniyor...</p>
        </div>
      }
    >
      <OrganizationPageContent />
    </Suspense>
  );
}

function OrganizationPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const { activeTenant, hasPermission } = usePermissions();

  const tabParam = searchParams.get("tab") as
    | "chart"
    | "departments"
    | "employees"
    | "positions"
    | null;
  const [activeTab, setActiveTab] = useState<
    "chart" | "departments" | "employees" | "positions"
  >(
    tabParam &&
      ["chart", "departments", "employees", "positions"].includes(tabParam)
      ? tabParam
      : "chart"
  );

  useEffect(() => {
    if (
      tabParam &&
      ["chart", "departments", "employees", "positions"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (
    tab: "chart" | "departments" | "employees" | "positions"
  ) => {
    setActiveTab(tab);
    router.push(`/${tenantSlug}/organization?tab=${tab}`);
  };

  // Data States
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [positions, setPositions] = useState<JobPositionDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [orgChart, setOrgChart] = useState<OrgChartNodeDto[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Drawers
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentDto | null>(null);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<JobPositionDto | null>(null);
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeDto | null>(null);
  const [viewingEmpId, setViewingEmpId] = useState<string | null>(null);
  const [selectedEmpDetail, setSelectedEmpDetail] =
    useState<EmployeeDetailDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "destructive" | "warning" | "default";
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Load all initial data
  const loadData = useCallback(async () => {
    if (!activeTenant?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const [deptRes, posRes, empRes, chartRes, userRes] = await Promise.all([
        ApiClient.getDepartments(activeTenant.id),
        ApiClient.getJobPositions(activeTenant.id),
        ApiClient.getEmployees({}, activeTenant.id),
        ApiClient.getOrgChart(activeTenant.id),
        ApiClient.getTenantUsers(activeTenant.id),
      ]);

      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
      }
      if (posRes.success && posRes.data) {
        setPositions(posRes.data);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
      if (chartRes.success && chartRes.data) {
        setOrgChart(chartRes.data);
      }
      if (userRes.success && userRes.data) {
        setTenantUsers(userRes.data);
      }
    } catch (err) {
      console.error("Failed to load organization data", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load employee detail when drawer is opened
  useEffect(() => {
    if (!(viewingEmpId && activeTenant?.id)) {
      setSelectedEmpDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setIsLoadingDetail(true);
      const res = await ApiClient.getEmployeeById(
        viewingEmpId,
        activeTenant.id
      );
      if (res.success && res.data) {
        setSelectedEmpDetail(res.data);
      }
      setIsLoadingDetail(false);
    };

    fetchDetail();
  }, [viewingEmpId, activeTenant?.id]);

  // Filtered employees list
  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        const matchesSearch =
          searchQuery === "" ||
          emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (emp.title &&
            emp.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (emp.employeeNumber &&
            emp.employeeNumber
              .toLowerCase()
              .includes(searchQuery.toLowerCase()));

        const matchesDept =
          filterDept === "all" || emp.departmentId === filterDept;
        const matchesType =
          filterType === "all" || emp.employmentType === filterType;
        const matchesStatus =
          filterStatus === "all" || emp.status === filterStatus;

        return matchesSearch && matchesDept && matchesType && matchesStatus;
      }),
    [employees, searchQuery, filterDept, filterType, filterStatus]
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 font-semibold text-fuchsia-600 text-xs uppercase tracking-wider">
            <Network className="h-4 w-4" />
            <span>Organization & People</span>
          </div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight sm:text-3xl">
            Organizasyon & Departmanlar
          </h1>
          <p className="mt-1 text-slate-500 text-xs">
            Departman hiyerarşisi, organizasyon şeması, çalışan kadrosu ve
            pozisyonları yönetin.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-semibold text-slate-700 text-xs shadow-2xs transition-all hover:bg-slate-50"
            onClick={() => {
              setEditingDept(null);
              setIsDeptModalOpen(true);
            }}
            type="button"
          >
            <Building2 className="h-3.5 w-3.5 text-fuchsia-500" />
            <span>Yeni Departman</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-semibold text-slate-700 text-xs shadow-2xs transition-all hover:bg-slate-50"
            onClick={() => {
              setEditingPos(null);
              setIsPosModalOpen(true);
            }}
            type="button"
          >
            <Briefcase className="h-3.5 w-3.5 text-violet-500" />
            <span>Yeni Pozisyon</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white text-xs shadow-xs transition-all hover:bg-slate-800"
            onClick={() => {
              setEditingEmp(null);
              setIsEmpModalOpen(true);
            }}
            type="button"
          >
            <Plus className="h-4 w-4 text-fuchsia-400" />
            <span>Yeni Çalışan Ekle</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center justify-between border-slate-100 border-b pb-3">
        <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
          <button
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
              activeTab === "chart"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => handleTabChange("chart")}
            type="button"
          >
            <Network className="h-4 w-4 text-fuchsia-500" />
            <span>Organizasyon Şeması</span>
          </button>

          <button
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
              activeTab === "departments"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => handleTabChange("departments")}
            type="button"
          >
            <Building2 className="h-4 w-4 text-cyan-500" />
            <span>Departmanlar ({departments.length})</span>
          </button>

          <button
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
              activeTab === "employees"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => handleTabChange("employees")}
            type="button"
          >
            <Users className="h-4 w-4 text-violet-500" />
            <span>Çalışanlar & Kadro ({employees.length})</span>
          </button>

          <button
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-xs transition-all ${
              activeTab === "positions"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => handleTabChange("positions")}
            type="button"
          >
            <Briefcase className="h-4 w-4 text-indigo-500" />
            <span>Pozisyon Kataloğu ({positions.length})</span>
          </button>
        </div>

        {/* Refresh button */}
        <button
          className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-slate-600 text-xs transition-colors hover:bg-slate-50"
          disabled={isLoading}
          onClick={loadData}
          type="button"
        >
          <RotateCcw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-fuchsia-500" : "text-slate-500"}`}
          />
          <span>Yenile</span>
        </button>
      </div>

      {/* 3. Tab Contents */}
      {isLoading ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-8 text-slate-500 shadow-xs">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-fuchsia-500" />
          <p className="font-semibold text-xs">
            Organizasyon verileri yükleniyor...
          </p>
        </div>
      ) : (
        <>
          {activeTab === "chart" && (
            <OrgChartTab
              nodes={orgChart}
              onAddSubordinate={(managerId) => {
                setEditingEmp({
                  createdAt: "",
                  currency: "USD",
                  directReportCount: 0,
                  email: "",
                  employmentType: "FullTime",
                  firstName: "",
                  fullName: "",
                  id: "",
                  lastName: "",
                  managerId,
                  status: "Active",
                  tenantId: activeTenant?.id || "",
                });
                setIsEmpModalOpen(true);
              }}
              onNodeClick={(id) => setViewingEmpId(id)}
            />
          )}

          {activeTab === "departments" && (
            <DepartmentsTab
              departments={departments}
              employees={employees}
              onAddChild={(parentId) => {
                setEditingDept({
                  createdAt: "",
                  employeeCount: 0,
                  id: "",
                  name: "",
                  parentId,
                  subDepartmentCount: 0,
                  tenantId: activeTenant?.id || "",
                });
                setIsDeptModalOpen(true);
              }}
              onDelete={(deptId) => {
                setConfirmDialog({
                  confirmText: "Sil",
                  description:
                    "Bu departmanı silmek istediğinizden emin misiniz? Alt departmanlar ve çalışanlar etkilenebilir.",
                  onConfirm: async () => {
                    const res = await ApiClient.deleteDepartment(
                      deptId,
                      activeTenant!.id
                    );
                    if (res.success) {
                      toast.success("Departman başarıyla silindi.");
                      loadData();
                    } else {
                      toast.error(res.message || "Departman silinemedi.");
                    }
                    setConfirmDialog((prev) => ({ ...prev, open: false }));
                  },
                  open: true,
                  title: "Departmanı Sil",
                  variant: "destructive",
                });
              }}
              onEdit={(dept) => {
                setEditingDept(dept);
                setIsDeptModalOpen(true);
              }}
            />
          )}

          {activeTab === "employees" && (
            <EmployeesTab
              departments={departments}
              employees={filteredEmployees}
              filterDept={filterDept}
              filterStatus={filterStatus}
              filterType={filterType}
              onDelete={(empId) => {
                setConfirmDialog({
                  confirmText: "Sil",
                  description:
                    "Bu çalışanı silmek istediğinizden emin misiniz? Çalışana ait tüm bordro ve izin geçmişi de etkilenecektir.",
                  onConfirm: async () => {
                    const res = await ApiClient.deleteEmployee(
                      empId,
                      activeTenant!.id
                    );
                    if (res.success) {
                      toast.success("Çalışan kaydı silindi.");
                      loadData();
                    } else {
                      toast.error(res.message || "Çalışan silinemedi.");
                    }
                    setConfirmDialog((prev) => ({ ...prev, open: false }));
                  },
                  open: true,
                  title: "Çalışanı Sil",
                  variant: "destructive",
                });
              }}
              onEdit={(emp) => {
                setEditingEmp(emp);
                setIsEmpModalOpen(true);
              }}
              onView={(emp) => setViewingEmpId(emp.id)}
              positions={positions}
              searchQuery={searchQuery}
              setFilterDept={setFilterDept}
              setFilterStatus={setFilterStatus}
              setFilterType={setFilterType}
              setSearchQuery={setSearchQuery}
              setViewMode={setViewMode}
              viewMode={viewMode}
            />
          )}

          {activeTab === "positions" && (
            <PositionsTab
              departments={departments}
              onDelete={(posId) => {
                setConfirmDialog({
                  confirmText: "Sil",
                  description:
                    "Bu pozisyon tanımını silmek istediğinizden emin misiniz?",
                  onConfirm: async () => {
                    const res = await ApiClient.deleteJobPosition(
                      posId,
                      activeTenant!.id
                    );
                    if (res.success) {
                      toast.success("Pozisyon silindi.");
                      loadData();
                    } else {
                      toast.error(res.message || "Pozisyon silinemedi.");
                    }
                    setConfirmDialog((prev) => ({ ...prev, open: false }));
                  },
                  open: true,
                  title: "Pozisyonu Sil",
                  variant: "destructive",
                });
              }}
              onEdit={(pos) => {
                setEditingPos(pos);
                setIsPosModalOpen(true);
              }}
              positions={positions}
            />
          )}
        </>
      )}

      {/* 4. Modals & Drawers */}
      {/* Department Modal */}
      {isDeptModalOpen && (
        <DepartmentModal
          department={editingDept}
          departments={departments}
          employees={employees}
          onClose={() => {
            setIsDeptModalOpen(false);
            setEditingDept(null);
          }}
          onSuccess={() => {
            setIsDeptModalOpen(false);
            setEditingDept(null);
            loadData();
          }}
          tenantId={activeTenant!.id}
        />
      )}

      {/* Position Modal */}
      {isPosModalOpen && (
        <PositionModal
          departments={departments}
          onClose={() => {
            setIsPosModalOpen(false);
            setEditingPos(null);
          }}
          onSuccess={() => {
            setIsPosModalOpen(false);
            setEditingPos(null);
            loadData();
          }}
          position={editingPos}
          tenantId={activeTenant!.id}
        />
      )}

      {/* Employee Modal */}
      {isEmpModalOpen && (
        <EmployeeModal
          departments={departments}
          employee={editingEmp}
          employees={employees}
          onClose={() => {
            setIsEmpModalOpen(false);
            setEditingEmp(null);
          }}
          onSuccess={() => {
            setIsEmpModalOpen(false);
            setEditingEmp(null);
            loadData();
          }}
          positions={positions}
          tenantId={activeTenant!.id}
          tenantUsers={tenantUsers}
        />
      )}

      {/* Employee Dossier Drawer */}
      {viewingEmpId && (
        <EmployeeDetailDrawer
          employeeDetail={selectedEmpDetail}
          isLoading={isLoadingDetail}
          onClose={() => setViewingEmpId(null)}
          onEdit={() => {
            if (selectedEmpDetail) {
              setEditingEmp(selectedEmpDetail);
              setViewingEmpId(null);
              setIsEmpModalOpen(true);
            }
          }}
          onSelectEmployee={(id) => setViewingEmpId(id)}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        confirmText={confirmDialog.confirmText}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        title={confirmDialog.title}
        variant={confirmDialog.variant}
      />
    </div>
  );
}

// ============================================================================
// 1. ORGANİZASYON ŞEMASI AĞAÇ TUVALİ (ORG CHART COMPONENT)
// ============================================================================
function OrgChartTab({
  nodes,
  onNodeClick,
  onAddSubordinate,
}: {
  nodes: OrgChartNodeDto[];
  onNodeClick: (id: string) => void;
  onAddSubordinate: (managerId: string) => void;
}) {
  const [zoom, setZoom] = useState(1);

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white p-8 text-center shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-fuchsia-50 text-fuchsia-600 shadow-fuchsia-500/10 shadow-sm">
          <Network className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-bold text-base text-slate-900">
          Organizasyon Şeması Henüz Oluşmadı
        </h3>
        <p className="mt-1 max-w-sm text-slate-500 text-xs">
          Şema oluşturmak için çalışanları ekleyip birbirine bağlı yönetici
          (Reports To) hiyerarşisi belirleyin.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/70 shadow-xs">
      {/* Chart Canvas Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-md backdrop-blur-sm">
        <button
          className="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100"
          onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))}
          title="Yakınlaştır"
          type="button"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="px-1 font-mono font-semibold text-[11px] text-slate-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100"
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          title="Uzaklaştır"
          type="button"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          className="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100"
          onClick={() => setZoom(1)}
          title="Sıfırla"
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Grid Pattern Viewport */}
      <div
        className="min-h-[640px] overflow-auto p-12 transition-transform duration-150"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div
          className="flex origin-top justify-center transition-transform"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="flex flex-col items-center gap-12">
            {nodes.map((root) => (
              <OrgNodeItem
                key={root.id}
                node={root}
                onAddSubordinate={onAddSubordinate}
                onNodeClick={onNodeClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgNodeItem({
  node,
  onNodeClick,
  onAddSubordinate,
}: {
  node: OrgChartNodeDto;
  onNodeClick: (id: string) => void;
  onAddSubordinate: (managerId: string) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasChildren = node.directReports && node.directReports.length > 0;

  // Level Styling
  const levelBadge = useMemo(() => {
    switch (node.level) {
      case "Executive":
        return "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-fuchsia-500/20";
      case "Director":
        return "bg-gradient-to-r from-purple-500 to-indigo-600 text-white";
      case "Manager":
        return "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white";
      case "Lead":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }, [node.level]);

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div className="group relative z-10 w-72 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-300 hover:shadow-fuchsia-500/10 hover:shadow-xl">
        {/* Top badges */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-0.5 font-bold text-[10px] tracking-wide shadow-2xs ${levelBadge}`}
          >
            {node.level || "Staff"}
          </span>
          {node.departmentName && (
            <span className="rounded-lg bg-fuchsia-50/80 px-2 py-0.5 font-bold text-[10px] text-fuchsia-700">
              {node.departmentCode ? `[${node.departmentCode}] ` : ""}
              {node.departmentName}
            </span>
          )}
        </div>

        {/* Profile Details */}
        <div
          className="flex cursor-pointer items-center gap-3"
          onClick={() => onNodeClick(node.id)}
        >
          {node.avatarUrl ? (
            <img
              alt={node.fullName}
              className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-2 ring-fuchsia-500/30"
              src={node.avatarUrl}
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-500 font-extrabold text-sm text-white shadow-fuchsia-500/25 shadow-md">
              {node.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h4 className="truncate font-bold text-slate-900 text-xs transition-colors group-hover:text-fuchsia-600">
              {node.fullName}
            </h4>
            <p className="truncate font-medium text-[11px] text-slate-500">
              {node.title || "Ünvan Belirtilmedi"}
            </p>
            <p className="truncate font-mono text-[10px] text-slate-400">
              {node.email}
            </p>
          </div>
        </div>

        {/* Card Footer: Subordinates & Quick Actions */}
        <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2.5 text-[11px]">
          <div className="flex items-center gap-1 font-semibold text-slate-500">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>{node.directReportsCount} Doğrudan</span>
            {node.totalSubordinatesCount > node.directReportsCount && (
              <span className="text-[10px] text-slate-400">
                ({node.totalSubordinatesCount} Toplam)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-fuchsia-50 hover:text-fuchsia-600"
              onClick={(e) => {
                e.stopPropagation();
                onAddSubordinate(node.id);
              }}
              title="Ast Çalışan Ekle"
              type="button"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>

            {hasChildren && (
              <button
                className={`flex h-6 w-6 items-center justify-center rounded-lg border font-bold text-xs transition-colors ${
                  isCollapsed
                    ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                title={isCollapsed ? "Genişlet" : "Daralt"}
                type="button"
              >
                {isCollapsed ? `+${node.directReports.length}` : "−"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Children Nodes Section */}
      {hasChildren && !isCollapsed && (
        <div className="relative mt-8 flex flex-col items-center">
          {/* Vertical stem line from parent to horizontal branch */}
          <div className="absolute -top-8 h-8 w-px bg-slate-300" />

          {/* Horizontal crossbar for multiple children */}
          {node.directReports.length > 1 && (
            <div
              className="mb-8 h-px bg-slate-300"
              style={{
                width: `calc(100% - ${100 / node.directReports.length}%)`,
              }}
            />
          )}

          {/* Subordinate cards row */}
          <div className="flex items-start gap-8">
            {node.directReports.map((child) => (
              <div
                className="relative flex flex-col items-center"
                key={child.id}
              >
                {/* Stem line connecting horizontal bar to child card */}
                <div className="absolute -top-8 h-8 w-px bg-slate-300" />
                <OrgNodeItem
                  node={child}
                  onAddSubordinate={onAddSubordinate}
                  onNodeClick={onNodeClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. DEPARTMANLAR YÖNETİM SEKMESİ (DEPARTMENTS TAB)
// ============================================================================
function DepartmentsTab({
  departments,
  employees,
  onEdit,
  onDelete,
  onAddChild,
}: {
  departments: DepartmentDto[];
  employees: EmployeeDto[];
  onEdit: (dept: DepartmentDto) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDepts = useMemo(
    () =>
      departments.filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (d.code && d.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (d.costCenter &&
            d.costCenter.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [departments, searchTerm]
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-9 text-slate-900 text-xs placeholder:text-slate-400 focus:border-fuchsia-500 focus:outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Departman adı, kod veya maliyet merkezi ara..."
            type="text"
            value={searchTerm}
          />
        </div>
      </div>

      {/* Grid of Department Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDepts.map((dept) => (
          <div
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-fuchsia-200 hover:shadow-md"
            key={dept.id}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-fuchsia-500/20 shadow-md">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {dept.name}
                    </h3>
                    {dept.code && (
                      <span className="font-bold font-mono text-[10px] text-fuchsia-600">
                        [{dept.code}]
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => onEdit(dept)}
                    title="Düzenle"
                    type="button"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => onDelete(dept.id)}
                    title="Sil"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Description & Parent */}
              {dept.parentName && (
                <div className="mt-3 flex items-center gap-1 font-medium text-[11px] text-slate-500">
                  <span className="text-slate-400">Üst Departman:</span>
                  <span className="font-semibold text-slate-700">
                    {dept.parentName}
                  </span>
                </div>
              )}

              {dept.description && (
                <p className="mt-2 line-clamp-2 text-slate-500 text-xs">
                  {dept.description}
                </p>
              )}

              {/* Lead & Stats */}
              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Departman Lideri:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {dept.leadName || "Atanmadı"}
                  </span>
                </div>

                {dept.costCenter && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Maliyet Merkezi:
                    </span>
                    <span className="font-mono font-semibold text-[11px] text-slate-700">
                      {dept.costCenter}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between border-slate-100 border-t pt-3 text-xs">
              <div className="flex items-center gap-3 font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {dept.employeeCount} Personel
                </span>
                {dept.subDepartmentCount > 0 && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Layers className="h-3.5 w-3.5" />
                    {dept.subDepartmentCount} Alt Birim
                  </span>
                )}
              </div>

              <button
                className="flex items-center gap-1 font-bold text-[11px] text-fuchsia-600 transition-colors hover:text-fuchsia-800"
                onClick={() => onAddChild(dept.id)}
                type="button"
              >
                <Plus className="h-3 w-3" />
                <span>Alt Birim Ekle</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 3. ÇALIŞANLAR & KADRO SEKMESİ (EMPLOYEES TAB)
// ============================================================================
function EmployeesTab({
  employees,
  departments,
  positions,
  searchQuery,
  setSearchQuery,
  filterDept,
  setFilterDept,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  viewMode,
  setViewMode,
  onView,
  onEdit,
  onDelete,
}: {
  employees: EmployeeDto[];
  departments: DepartmentDto[];
  positions: JobPositionDto[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterDept: string;
  setFilterDept: (d: string) => void;
  filterType: string;
  setFilterType: (t: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  viewMode: "table" | "grid";
  setViewMode: (v: "table" | "grid") => void;
  onView: (emp: EmployeeDto) => void;
  onEdit: (emp: EmployeeDto) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-slate-900 text-xs placeholder:text-slate-400 focus:border-fuchsia-500 focus:bg-white focus:outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İsim, e-posta, sicil no veya unvan ile ara..."
            type="text"
            value={searchQuery}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 text-xs focus:border-fuchsia-500 focus:outline-none"
            onChange={(e) => setFilterDept(e.target.value)}
            value={filterDept}
          >
            <option value="all">Tüm Departmanlar</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 text-xs focus:border-fuchsia-500 focus:outline-none"
            onChange={(e) => setFilterType(e.target.value)}
            value={filterType}
          >
            <option value="all">Tüm Çalışma Türleri</option>
            <option value="FullTime">Tam Zamanlı</option>
            <option value="PartTime">Yarı Zamanlı</option>
            <option value="Remote">Uzaktan (Remote)</option>
            <option value="Hybrid">Hibrit</option>
            <option value="Contractor">Sözleşmeli</option>
            <option value="Intern">Stajyer</option>
          </select>

          {/* Status Filter */}
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 text-xs focus:border-fuchsia-500 focus:outline-none"
            onChange={(e) => setFilterStatus(e.target.value)}
            value={filterStatus}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="Active">Aktif</option>
            <option value="OnLeave">İzinde</option>
            <option value="Probation">Deneme Süresinde</option>
            <option value="Terminated">Ayrıldı</option>
          </select>

          {/* Toggle View */}
          <div className="flex items-center rounded-xl border border-slate-200 p-0.5">
            <button
              className={`rounded-lg p-1.5 ${viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
              onClick={() => setViewMode("table")}
              type="button"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
              onClick={() => setViewMode("grid")}
              type="button"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content: Table or Grid */}
      {employees.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200 border-dashed bg-white p-8 text-center shadow-xs">
          <Users className="h-10 w-10 text-slate-300" />
          <h3 className="mt-3 font-bold text-slate-800 text-sm">
            Çalışan Bulunamadı
          </h3>
          <p className="mt-1 text-slate-500 text-xs">
            Filtrelerinizi değiştirin veya yeni çalışan ekleyin.
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-slate-100 border-b bg-slate-50/60 font-bold text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Çalışan</th>
                <th className="px-6 py-3.5">Departman & Pozisyon</th>
                <th className="px-6 py-3.5">Yönetici (Reports To)</th>
                <th className="px-6 py-3.5">Çalışma Şekli</th>
                <th className="px-6 py-3.5">Durum</th>
                <th className="px-6 py-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr
                  className="transition-colors hover:bg-slate-50/70"
                  key={emp.id}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {emp.avatarUrl ? (
                        <img
                          alt={emp.fullName}
                          className="h-9 w-9 rounded-xl object-cover"
                          src={emp.avatarUrl}
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 font-extrabold text-white text-xs shadow-xs">
                          {emp.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900">
                          {emp.fullName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {emp.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">
                      {emp.title || "—"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {emp.departmentName || "Genel"}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {emp.managerName ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        {emp.managerName}
                      </span>
                    ) : (
                      <span className="text-slate-400">Üst Yönetici Yok</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-[10px] text-slate-700">
                      {emp.employmentType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-[10px] ${
                        emp.status === "Active"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : emp.status === "OnLeave"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {emp.status === "Active"
                        ? "Aktif"
                        : emp.status === "OnLeave"
                          ? "İzinde"
                          : emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => onView(emp)}
                        title="Profili Gör"
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => onEdit(emp)}
                        title="Düzenle"
                        type="button"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => onDelete(emp.id)}
                        title="Sil"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <div
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-fuchsia-300 hover:shadow-md"
              key={emp.id}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {emp.avatarUrl ? (
                      <img
                        alt={emp.fullName}
                        className="h-11 w-11 rounded-2xl object-cover ring-2 ring-fuchsia-500/20"
                        src={emp.avatarUrl}
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 font-bold text-sm text-white shadow-fuchsia-500/20 shadow-sm">
                        {emp.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {emp.fullName}
                      </h4>
                      <p className="font-medium text-slate-500 text-xs">
                        {emp.title || "Personel"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${
                      emp.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-slate-600 text-xs">
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>{emp.departmentName || "Departmansız"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate font-mono text-[11px]">
                      {emp.email}
                    </span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-slate-100 border-t pt-3">
                <span className="font-medium text-[11px] text-slate-400">
                  {emp.directReportCount > 0
                    ? `${emp.directReportCount} Doğrudan Ast`
                    : "Bireysel Katılımcı"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => onView(emp)}
                    type="button"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => onEdit(emp)}
                    type="button"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. POZİSYON KATALOĞU SEKMESİ (POSITIONS TAB)
// ============================================================================
function PositionsTab({
  positions,
  departments,
  onEdit,
  onDelete,
}: {
  positions: JobPositionDto[];
  departments: DepartmentDto[];
  onEdit: (pos: JobPositionDto) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-slate-100 border-b bg-slate-50/60 font-bold text-[11px] text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Pozisyon / Ünvan</th>
              <th className="px-6 py-3.5">Kariyer Kademesi</th>
              <th className="px-6 py-3.5">Departman</th>
              <th className="px-6 py-3.5">Maaş Bandı Aralığı</th>
              <th className="px-6 py-3.5">Aktif Personel</th>
              <th className="px-6 py-3.5 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {positions.map((pos) => (
              <tr
                className="transition-colors hover:bg-slate-50/70"
                key={pos.id}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{pos.title}</div>
                  {pos.jobDescription && (
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                      {pos.jobDescription}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-[10px] text-slate-700">
                    {pos.level}
                  </span>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-700">
                  {pos.departmentName || "Tüm Departmanlar"}
                </td>
                <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                  {pos.minSalary || pos.maxSalary
                    ? `$${pos.minSalary?.toLocaleString() || "0"} – $${pos.maxSalary?.toLocaleString() || "Max"}`
                    : "—"}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">
                  {pos.employeeCount} Kişi
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => onEdit(pos)}
                      type="button"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => onDelete(pos.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// 5. MODALLAR: DEPARTMAN, POZİSYON, ÇALIŞAN & DETAY ÇEKMECESİ
// ============================================================================

// A) Department Modal
function DepartmentModal({
  department,
  departments,
  employees,
  tenantId,
  onClose,
  onSuccess,
}: {
  department: DepartmentDto | null;
  departments: DepartmentDto[];
  employees: EmployeeDto[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(department?.name || "");
  const [code, setCode] = useState(department?.code || "");
  const [description, setDescription] = useState(department?.description || "");
  const [parentId, setParentId] = useState(department?.parentId || "");
  const [leadId, setLeadId] = useState(department?.leadId || "");
  const [costCenter, setCostCenter] = useState(department?.costCenter || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setIsSubmitting(true);

    const payload = {
      code: code.trim() || undefined,
      costCenter: costCenter.trim() || undefined,
      description: description.trim() || undefined,
      leadId: leadId || undefined,
      name: name.trim(),
      parentId: parentId || undefined,
    };

    const res = department?.id
      ? await ApiClient.updateDepartment(department.id, payload, tenantId)
      : await ApiClient.createDepartment(payload, tenantId);

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        department?.id ? "Departman güncellendi." : "Departman oluşturuldu."
      );
      onSuccess();
    } else {
      toast.error(res.message || "İşlem başarısız.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-slate-100 border-b pb-3">
          <h2 className="flex items-center gap-2 font-bold text-base text-slate-900">
            <Building2 className="h-5 w-5 text-blue-600" />
            {department?.id ? "Departmanı Düzenle" : "Yeni Departman Oluştur"}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          action="javascript:void(0);"
          className="space-y-3.5 text-xs"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="mb-1 block font-semibold text-slate-800">
              Departman Adı *
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Yazılım & Teknoloji"
              required
              type="text"
              value={name}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Departman Kodu
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-slate-900 uppercase focus:border-blue-500 focus:outline-none"
                onChange={(e) => setCode(e.target.value)}
                placeholder="Örn: TECH"
                type="text"
                value={code}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Maliyet Merkezi
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="CC-102"
                type="text"
                value={costCenter}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-800">
              Üst Departman
            </label>
            <Select
              onValueChange={(val) => setParentId(val === "none" ? "" : val)}
              value={parentId || "none"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Yok (Ana Departman)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Yok (Ana Departman)</SelectItem>
                {departments
                  .filter((d) => d.id !== department?.id)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-800">
              Departman Lideri / Müdürü
            </label>
            <Select
              onValueChange={(val) => setLeadId(val === "none" ? "" : val)}
              value={leadId || "none"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Lider Seçilmedi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Lider Seçilmedi</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName} ({e.title || e.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-800">
              Açıklama
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Departmanın temel görev ve sorumlulukları..."
              rows={2}
              value={description}
            />
          </div>

          <div className="flex justify-end gap-2 border-slate-100 border-t pt-3">
            <button
              className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{department?.id ? "Güncelle" : "Departman Oluştur"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// B) Position Modal
function PositionModal({
  position,
  departments,
  tenantId,
  onClose,
  onSuccess,
}: {
  position: JobPositionDto | null;
  departments: DepartmentDto[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(position?.title || "");
  const [level, setLevel] = useState(position?.level || "Mid");
  const [departmentId, setDepartmentId] = useState(
    position?.departmentId || ""
  );
  const [jobDescription, setJobDescription] = useState(
    position?.jobDescription || ""
  );
  const [minSalary, setMinSalary] = useState(
    position?.minSalary?.toString() || ""
  );
  const [maxSalary, setMaxSalary] = useState(
    position?.maxSalary?.toString() || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    setIsSubmitting(true);

    const payload = {
      departmentId: departmentId || undefined,
      jobDescription: jobDescription.trim() || undefined,
      level,
      maxSalary: maxSalary ? Number.parseFloat(maxSalary) : undefined,
      minSalary: minSalary ? Number.parseFloat(minSalary) : undefined,
      title: title.trim(),
    };

    const res = position?.id
      ? await ApiClient.updateJobPosition(position.id, payload, tenantId)
      : await ApiClient.createJobPosition(payload, tenantId);

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        position?.id ? "Pozisyon güncellendi." : "Pozisyon oluşturuldu."
      );
      onSuccess();
    } else {
      toast.error(res.message || "İşlem başarısız.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-slate-100 border-b pb-3">
          <h2 className="flex items-center gap-2 font-bold text-base text-slate-900">
            <Briefcase className="h-5 w-5 text-blue-600" />
            {position?.id ? "Pozisyonu Düzenle" : "Yeni Pozisyon Ekle"}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          action="javascript:void(0);"
          className="space-y-3.5 text-xs"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="mb-1 block font-semibold text-slate-800">
              Pozisyon / Ünvan Başlığı *
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Senior Frontend Developer"
              required
              type="text"
              value={title}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Kariyer Kademesi *
              </label>
              <Select onValueChange={setLevel} value={level}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Executive">Executive / C-Level</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Lead">Lead / Team Lead</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Mid">Mid Level</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Intern">Intern / Stajyer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Varsayılan Departman
              </label>
              <Select
                onValueChange={(val) =>
                  setDepartmentId(val === "all" ? "" : val)
                }
                value={departmentId || "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm Departmanlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Departmanlar</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Min Maaş Bandı
              </label>
              <NumberInput
                onChange={(val) => setMinSalary(String(val))}
                prefix="₺"
                value={Number.parseFloat(minSalary) || 0}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Max Maaş Bandı
              </label>
              <NumberInput
                onChange={(val) => setMaxSalary(String(val))}
                prefix="₺"
                value={Number.parseFloat(maxSalary) || 0}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-800">
              Görev Tanımı
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Pozisyonun ana sorumlulukları..."
              rows={2}
              value={jobDescription}
            />
          </div>

          <div className="flex justify-end gap-2 border-slate-100 border-t pt-3">
            <button
              className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{position?.id ? "Güncelle" : "Pozisyon Kaydet"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// C) Employee Modal
function EmployeeModal({
  employee,
  departments,
  positions,
  employees,
  tenantUsers,
  tenantId,
  onClose,
  onSuccess,
}: {
  employee: EmployeeDto | null;
  departments: DepartmentDto[];
  positions: JobPositionDto[];
  employees: EmployeeDto[];
  tenantUsers: TenantUserDto[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [userId, setUserId] = useState(employee?.userId || "");
  const [firstName, setFirstName] = useState(employee?.firstName || "");
  const [lastName, setLastName] = useState(employee?.lastName || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [phone, setPhone] = useState(employee?.phone || "");
  const [departmentId, setDepartmentId] = useState(
    employee?.departmentId || ""
  );
  const [jobPositionId, setJobPositionId] = useState(
    employee?.jobPositionId || ""
  );
  const [managerId, setManagerId] = useState(employee?.managerId || "");
  const [title, setTitle] = useState(employee?.title || "");
  const [employeeNumber, setEmployeeNumber] = useState(
    employee?.employeeNumber || ""
  );
  const [employmentType, setEmploymentType] = useState(
    employee?.employmentType || "FullTime"
  );
  const [status, setStatus] = useState(employee?.status || "Active");
  const [hireDate, setHireDate] = useState(
    employee?.hireDate
      ? employee.hireDate.split("T")[0]!
      : new Date().toISOString().split("T")[0]!
  );
  const [salary, setSalary] = useState(employee?.salary?.toString() || "");
  const [currency, setCurrency] = useState(employee?.currency || "TRY");
  const [avatarUrl, setAvatarUrl] = useState(employee?.avatarUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill names and email when user links an existing user
  const handleUserLink = (selectedUserId: string) => {
    setUserId(selectedUserId);
    const matchedUser = tenantUsers.find((u) => u.id === selectedUserId);
    if (matchedUser) {
      if (!(firstName || lastName) && matchedUser.fullName) {
        const parts = matchedUser.fullName.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      if (!email) {
        setEmail(matchedUser.email);
      }
    }
  };

  // When job position is picked, set suggested title & default dept if empty
  const handlePositionChange = (posId: string) => {
    setJobPositionId(posId);
    const pos = positions.find((p) => p.id === posId);
    if (pos) {
      if (!title) {
        setTitle(pos.title);
      }
      if (!departmentId && pos.departmentId) {
        setDepartmentId(pos.departmentId);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(firstName.trim() && lastName.trim() && email.trim())) {
      return;
    }
    setIsSubmitting(true);

    const payload = {
      avatarUrl: avatarUrl.trim() || undefined,
      currency,
      departmentId: departmentId || undefined,
      email: email.trim(),
      employeeNumber: employeeNumber.trim() || undefined,
      employmentType,
      firstName: firstName.trim(),
      hireDate,
      jobPositionId: jobPositionId || undefined,
      lastName: lastName.trim(),
      managerId: managerId || undefined,
      phone: phone.trim() || undefined,
      salary: salary ? Number.parseFloat(salary) : undefined,
      status,
      title: title.trim() || undefined,
      userId: userId || undefined,
    };

    const res = employee?.id
      ? await ApiClient.updateEmployee(employee.id, payload, tenantId)
      : await ApiClient.createEmployee(payload, tenantId);

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        employee?.id
          ? "Çalışan bilgileri güncellendi."
          : "Yeni çalışan kartı açıldı."
      );
      onSuccess();
    } else {
      toast.error(res.message || "İşlem başarısız.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-slate-100 border-b pb-3">
          <h2 className="flex items-center gap-2 font-bold text-base text-slate-900">
            <Users className="h-5 w-5 text-blue-600" />
            {employee?.id
              ? "Çalışan Kartını Düzenle"
              : "Yeni Çalışan / Personel Kartı Aç"}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          action="javascript:void(0);"
          className="space-y-4 text-xs"
          onSubmit={handleSubmit}
        >
          {/* Quick link existing user */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
            <label className="mb-1 block font-bold text-blue-950">
              Sistem Kullanıcısı Eşleştir (Opsiyonel)
            </label>
            <Select
              onValueChange={(val) => handleUserLink(val === "none" ? "" : val)}
              value={userId || "none"}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Bağımsız Personel Kartı (Hesap Bağlama Yok)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Bağımsız Personel Kartı (Hesap Bağlama Yok)
                </SelectItem>
                {tenantUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName ? `${u.fullName} (${u.email})` : u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Adı *
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ahmet"
                required
                type="text"
                value={firstName}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Soyadı *
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Yılmaz"
                required
                type="text"
                value={lastName}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                E-posta Adresi *
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ahmet@sirket.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Telefon
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 555 123 4567"
                type="text"
                value={phone}
              />
            </div>
          </div>

          {/* Org & Role Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Departman
              </label>
              <Select
                onValueChange={(val) =>
                  setDepartmentId(val === "none" ? "" : val)
                }
                value={departmentId || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departmansız" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Departmansız</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Pozisyon Kataloğu
              </label>
              <Select
                onValueChange={(val) =>
                  handlePositionChange(val === "none" ? "" : val)
                }
                value={jobPositionId || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçilmedi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} ({p.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Özel / Görünen Ünvan
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Architect"
                type="text"
                value={title}
              />
            </div>
          </div>

          {/* Manager / Reports To Hierarchy */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <label className="mb-1 block font-bold text-slate-900">
              Bağlı Olduğu Yönetici (Reports To)
            </label>
            <Select
              onValueChange={(val) => setManagerId(val === "none" ? "" : val)}
              value={managerId || "none"}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Üst Yönetici Yok (En Üst Düzey / CEO / Founder)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Üst Yönetici Yok (En Üst Düzey / CEO / Founder)
                </SelectItem>
                {employees
                  .filter((e) => e.id !== employee?.id)
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} — {e.title || "Personel"} (
                      {e.departmentName || "Genel"})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* HR & Employment Details */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Çalışma Şekli
              </label>
              <Select onValueChange={setEmploymentType} value={employmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FullTime">
                    Tam Zamanlı (Full-Time)
                  </SelectItem>
                  <SelectItem value="PartTime">
                    Yarı Zamanlı (Part-Time)
                  </SelectItem>
                  <SelectItem value="Remote">Uzaktan (Remote)</SelectItem>
                  <SelectItem value="Hybrid">Hibrit (Hybrid)</SelectItem>
                  <SelectItem value="Contractor">
                    Sözleşmeli (Contractor)
                  </SelectItem>
                  <SelectItem value="Intern">Stajyer (Intern)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Çalışan Durumu
              </label>
              <Select onValueChange={setStatus} value={status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Aktif</SelectItem>
                  <SelectItem value="OnLeave">İzinde</SelectItem>
                  <SelectItem value="Probation">Deneme Süresinde</SelectItem>
                  <SelectItem value="Terminated">İşten Ayrıldı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Sicil No
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="EMP-1002"
                type="text"
                value={employeeNumber}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                İşe Giriş Tarihi
              </label>
              <DatePicker onChange={setHireDate} value={hireDate} />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Maaş (Net/Brüt)
              </label>
              <NumberInput
                onChange={(val) => setSalary(String(val))}
                prefix={
                  currency === "TRY"
                    ? "₺"
                    : currency === "USD"
                      ? "$"
                      : currency === "EUR"
                        ? "€"
                        : "£"
                }
                value={Number.parseFloat(salary) || 0}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Para Birimi
              </label>
              <Select onValueChange={setCurrency} value={currency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-800">
              Avatar Fotoğraf URL
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              type="url"
              value={avatarUrl}
            />
          </div>

          <div className="flex justify-end gap-2 border-slate-100 border-t pt-3">
            <button
              className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              İptal
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{employee?.id ? "Güncelle" : "Çalışan Kartını Aç"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// D) Employee Detail Drawer
function EmployeeDetailDrawer({
  employeeDetail,
  isLoading,
  onClose,
  onEdit,
  onSelectEmployee,
}: {
  employeeDetail: EmployeeDetailDto | null;
  isLoading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSelectEmployee: (id: string) => void;
}) {
  if (!employeeDetail && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
        <div className="flex h-full w-full max-w-md items-center justify-center bg-white p-8">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-500" />
        </div>
      </div>
    );
  }

  if (!employeeDetail) {
    return null;
  }

  return (
    <div className="fade-in fixed inset-0 z-50 flex animate-in justify-end bg-black/40 backdrop-blur-xs duration-200">
      <div className="slide-in-from-right flex h-full w-full max-w-md animate-in flex-col justify-between overflow-y-auto bg-white p-6 shadow-2xl duration-300">
        <div>
          {/* Top Close & Edit actions */}
          <div className="flex items-center justify-between border-slate-100 border-b pb-4">
            <span className="font-bold font-mono text-slate-400 text-xs">
              {employeeDetail.employeeNumber || "PERSONEL DETAYI"}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 text-xs hover:bg-slate-200"
                onClick={onEdit}
                type="button"
              >
                <Edit2 className="h-3.5 w-3.5 text-fuchsia-600" />
                <span>Düzenle</span>
              </button>
              <button
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={onClose}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Profile Header */}
          <div className="mt-6 flex flex-col items-center text-center">
            {employeeDetail.avatarUrl ? (
              <img
                alt={employeeDetail.fullName}
                className="h-20 w-20 rounded-3xl object-cover ring-4 ring-fuchsia-500/20"
                src={employeeDetail.avatarUrl}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-500 font-extrabold text-2xl text-white shadow-fuchsia-500/25 shadow-xl">
                {employeeDetail.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <h3 className="mt-3 font-bold text-lg text-slate-900">
              {employeeDetail.fullName}
            </h3>
            <p className="font-semibold text-fuchsia-600 text-xs">
              {employeeDetail.title || "Ünvan Tanımlanmadı"}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-0.5 font-bold text-[11px] text-slate-700">
                {employeeDetail.departmentName || "Genel"}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 font-bold text-[11px] text-emerald-700">
                {employeeDetail.status}
              </span>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs">
            <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
              İletişim & İK Bilgileri
            </h4>
            <div className="flex items-center gap-2.5 text-slate-700">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="font-mono">{employeeDetail.email}</span>
            </div>
            {employeeDetail.phone && (
              <div className="flex items-center gap-2.5 text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{employeeDetail.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-slate-700">
              <Briefcase className="h-4 w-4 text-slate-400" />
              <span>
                Çalışma Türü: <strong>{employeeDetail.employmentType}</strong>
              </span>
            </div>
            {employeeDetail.hireDate && (
              <div className="flex items-center gap-2.5 text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>
                  İşe Giriş:{" "}
                  {new Date(employeeDetail.hireDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Hierarchy & Reporting Tree */}
          <div className="mt-5 space-y-3 text-xs">
            <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
              Hiyerarşi & Raporlama
            </h4>

            {/* Manager */}
            <div className="rounded-2xl border border-slate-200/80 p-3">
              <div className="mb-1.5 font-bold text-[10px] text-slate-400 uppercase">
                Bağlı Olduğu Yönetici
              </div>
              {employeeDetail.managerId && employeeDetail.managerName ? (
                <div
                  className="flex cursor-pointer items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-slate-50"
                  onClick={() => onSelectEmployee(employeeDetail.managerId!)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500 font-bold text-white text-xs">
                    {employeeDetail.managerName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {employeeDetail.managerName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Yönetici Profilini Görüntüle →
                    </div>
                  </div>
                </div>
              ) : (
                <div className="font-medium text-slate-500 text-xs italic">
                  En üst düzey yönetici (Üst raporlama yok)
                </div>
              )}
            </div>

            {/* Direct Reports */}
            <div className="rounded-2xl border border-slate-200/80 p-3">
              <div className="mb-2 flex items-center justify-between font-bold text-[10px] text-slate-400 uppercase">
                <span>
                  Doğrudan Yönettiği Kişiler (
                  {employeeDetail.directReports.length})
                </span>
              </div>

              {employeeDetail.directReports.length === 0 ? (
                <div className="text-slate-400 text-xs italic">
                  Doğrudan bağlı çalışan bulunmuyor.
                </div>
              ) : (
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {employeeDetail.directReports.map((report) => (
                    <div
                      className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 p-2 transition-colors hover:bg-fuchsia-50"
                      key={report.id}
                      onClick={() => onSelectEmployee(report.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-fuchsia-500 font-bold text-[10px] text-white">
                          {report.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {report.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {report.title || report.email}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-slate-100 border-t pt-4 text-center">
          <button
            className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white text-xs shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
