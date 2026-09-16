"use client";

import { Combobox } from "@workspace/ui/components/combobox";
import { ConfirmDialog } from "@workspace/ui/components/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PageContainer } from "@workspace/ui/components/page-container";
import { SelectField } from "@workspace/ui/components/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Flame,
  GripVertical,
  Kanban,
  Layers,
  ListTodo,
  Milestone,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiClient,
  type BacklogItemDto,
  type CustomerListDto,
  type EmployeeDto,
  type EpicDto,
  type ProjectSummaryDto,
  type SprintDto,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

type ActiveTab = "backlog" | "board" | "epics";

export default function ProjectDetailPage() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "";
  const projectId = (params?.projectId as string) || "";
  const { activeTenant } = usePermissions();

  const [project, setProject] = useState<ProjectSummaryDto | null>(null);
  const [sprints, setSprints] = useState<SprintDto[]>([]);
  const [epics, setEpics] = useState<EpicDto[]>([]);
  const [items, setItems] = useState<BacklogItemDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [customers, setCustomers] = useState<CustomerListDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag & Drop State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: "destructive" | "warning" | "default";
    onConfirm: () => void | Promise<void>;
  }>({
    description: "",
    onConfirm: () => {},
    open: false,
    title: "",
  });
  const [dragOverSprintId, setDragOverSprintId] = useState<
    string | null | "backlog"
  >(null);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<ActiveTab>("backlog");
  const [search, setSearch] = useState("");

  // Modals & Drawers
  const [selectedItem, setSelectedItem] = useState<BacklogItemDto | null>(null);
  const [isEditingDrawer, setIsEditingDrawer] = useState(false);
  const [drawerSaving, setDrawerSaving] = useState(false);

  // Drawer Form State
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerType, setDrawerType] = useState("Task");
  const [drawerStatus, setDrawerStatus] = useState("Backlog");
  const [drawerPriority, setDrawerPriority] = useState("Medium");
  const [drawerStoryPoints, setDrawerStoryPoints] = useState(0);
  const [drawerEstimatedHours, setDrawerEstimatedHours] = useState(0);
  const [drawerLoggedHours, setDrawerLoggedHours] = useState(0);
  const [drawerAssigneeId, setDrawerAssigneeId] = useState("");
  const [drawerEpicId, setDrawerEpicId] = useState("");
  const [drawerSprintId, setDrawerSprintId] = useState("");
  const [drawerCustomerId, setDrawerCustomerId] = useState("");
  const [drawerDueDate, setDrawerDueDate] = useState("");
  const [drawerDescription, setDrawerDescription] = useState("");
  const [drawerAcceptance, setDrawerAcceptance] = useState("");

  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [createItemSprintId, setCreateItemSprintId] = useState<string | null>(
    null
  );
  const [isCreateSprintModalOpen, setIsCreateSprintModalOpen] = useState(false);
  const [isCreateEpicModalOpen, setIsCreateEpicModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Item Form State
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemType, setNewItemType] = useState("Task");
  const [newItemPriority, setNewItemPriority] = useState("Medium");
  const [newItemStoryPoints, setNewItemStoryPoints] = useState(0);
  const [newItemEpicId, setNewItemEpicId] = useState("");
  const [newItemAssigneeId, setNewItemAssigneeId] = useState("");
  const [newItemCustomerId, setNewItemCustomerId] = useState("");
  const [newItemDueDate, setNewItemDueDate] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemAcceptance, setNewItemAcceptance] = useState("");
  const [submittingItem, setSubmittingItem] = useState(false);

  // New Sprint Form State
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStartDate, setNewSprintStartDate] = useState("");
  const [newSprintEndDate, setNewSprintEndDate] = useState("");

  // New Epic Form State
  const [newEpicName, setNewEpicName] = useState("");
  const [newEpicColor, setNewEpicColor] = useState("purple");
  const [newEpicDescription, setNewEpicDescription] = useState("");
  const [newEpicDueDate, setNewEpicDueDate] = useState("");

  // Drawer Subtask & Comment State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newCommentContent, setNewCommentContent] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadProjectData = useCallback(async () => {
    if (!(activeTenant && projectId)) {
      return;
    }
    setLoading(true);
    try {
      const [projRes, sprintRes, epicRes, itemRes, empRes, custRes] =
        await Promise.all([
          ApiClient.getProjectById(projectId, activeTenant.id),
          ApiClient.getSprints(projectId, activeTenant.id),
          ApiClient.getEpics(projectId, activeTenant.id),
          ApiClient.getProjectBacklogItems(
            projectId,
            { pageSize: 300 },
            activeTenant.id
          ),
          ApiClient.getEmployees({ pageSize: 100 }, activeTenant.id),
          ApiClient.getCustomers(activeTenant.id, { pageSize: 100 }),
        ]);

      if (projRes.success && projRes.data) {
        setProject(projRes.data);
      }
      if (sprintRes.success && sprintRes.data) {
        setSprints(sprintRes.data);
      }
      if (epicRes.success && epicRes.data) {
        setEpics(epicRes.data);
      }
      if (itemRes.success && itemRes.data) {
        setItems(itemRes.data.items);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items);
      }
      if (custRes.success && custRes.data) {
        setCustomers(custRes.data.items);
      }
    } catch {
      showToast("Proje verileri yüklenirken bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  }, [activeTenant, projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Sync drawer fields when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      setDrawerTitle(selectedItem.title);
      setDrawerType(selectedItem.type);
      setDrawerStatus(selectedItem.status);
      setDrawerPriority(selectedItem.priority);
      setDrawerStoryPoints(selectedItem.storyPoints);
      setDrawerEstimatedHours(selectedItem.estimatedHours);
      setDrawerLoggedHours(selectedItem.loggedHours);
      setDrawerAssigneeId(selectedItem.assignedUserId || "");
      setDrawerEpicId(selectedItem.epicId || "");
      setDrawerSprintId(selectedItem.sprintId || "");
      setDrawerCustomerId(selectedItem.customerId || "");
      setDrawerDueDate(
        selectedItem.dueDate ? selectedItem.dueDate.slice(0, 10) : ""
      );
      setDrawerDescription(selectedItem.description || "");
      setDrawerAcceptance(selectedItem.acceptanceCriteria || "");
    }
  }, [selectedItem]);

  // Quick Update Field (Single Property)
  const handleQuickUpdateItem = async (
    itemId: string,
    patch: Partial<BacklogItemDto>
  ) => {
    if (!activeTenant) {
      return;
    }

    const currentItem = items.find((i) => i.id === itemId);
    if (!currentItem) {
      return;
    }

    const updated = { ...currentItem, ...patch };

    // Optimistic UI Update
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    if (selectedItem?.id === itemId) {
      setSelectedItem(updated);
    }

    try {
      await ApiClient.updateBacklogItem(
        itemId,
        {
          acceptanceCriteria: updated.acceptanceCriteria || undefined,
          assignedUserAvatar: updated.assignedUserAvatar || undefined,
          assignedUserId: updated.assignedUserId || undefined,
          assignedUserName: updated.assignedUserName || undefined,
          customerId: updated.customerId || undefined,
          customerName: updated.customerName || undefined,
          description: updated.description || undefined,
          dueDate: updated.dueDate || undefined,
          epicId: updated.epicId || undefined,
          estimatedHours: updated.estimatedHours,
          loggedHours: updated.loggedHours,
          priority: updated.priority,
          sprintId: updated.sprintId || undefined,
          status: updated.status,
          storyPoints: updated.storyPoints,
          title: updated.title,
          type: updated.type,
        },
        activeTenant.id
      );
    } catch {
      loadProjectData();
    }
  };

  // Save Drawer Full Edits
  const handleSaveDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(selectedItem && activeTenant) || drawerSaving) {
      return;
    }

    setDrawerSaving(true);
    const assignedEmployee = employees.find((e) => e.id === drawerAssigneeId);
    const customer = customers.find((c) => c.id === drawerCustomerId);
    const epic = epics.find((e) => e.id === drawerEpicId);
    const sprint = sprints.find((s) => s.id === drawerSprintId);

    const updated: BacklogItemDto = {
      ...selectedItem,
      acceptanceCriteria: drawerAcceptance.trim() || undefined,
      assignedUserAvatar: assignedEmployee?.avatarUrl || undefined,
      assignedUserId: drawerAssigneeId || undefined,
      assignedUserName: assignedEmployee?.fullName || undefined,
      customerId: drawerCustomerId || undefined,
      customerName: customer?.name || undefined,
      description: drawerDescription.trim() || undefined,
      dueDate: drawerDueDate
        ? new Date(drawerDueDate).toISOString()
        : undefined,
      epicColor: epic?.color || undefined,
      epicId: drawerEpicId || undefined,
      epicName: epic?.name || undefined,
      estimatedHours: Number(drawerEstimatedHours) || 0,
      loggedHours: Number(drawerLoggedHours) || 0,
      priority: drawerPriority,
      sprintId: drawerSprintId || undefined,
      sprintName: sprint?.name || undefined,
      status: drawerStatus,
      storyPoints: Number(drawerStoryPoints) || 0,
      title: drawerTitle.trim(),
      type: drawerType,
    };

    setItems((prev) =>
      prev.map((i) => (i.id === selectedItem.id ? updated : i))
    );
    setSelectedItem(updated);

    try {
      const res = await ApiClient.updateBacklogItem(
        selectedItem.id,
        {
          acceptanceCriteria: updated.acceptanceCriteria,
          assignedUserAvatar: updated.assignedUserAvatar,
          assignedUserId: updated.assignedUserId,
          assignedUserName: updated.assignedUserName,
          customerId: updated.customerId,
          customerName: updated.customerName,
          description: updated.description,
          dueDate: updated.dueDate,
          epicId: updated.epicId,
          estimatedHours: updated.estimatedHours,
          loggedHours: updated.loggedHours,
          priority: updated.priority,
          sprintId: updated.sprintId,
          status: updated.status,
          storyPoints: updated.storyPoints,
          title: updated.title,
          type: updated.type,
        },
        activeTenant.id
      );

      if (res.success) {
        showToast("İş maddesi güncellendi!");
      }
    } catch {
      showToast("Güncelleme sırasında hata oluştu.");
      loadProjectData();
    } finally {
      setDrawerSaving(false);
    }
  };

  // Delete Item
  const handleDeleteItem = (itemId: string) => {
    if (!activeTenant) {
      return;
    }

    setConfirmDialog({
      confirmText: "İş Maddesini Sil",
      description:
        "Bu iş maddesini kalıcı olarak silmek istediğinize emin misiniz?",
      onConfirm: async () => {
        // Optimistic Delete
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        if (selectedItem?.id === itemId) {
          setSelectedItem(null);
        }

        try {
          const res = await ApiClient.deleteBacklogItem(
            itemId,
            activeTenant.id
          );
          if (res.success) {
            showToast("İş maddesi silindi.");
          }
        } catch {
          showToast("Silme işlemi başarısız oldu.");
          loadProjectData();
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
      open: true,
      title: "İş Maddesini Sil",
      variant: "destructive",
    });
  };

  // Handle Item Creation
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newItemTitle.trim() && activeTenant) || submittingItem) {
      return;
    }

    setSubmittingItem(true);
    try {
      const assignedEmployee = employees.find(
        (e) => e.id === newItemAssigneeId
      );
      const customer = customers.find((c) => c.id === newItemCustomerId);

      const res = await ApiClient.createBacklogItem(
        projectId,
        {
          acceptanceCriteria: newItemAcceptance.trim() || undefined,
          assignedUserAvatar: assignedEmployee?.avatarUrl || undefined,
          assignedUserId: newItemAssigneeId || undefined,
          assignedUserName: assignedEmployee?.fullName || undefined,
          customerId: newItemCustomerId || undefined,
          customerName: customer?.name || undefined,
          description: newItemDescription.trim() || undefined,
          dueDate: newItemDueDate
            ? new Date(newItemDueDate).toISOString()
            : undefined,
          epicId: newItemEpicId || undefined,
          priority: newItemPriority,
          sprintId: createItemSprintId || undefined,
          status: createItemSprintId ? "Todo" : "Backlog",
          storyPoints: Number(newItemStoryPoints) || 0,
          title: newItemTitle.trim(),
          type: newItemType,
        },
        activeTenant.id
      );

      if (res.success) {
        showToast("İş maddesi oluşturuldu!");
        setIsCreateItemModalOpen(false);
        setNewItemTitle("");
        setNewItemDescription("");
        setNewItemAcceptance("");
        setNewItemStoryPoints(0);
        setNewItemEpicId("");
        setNewItemAssigneeId("");
        setNewItemCustomerId("");
        setNewItemDueDate("");
        loadProjectData();
      } else {
        showToast(res.message || "İş maddesi oluşturulamadı.");
      }
    } catch {
      showToast("İşlem sırasında hata oluştu.");
    } finally {
      setSubmittingItem(false);
    }
  };

  // Handle Sprint Creation
  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newSprintName.trim() && activeTenant)) {
      return;
    }

    try {
      const res = await ApiClient.createSprint(
        projectId,
        {
          endDate: newSprintEndDate
            ? new Date(newSprintEndDate).toISOString()
            : undefined,
          goal: newSprintGoal.trim() || undefined,
          name: newSprintName.trim(),
          startDate: newSprintStartDate
            ? new Date(newSprintStartDate).toISOString()
            : undefined,
        },
        activeTenant.id
      );

      if (res.success) {
        showToast("Sprint oluşturuldu!");
        setIsCreateSprintModalOpen(false);
        setNewSprintName("");
        setNewSprintGoal("");
        setNewSprintStartDate("");
        setNewSprintEndDate("");
        loadProjectData();
      }
    } catch {
      showToast("Sprint oluşturulurken hata oluştu.");
    }
  };

  // Handle Sprint Status Change
  const handleUpdateSprintStatus = async (sprintId: string, status: string) => {
    if (!activeTenant) {
      return;
    }
    try {
      const res = await ApiClient.updateSprintStatus(
        sprintId,
        status,
        activeTenant.id
      );
      if (res.success) {
        showToast(`Sprint durumu güncellendi: ${status}`);
        loadProjectData();
      }
    } catch {
      showToast("Sprint durumu değiştirilemedi.");
    }
  };

  // Handle Epic Creation
  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newEpicName.trim() && activeTenant)) {
      return;
    }

    try {
      const res = await ApiClient.createEpic(
        projectId,
        {
          color: newEpicColor,
          description: newEpicDescription.trim() || undefined,
          dueDate: newEpicDueDate
            ? new Date(newEpicDueDate).toISOString()
            : undefined,
          name: newEpicName.trim(),
        },
        activeTenant.id
      );

      if (res.success) {
        showToast("Epik oluşturuldu!");
        setIsCreateEpicModalOpen(false);
        setNewEpicName("");
        setNewEpicDescription("");
        setNewEpicDueDate("");
        loadProjectData();
      }
    } catch {
      showToast("Epik oluşturulurken hata oluştu.");
    }
  };

  // Move Item to Sprint
  const handleAssignToSprint = async (
    itemId: string,
    sprintId: string | null
  ) => {
    if (!activeTenant) {
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              sprintId: sprintId || undefined,
              status: sprintId
                ? i.status === "Backlog"
                  ? "Todo"
                  : i.status
                : "Backlog",
            }
          : i
      )
    );

    try {
      await ApiClient.assignItemToSprint(itemId, sprintId, activeTenant.id);
    } catch {
      loadProjectData();
    }
  };

  // Move Item Status (Kanban)
  const handleMoveStatus = async (itemId: string, status: string) => {
    if (!activeTenant) {
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status } : i))
    );
    if (selectedItem?.id === itemId) {
      setSelectedItem((prev) => (prev ? { ...prev, status } : null));
    }

    try {
      await ApiClient.moveBacklogItemStatus(itemId, status, 0, activeTenant.id);
    } catch {
      loadProjectData();
    }
  };

  // Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newSubtaskTitle.trim() && selectedItem && activeTenant)) {
      return;
    }

    try {
      const res = await ApiClient.addBacklogSubtask(
        selectedItem.id,
        newSubtaskTitle.trim(),
        activeTenant.id
      );
      if (res.success) {
        setNewSubtaskTitle("");
        const itemRes = await ApiClient.getBacklogItemById(
          selectedItem.id,
          activeTenant.id
        );
        if (itemRes.success && itemRes.data) {
          setSelectedItem(itemRes.data);
          setItems((prev) =>
            prev.map((i) => (i.id === selectedItem.id ? itemRes.data! : i))
          );
        }
      }
    } catch {
      showToast("Alt görev eklenemedi.");
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string) => {
    if (!(selectedItem && activeTenant)) {
      return;
    }
    try {
      await ApiClient.toggleBacklogSubtask(subtaskId, activeTenant.id);
      const itemRes = await ApiClient.getBacklogItemById(
        selectedItem.id,
        activeTenant.id
      );
      if (itemRes.success && itemRes.data) {
        setSelectedItem(itemRes.data);
        setItems((prev) =>
          prev.map((i) => (i.id === selectedItem.id ? itemRes.data! : i))
        );
      }
    } catch {
      showToast("Alt görev durumu güncellenemedi.");
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newCommentContent.trim() && selectedItem && activeTenant)) {
      return;
    }

    try {
      const res = await ApiClient.addBacklogComment(
        selectedItem.id,
        {
          content: newCommentContent.trim(),
          userName: "Aktif Kullanıcı",
        },
        activeTenant.id
      );
      if (res.success) {
        setNewCommentContent("");
        const itemRes = await ApiClient.getBacklogItemById(
          selectedItem.id,
          activeTenant.id
        );
        if (itemRes.success && itemRes.data) {
          setSelectedItem(itemRes.data);
          setItems((prev) =>
            prev.map((i) => (i.id === selectedItem.id ? itemRes.data! : i))
          );
        }
      }
    } catch {
      showToast("Yorum eklenemedi.");
    }
  };

  const activeSprint = sprints.find((s) => s.status === "Active");
  const planningSprints = sprints.filter((s) => s.status === "Planning");
  const backlogPoolItems = items.filter((i) => !i.sprintId);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Bug":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Story":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Feature":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "Improvement":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400";
      case "High":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400";
      case "Medium":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400";
      default:
        return "text-zinc-500 bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  if (loading && !project) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 w-full animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800/50" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-zinc-400" />
        <h2 className="mt-4 font-bold text-lg text-zinc-800 dark:text-zinc-200">
          Proje Bulunamadı
        </h2>
        <Link
          className="mt-4 font-semibold text-sm text-blue-600 hover:underline"
          href={`/${tenantSlug}/projects`}
        >
          ← Projeler Listesine Dön
        </Link>
      </div>
    );
  }

  return (
    <PageContainer className="space-y-6 pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white text-xs shadow-2xl dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 border-zinc-100 border-b pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link
              className="flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200"
              href={`/${tenantSlug}/projects`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Projeler</span>
            </Link>
            <span>/</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {project.key}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-bold text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {project.name}
            </h1>
            {project.customerName && (
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-semibold text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {project.customerName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 font-medium text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setIsCreateSprintModalOpen(true)}
            type="button"
          >
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Sprint Aç</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 font-medium text-xs text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => setIsCreateEpicModalOpen(true)}
            type="button"
          >
            <Milestone className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Epik Aç</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white text-xs shadow-xs transition hover:bg-blue-700 active:scale-95"
            onClick={() => {
              setCreateItemSprintId(activeSprint?.id || null);
              setIsCreateItemModalOpen(true);
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>İş Maddesi Ekle</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-zinc-200/80 border-b dark:border-zinc-800">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "backlog"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("backlog")}
          type="button"
        >
          <ListTodo className="h-4 w-4" />
          <span>Backlog & Sprint Planlama</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {items.length}
          </span>
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "board"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("board")}
          type="button"
        >
          <Kanban className="h-4 w-4" />
          <span>Aktif Sprint Panosu</span>
          {activeSprint && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-[10px] text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              {activeSprint.name}
            </span>
          )}
        </button>

        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold text-xs transition ${
            activeTab === "epics"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          onClick={() => setActiveTab("epics")}
          type="button"
        >
          <Milestone className="h-4 w-4" />
          <span>Epikler & Yol Haritası</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {epics.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BACKLOG & SPRINT PLANNING */}
      {/* ========================================================= */}
      {activeTab === "backlog" && (
        <div className="space-y-6">
          {/* Active Sprint Section */}
          {activeSprint && (
            <div
              className={`rounded-2xl border p-5 shadow-2xs transition-all ${
                dragOverSprintId === activeSprint.id
                  ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500 dark:bg-emerald-950/40"
                  : "border-emerald-200/80 bg-white dark:border-emerald-900/60 dark:bg-zinc-900/90"
              }`}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverSprintId(null);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverSprintId(activeSprint.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSprintId(null);
                const itemId =
                  e.dataTransfer.getData("text/plain") || draggedItemId;
                if (itemId) {
                  handleAssignToSprint(itemId, activeSprint.id);
                }
                setDraggedItemId(null);
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                        {activeSprint.name}
                      </h3>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Aktif Sprint
                      </span>
                    </div>
                    {activeSprint.goal && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Hedef: {activeSprint.goal}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {activeSprint.startDate
                        ? new Date(activeSprint.startDate).toLocaleDateString(
                            "tr-TR"
                          )
                        : "Başlangıç"}{" "}
                      -{" "}
                      {activeSprint.endDate
                        ? new Date(activeSprint.endDate).toLocaleDateString(
                            "tr-TR"
                          )
                        : "Bitiş"}
                    </span>
                  </div>

                  <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-bold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {items
                      .filter((i) => i.sprintId === activeSprint.id)
                      .reduce((sum, i) => sum + i.storyPoints, 0)}{" "}
                    Puan
                  </span>

                  <button
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 text-xs hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    onClick={() =>
                      handleUpdateSprintStatus(activeSprint.id, "Completed")
                    }
                    type="button"
                  >
                    Sprinti Tamamla
                  </button>
                </div>
              </div>

              {/* Items in Active Sprint */}
              <div className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/30">
                {items
                  .filter((i) => i.sprintId === activeSprint.id)
                  .map((item) => (
                    <div
                      className={`group flex cursor-grab items-center justify-between gap-3 p-3 transition hover:bg-white active:cursor-grabbing dark:hover:bg-zinc-800/80 ${
                        draggedItemId === item.id
                          ? "border-emerald-400 border-dashed opacity-40"
                          : ""
                      }`}
                      draggable
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      onDragEnd={() => {
                        setDraggedItemId(null);
                        setDragOverSprintId(null);
                      }}
                      onDragStart={(e) => {
                        setDraggedItemId(item.id);
                        e.dataTransfer.setData("text/plain", item.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <GripVertical className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
                        <span
                          className={`rounded-md border px-1.5 py-0.5 font-bold text-[10px] ${getTypeBadge(item.type)}`}
                        >
                          {item.type}
                        </span>
                        <span className="font-bold text-xs text-zinc-500 dark:text-zinc-400">
                          {item.itemKey}
                        </span>
                        <span className="truncate font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          {item.title}
                        </span>
                        {item.epicName && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 font-bold text-[10px] text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            {item.epicName}
                          </span>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Assignee Quick Picker */}
                        <Combobox
                          aria-label="Atanan Temsilci"
                          onChange={(value) => {
                            const emp = employees.find((emp) => emp.id === value);
                            handleQuickUpdateItem(item.id, {
                              assignedUserAvatar: emp?.avatarUrl || undefined,
                              assignedUserId: value || undefined,
                              assignedUserName: emp?.fullName || undefined,
                            });
                          }}
                          options={[
                            { label: "Atanmamış", value: "" },
                            ...employees.map((emp) => ({
                              label: emp.fullName,
                              value: emp.id,
                            })),
                          ]}
                          placeholder="Atanmamış"
                          triggerClassName="h-6 px-2 font-medium text-3xs"
                          value={item.assignedUserId || ""}
                        />

                        {/* Story Points Quick Picker */}
                        <SelectField
                          aria-label="Story Points"
                          onChange={(value) =>
                            handleQuickUpdateItem(item.id, {
                              storyPoints: Number(value),
                            })
                          }
                          options={[
                            { label: "0 SP", value: "0" },
                            { label: "1 SP", value: "1" },
                            { label: "2 SP", value: "2" },
                            { label: "3 SP", value: "3" },
                            { label: "5 SP", value: "5" },
                            { label: "8 SP", value: "8" },
                            { label: "13 SP", value: "13" },
                          ]}
                          triggerClassName="h-6 px-2 font-bold text-3xs"
                          value={String(item.storyPoints)}
                        />

                        {/* Priority Quick Picker */}
                        {/* Badge colour is data-driven and encodes priority, so it is
                            carried in triggerClassName rather than dropped with the rest
                            of the surface classes. */}
                        <SelectField
                          aria-label="Öncelik"
                          onChange={(value) =>
                            handleQuickUpdateItem(item.id, {
                              priority: value,
                            })
                          }
                          options={[
                            { label: "Düşük", value: "Low" },
                            { label: "Normal", value: "Medium" },
                            { label: "Yüksek", value: "High" },
                            { label: "Acil", value: "Urgent" },
                          ]}
                          triggerClassName={`h-6 px-2 font-bold text-3xs ${getPriorityBadge(item.priority)}`}
                          value={item.priority}
                        />

                        {/* Status Quick Picker */}
                        <SelectField
                          aria-label="Durum"
                          onChange={(value) => handleMoveStatus(item.id, value)}
                          options={[
                            { label: "To Do", value: "Todo" },
                            { label: "In Progress", value: "InProgress" },
                            { label: "In Review", value: "InReview" },
                            { label: "Done", value: "Done" },
                          ]}
                          triggerClassName="h-6 px-2 font-medium text-3xs"
                          value={item.status}
                        />

                        {/* Delete Button */}
                        <button
                          className="p-1 text-zinc-400 opacity-0 transition hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400"
                          onClick={() => handleDeleteItem(item.id)}
                          title="Sil"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                {items.filter((i) => i.sprintId === activeSprint.id).length ===
                  0 && (
                  <div className="p-4 text-center text-xs text-zinc-400">
                    Bu sprintte henüz iş maddesi yok. Görevleri buraya
                    sürükleyip bırakabilirsiniz.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Planning Sprints */}
          {planningSprints.map((sprint) => {
            const sprintItems = items.filter((i) => i.sprintId === sprint.id);
            const totalPoints = sprintItems.reduce(
              (acc, i) => acc + i.storyPoints,
              0
            );

            return (
              <div
                className={`rounded-2xl border p-5 shadow-2xs transition-all ${
                  dragOverSprintId === sprint.id
                    ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500 dark:bg-blue-950/40"
                    : "border-zinc-200/80 bg-white dark:border-zinc-800/90 dark:bg-zinc-900/90"
                }`}
                key={sprint.id}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverSprintId(null);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverSprintId(sprint.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSprintId(null);
                  const itemId =
                    e.dataTransfer.getData("text/plain") || draggedItemId;
                  if (itemId) {
                    handleAssignToSprint(itemId, sprint.id);
                  }
                  setDraggedItemId(null);
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                        {sprint.name}
                      </h3>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Planlama
                      </span>
                    </div>
                    {sprint.goal && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Hedef: {sprint.goal}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-bold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {totalPoints} Puan ({sprintItems.length} İş)
                    </span>

                    <button
                      className="rounded-xl bg-blue-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95"
                      onClick={() =>
                        handleUpdateSprintStatus(sprint.id, "Active")
                      }
                      type="button"
                    >
                      Sprinti Başlat
                    </button>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/30">
                  {sprintItems.map((item) => (
                    <div
                      className={`group flex cursor-grab items-center justify-between gap-3 p-3 transition hover:bg-white active:cursor-grabbing dark:hover:bg-zinc-800/80 ${
                        draggedItemId === item.id
                          ? "border-blue-400 border-dashed opacity-40"
                          : ""
                      }`}
                      draggable
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      onDragEnd={() => {
                        setDraggedItemId(null);
                        setDragOverSprintId(null);
                      }}
                      onDragStart={(e) => {
                        setDraggedItemId(item.id);
                        e.dataTransfer.setData("text/plain", item.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <GripVertical className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
                        <span
                          className={`rounded-md border px-1.5 py-0.5 font-bold text-[10px] ${getTypeBadge(item.type)}`}
                        >
                          {item.type}
                        </span>
                        <span className="font-bold text-xs text-zinc-500 dark:text-zinc-400">
                          {item.itemKey}
                        </span>
                        <span className="truncate font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          {item.title}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Assignee Quick Picker */}
                        <Combobox
                          aria-label="Atanan Temsilci"
                          onChange={(value) => {
                            const emp = employees.find((emp) => emp.id === value);
                            handleQuickUpdateItem(item.id, {
                              assignedUserAvatar: emp?.avatarUrl || undefined,
                              assignedUserId: value || undefined,
                              assignedUserName: emp?.fullName || undefined,
                            });
                          }}
                          options={[
                            { label: "Atanmamış", value: "" },
                            ...employees.map((emp) => ({
                              label: emp.fullName,
                              value: emp.id,
                            })),
                          ]}
                          placeholder="Atanmamış"
                          triggerClassName="h-6 px-2 font-medium text-3xs"
                          value={item.assignedUserId || ""}
                        />

                        {/* Story Points */}
                        <SelectField
                          aria-label="Story Points"
                          onChange={(value) =>
                            handleQuickUpdateItem(item.id, {
                              storyPoints: Number(value),
                            })
                          }
                          options={[
                            { label: "0 SP", value: "0" },
                            { label: "1 SP", value: "1" },
                            { label: "2 SP", value: "2" },
                            { label: "3 SP", value: "3" },
                            { label: "5 SP", value: "5" },
                            { label: "8 SP", value: "8" },
                            { label: "13 SP", value: "13" },
                          ]}
                          triggerClassName="h-6 px-2 font-bold text-3xs"
                          value={String(item.storyPoints)}
                        />

                        <button
                          className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700"
                          onClick={() => handleAssignToSprint(item.id, null)}
                          title="Backlog'a Taşı"
                          type="button"
                        >
                          Backlog'a Al
                        </button>

                        <button
                          className="p-1 text-zinc-400 opacity-0 transition hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400"
                          onClick={() => handleDeleteItem(item.id)}
                          title="Sil"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {sprintItems.length === 0 && (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      Bu sprint henüz boş. Görevleri buraya sürükleyip
                      bırakabilirsiniz.
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Backlog Pool Section */}
          <div
            className={`rounded-2xl border p-5 shadow-2xs transition-all ${
              dragOverSprintId === "backlog"
                ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500 dark:bg-blue-950/40"
                : "border-zinc-200/80 bg-white dark:border-zinc-800/90 dark:bg-zinc-900/90"
            }`}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverSprintId(null);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverSprintId("backlog");
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverSprintId(null);
              const itemId =
                e.dataTransfer.getData("text/plain") || draggedItemId;
              if (itemId) {
                handleAssignToSprint(itemId, null);
              }
              setDraggedItemId(null);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Backlog Havuzu (Atanmamış İşler)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Sprintlere henüz dahil edilmemiş tüm gereksinimler ve görevler
                  (Buraya sürükleyip bırakabilirsiniz)
                </p>
              </div>

              <span className="rounded-lg bg-zinc-100 px-3 py-1 font-bold text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {backlogPoolItems.length} İş Maddesi
              </span>
            </div>

            <div className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/30">
              {backlogPoolItems.map((item) => (
                <div
                  className={`group flex cursor-grab items-center justify-between gap-3 p-3 transition hover:bg-white active:cursor-grabbing dark:hover:bg-zinc-800/80 ${
                    draggedItemId === item.id
                      ? "border-blue-400 border-dashed opacity-40"
                      : ""
                  }`}
                  draggable
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  onDragEnd={() => {
                    setDraggedItemId(null);
                    setDragOverSprintId(null);
                  }}
                  onDragStart={(e) => {
                    setDraggedItemId(item.id);
                    e.dataTransfer.setData("text/plain", item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <div className="flex items-center gap-3 truncate">
                    <GripVertical className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
                    <span
                      className={`rounded-md border px-1.5 py-0.5 font-bold text-[10px] ${getTypeBadge(item.type)}`}
                    >
                      {item.type}
                    </span>
                    <span className="font-bold text-xs text-zinc-500 dark:text-zinc-400">
                      {item.itemKey}
                    </span>
                    <span className="truncate font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                      {item.title}
                    </span>
                    {item.epicName && (
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 font-bold text-[10px] text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        {item.epicName}
                      </span>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Assignee Quick Picker */}
                    <Combobox
                      aria-label="Atanan Temsilci"
                      onChange={(value) => {
                        const emp = employees.find((emp) => emp.id === value);
                        handleQuickUpdateItem(item.id, {
                          assignedUserAvatar: emp?.avatarUrl || undefined,
                          assignedUserId: value || undefined,
                          assignedUserName: emp?.fullName || undefined,
                        });
                      }}
                      options={[
                        { label: "Atanmamış", value: "" },
                        ...employees.map((emp) => ({
                          label: emp.fullName,
                          value: emp.id,
                        })),
                      ]}
                      placeholder="Atanmamış"
                      triggerClassName="h-6 px-2 font-medium text-3xs"
                      value={item.assignedUserId || ""}
                    />

                    {/* Story Points */}
                    <SelectField
                      aria-label="Story Points"
                      onChange={(value) =>
                        handleQuickUpdateItem(item.id, {
                          storyPoints: Number(value),
                        })
                      }
                      options={[
                        { label: "0 SP", value: "0" },
                        { label: "1 SP", value: "1" },
                        { label: "2 SP", value: "2" },
                        { label: "3 SP", value: "3" },
                        { label: "5 SP", value: "5" },
                        { label: "8 SP", value: "8" },
                        { label: "13 SP", value: "13" },
                      ]}
                      triggerClassName="h-6 px-1.5 font-bold text-3xs"
                      value={String(item.storyPoints)}
                    />

                    {/* Priority */}
                    {/* Badge rengi veriye bağlı ve önceliği kodluyor; yüzey
                        sınıfları gibi düşürülmez (bkz. aynı dosyadaki backlog
                        satırı). */}
                    <SelectField
                      aria-label="Öncelik"
                      onChange={(value) =>
                        handleQuickUpdateItem(item.id, {
                          priority: value,
                        })
                      }
                      options={[
                        { label: "Düşük", value: "Low" },
                        { label: "Normal", value: "Medium" },
                        { label: "Yüksek", value: "High" },
                        { label: "Acil", value: "Urgent" },
                      ]}
                      triggerClassName={`h-6 px-2 font-bold text-3xs ${getPriorityBadge(item.priority)}`}
                      value={item.priority}
                    />

                    {sprints.length > 0 && (
                      <Combobox
                        aria-label="Sprinte Taşı"
                        onChange={(value) =>
                          handleAssignToSprint(item.id, value)
                        }
                        options={[
                          { label: "Sprinte Taşı ▾", value: "" },
                          ...sprints
                            .filter((s) => s.status !== "Completed")
                            .map((s) => ({
                              label: `${s.name} (${
                                s.status === "Active" ? "Aktif" : "Plan"
                              })`,
                              value: s.id,
                            })),
                        ]}
                        placeholder="Sprinte Taşı ▾"
                        triggerClassName="h-6 px-2 font-semibold text-3xs text-blue-600 dark:text-blue-400"
                        value=""
                      />
                    )}

                    <button
                      className="p-1 text-zinc-400 opacity-0 transition hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Sil"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {backlogPoolItems.length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-400">
                  Backlog havuzunda iş bulunmuyor. Yeni bir iş maddesi
                  oluşturabilirsiniz.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ACTIVE SPRINT KANBAN BOARD */}
      {/* ========================================================= */}
      {activeTab === "board" && (
        <div>
          {activeSprint ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {(["Todo", "InProgress", "InReview", "Done"] as const).map(
                (colStatus) => {
                  const colTitle =
                    colStatus === "Todo"
                      ? "Yapılacak (To Do)"
                      : colStatus === "InProgress"
                        ? "İşlemde (In Progress)"
                        : colStatus === "InReview"
                          ? "İncelemede (In Review)"
                          : "Tamamlandı (Done)";

                  const colItems = items.filter(
                    (i) =>
                      i.sprintId === activeSprint.id && i.status === colStatus
                  );

                  const isOver = dragOverColumn === colStatus;

                  return (
                    <div
                      className={`flex min-h-[400px] flex-col rounded-2xl border p-3.5 transition-all ${
                        isOver
                          ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500 dark:border-blue-700 dark:bg-blue-950/40"
                          : "border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800/80 dark:bg-zinc-900/50"
                      }`}
                      key={colStatus}
                      onDragLeave={(e) => {
                        if (
                          !e.currentTarget.contains(e.relatedTarget as Node)
                        ) {
                          setDragOverColumn(null);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverColumn(colStatus);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverColumn(null);
                        const itemId =
                          e.dataTransfer.getData("text/plain") || draggedItemId;
                        if (itemId) {
                          handleMoveStatus(itemId, colStatus);
                        }
                        setDraggedItemId(null);
                      }}
                    >
                      <div className="mb-3 flex items-center justify-between px-1">
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                          {colTitle}
                        </span>
                        <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 font-bold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {colItems.length}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2.5">
                        {colItems.map((item) => {
                          const isDragging = draggedItemId === item.id;

                          return (
                            <div
                              className={`group rounded-xl border bg-white p-3.5 shadow-2xs transition-all dark:bg-zinc-800/90 ${
                                isDragging
                                  ? "scale-95 cursor-grabbing border-blue-500 border-dashed opacity-30 shadow-none"
                                  : "cursor-grab border-zinc-200/80 hover:border-blue-300 hover:shadow-md active:cursor-grabbing dark:border-zinc-800 dark:hover:border-blue-700"
                              }`}
                              draggable
                              key={item.id}
                              onClick={() => setSelectedItem(item)}
                              onDragEnd={() => {
                                setDraggedItemId(null);
                                setDragOverColumn(null);
                              }}
                              onDragStart={(e) => {
                                setDraggedItemId(item.id);
                                e.dataTransfer.setData("text/plain", item.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  <GripVertical className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
                                  <span
                                    className={`rounded-md border px-1.5 py-0.5 font-bold text-[9px] ${getTypeBadge(item.type)}`}
                                  >
                                    {item.type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[10px] text-zinc-400">
                                    {item.itemKey}
                                  </span>
                                  <button
                                    className="p-0.5 text-zinc-400 opacity-0 transition hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(item.id);
                                    }}
                                    title="Sil"
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              <h4 className="mt-2 line-clamp-2 font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                {item.title}
                              </h4>

                              {item.epicName && (
                                <span className="mt-2 inline-block rounded-md bg-purple-50 px-1.5 py-0.5 font-bold text-[9px] text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                  {item.epicName}
                                </span>
                              )}

                              <div
                                className="mt-3 flex items-center justify-between border-zinc-100 border-t pt-2 text-[10px] text-zinc-400 dark:border-zinc-700/60"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Quick Story Points */}
                                <SelectField
                                  aria-label="Story Points"
                                  onChange={(value) =>
                                    handleQuickUpdateItem(item.id, {
                                      storyPoints: Number(value),
                                    })
                                  }
                                  options={[
                                    { label: "0 SP", value: "0" },
                                    { label: "1 SP", value: "1" },
                                    { label: "2 SP", value: "2" },
                                    { label: "3 SP", value: "3" },
                                    { label: "5 SP", value: "5" },
                                    { label: "8 SP", value: "8" },
                                    { label: "13 SP", value: "13" },
                                  ]}
                                  triggerClassName="h-5 px-1.5 font-bold text-3xs"
                                  value={String(item.storyPoints)}
                                />

                                {/* Quick Assignee */}
                                <Combobox
                                  aria-label="Atanan"
                                  onChange={(value) => {
                                    const emp = employees.find((emp) => emp.id === value);
                                    handleQuickUpdateItem(item.id, {
                                      assignedUserAvatar:
                                        emp?.avatarUrl || undefined,
                                      assignedUserId:
                                        value || undefined,
                                      assignedUserName:
                                        emp?.fullName || undefined,
                                    });
                                  }}
                                  options={[
                                    { label: "Atanmamış", value: "" },
                                    ...employees.map((emp) => ({
                                      label: emp.fullName,
                                      value: emp.id,
                                    })),
                                  ]}
                                  placeholder="Atanmamış"
                                  triggerClassName="h-5 max-w-[100px] truncate px-1.5 font-medium text-3xs"
                                  value={item.assignedUserId || ""}
                                />

                                <div className="flex items-center gap-1">
                                  {colStatus !== "Todo" && (
                                    <button
                                      className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const prev =
                                          colStatus === "Done"
                                            ? "InReview"
                                            : colStatus === "InReview"
                                              ? "InProgress"
                                              : "Todo";
                                        handleMoveStatus(item.id, prev);
                                      }}
                                      title="Geri Al"
                                      type="button"
                                    >
                                      ◀
                                    </button>
                                  )}
                                  {colStatus !== "Done" && (
                                    <button
                                      className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const next =
                                          colStatus === "Todo"
                                            ? "InProgress"
                                            : colStatus === "InProgress"
                                              ? "InReview"
                                              : "Done";
                                        handleMoveStatus(item.id, next);
                                      }}
                                      title="İlerlet"
                                      type="button"
                                    >
                                      ▶
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {colItems.length === 0 && (
                          <div className="flex h-32 items-center justify-center rounded-xl border border-zinc-200/80 border-dashed p-6 text-center text-[11px] text-zinc-400 dark:border-zinc-800">
                            Maddeleri buraya sürükleyin
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 border-dashed bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <Layers className="h-10 w-10 text-zinc-400" />
              <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                Aktif Sprint Bulunmuyor
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Backlog planlama sekmesine giderek bir sprinti "Başlat" butonuna
                tıklayarak aktifleştirebilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EPICS ROADMAP */}
      {/* ========================================================= */}
      {activeTab === "epics" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {epics.map((epic) => {
            const progress =
              epic.itemsCount > 0
                ? Math.round((epic.completedItemsCount / epic.itemsCount) * 100)
                : 0;

            return (
              <div
                className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-900/90"
                key={epic.id}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                      <Milestone className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {epic.name}
                      </h3>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {epic.status}
                      </span>
                    </div>
                  </div>
                </div>

                {epic.description && (
                  <p className="mt-3 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {epic.description}
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">
                      Tamamlanma Oranı
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      %{progress} ({epic.completedItemsCount}/{epic.itemsCount})
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-purple-600 transition-all dark:bg-purple-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {epics.length === 0 && (
            <div className="col-span-full rounded-3xl border border-zinc-200 border-dashed bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <Milestone className="mx-auto h-10 w-10 text-zinc-400" />
              <h3 className="mt-3 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                Henüz Epik Oluşturulmamış
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Büyük hedefleri epik olarak tanımlayıp iş maddelerini
                gruplayabilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ITEM DETAIL DRAWER (SLIDE OVER WITH FULL EDIT & DELETE) */}
      {/* ========================================================= */}
      {selectedItem && (
        <Sheet
          onOpenChange={(open) => {
            if (!open) {
              setSelectedItem(null);
            }
          }}
          open
        >
          <SheetContent
            aria-describedby={undefined}
            className="data-[side=right]:w-full max-w-xl overflow-y-auto border-zinc-200 p-6 data-[side=right]:sm:max-w-xl"
            side="right"
          >
            {/* The drawer opens on its type badge and item key, so there is no
                visible heading - Radix still needs an accessible name. */}
            <SheetTitle className="sr-only">
              {selectedItem.itemKey} detayı
            </SheetTitle>
            {/* Header */}
            <div className="flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-0.5 font-bold text-xs ${getTypeBadge(drawerType)}`}
                >
                  {drawerType}
                </span>
                <span className="font-bold text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedItem.itemKey}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-semibold text-rose-700 text-xs hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  title="Sil"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Sil</span>
                </button>

                <SheetClose asChild>
                  <button
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>
            </div>

            <form className="mt-4 space-y-6" onSubmit={handleSaveDrawer}>
              {/* Editable Title */}
              <div className="space-y-1">
                <label className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Başlık
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 font-bold text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setDrawerTitle(e.target.value)}
                  required
                  type="text"
                  value={drawerTitle}
                />
              </div>

              {/* Status, Priority, Story Points, Type Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Durum
                  </label>
                  <SelectField
                    onChange={setDrawerStatus}
                    options={[
                      { label: "Backlog", value: "Backlog" },
                      { label: "To Do", value: "Todo" },
                      { label: "In Progress", value: "InProgress" },
                      { label: "In Review", value: "InReview" },
                      { label: "Done", value: "Done" },
                    ]}
                    value={drawerStatus}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Öncelik
                  </label>
                  <SelectField
                    onChange={setDrawerPriority}
                    options={[
                      { label: "Düşük", value: "Low" },
                      { label: "Normal", value: "Medium" },
                      { label: "Yüksek", value: "High" },
                      { label: "Acil", value: "Urgent" },
                    ]}
                    value={drawerPriority}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Story Points
                  </label>
                  <SelectField
                    onChange={(value) => setDrawerStoryPoints(Number(value))}
                    options={[
                      { label: "0 SP", value: "0" },
                      { label: "1 SP", value: "1" },
                      { label: "2 SP", value: "2" },
                      { label: "3 SP", value: "3" },
                      { label: "5 SP", value: "5" },
                      { label: "8 SP", value: "8" },
                      { label: "13 SP", value: "13" },
                    ]}
                    value={String(drawerStoryPoints)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Tür
                  </label>
                  <SelectField
                    onChange={setDrawerType}
                    options={[
                      { label: "Task", value: "Task" },
                      { label: "Story", value: "Story" },
                      { label: "Bug", value: "Bug" },
                      { label: "Feature", value: "Feature" },
                      { label: "Geliştirme", value: "Improvement" },
                    ]}
                    value={drawerType}
                  />
                </div>
              </div>

              {/* Assignee, Epic, Sprint, Customer Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Atanan Temsilci
                  </label>
                  <Combobox
                    onChange={setDrawerAssigneeId}
                    options={[
                      { label: "Atanmamış", value: "" },
                      ...employees.map((emp) => ({
                        label: emp.fullName,
                        value: emp.id,
                      })),
                    ]}
                    placeholder="Atanmamış"
                    value={drawerAssigneeId}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Epik
                  </label>
                  <Combobox
                    onChange={setDrawerEpicId}
                    options={[
                      { label: "Epiksiz", value: "" },
                      ...epics.map((ep) => ({ label: ep.name, value: ep.id })),
                    ]}
                    placeholder="Epiksiz"
                    value={drawerEpicId}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Sprint
                  </label>
                  <Combobox
                    onChange={setDrawerSprintId}
                    options={[
                      { label: "Backlog Havuzu", value: "" },
                      ...sprints.map((sp) => ({
                        label: `${sp.name} (${
                          sp.status === "Active" ? "Aktif" : sp.status
                        })`,
                        value: sp.id,
                      })),
                    ]}
                    placeholder="Backlog Havuzu"
                    value={drawerSprintId}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Müşteri Bağlantısı
                  </label>
                  <Combobox
                    onChange={setDrawerCustomerId}
                    options={[
                      { label: "İlişkisiz", value: "" },
                      ...customers.map((c) => ({ label: c.name, value: c.id })),
                    ]}
                    placeholder="İlişkisiz"
                    value={drawerCustomerId}
                  />
                </div>
              </div>

              {/* Time Tracking (Estimated vs Logged) & Due Date */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Tahmini Efor (Saat)
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    min={0}
                    onChange={(e) =>
                      setDrawerEstimatedHours(Number(e.target.value))
                    }
                    step="0.5"
                    type="number"
                    value={drawerEstimatedHours}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Harcanan Efor (Saat)
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    min={0}
                    onChange={(e) =>
                      setDrawerLoggedHours(Number(e.target.value))
                    }
                    step="0.5"
                    type="number"
                    value={drawerLoggedHours}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                    Bitiş Tarihi
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setDrawerDueDate(e.target.value)}
                    type="date"
                    value={drawerDueDate}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-medium text-xs text-zinc-700 dark:text-zinc-300">
                  Açıklama & Detaylar
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setDrawerDescription(e.target.value)}
                  placeholder="İş maddesinin detaylı açıklaması..."
                  rows={3}
                  value={drawerDescription}
                />
              </div>

              {/* Acceptance Criteria */}
              <div className="space-y-1">
                <label className="font-medium text-emerald-800 text-xs dark:text-emerald-300">
                  Kabul Kriterleri (Acceptance Criteria)
                </label>
                <textarea
                  className="w-full rounded-xl border border-emerald-200 bg-emerald-50/20 p-2.5 text-xs text-zinc-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-zinc-100"
                  onChange={(e) => setDrawerAcceptance(e.target.value)}
                  placeholder="Hangi koşullar sağlandığında bu iş tamamlanmış sayılacak?"
                  rows={2}
                  value={drawerAcceptance}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white text-xs shadow-xs hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                  disabled={drawerSaving}
                  type="submit"
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {drawerSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </span>
                </button>
              </div>
            </form>

            {/* Subtasks (Checklist) */}
            <div className="mt-8 border-zinc-100 border-t pt-6 dark:border-zinc-800">
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Alt Görevler (
                {selectedItem.subtasks.filter((s) => s.isCompleted).length}/
                {selectedItem.subtasks.length})
              </h4>

              <form className="mt-2 flex gap-2" onSubmit={handleAddSubtask}>
                <input
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Yeni kontrol maddesi yazın..."
                  type="text"
                  value={newSubtaskTitle}
                />
                <button
                  className="rounded-xl bg-zinc-900 px-3 py-1.5 font-bold text-white text-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                  disabled={!newSubtaskTitle.trim()}
                  type="submit"
                >
                  Ekle
                </button>
              </form>

              <div className="mt-3 space-y-1.5">
                {selectedItem.subtasks.map((subtask) => (
                  <div
                    className="flex items-center gap-2 rounded-xl border border-zinc-100 p-2.5 text-xs dark:border-zinc-800"
                    key={subtask.id}
                  >
                    <button
                      className={`flex h-4 w-4 items-center justify-center rounded-md border ${
                        subtask.isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                      onClick={() => handleToggleSubtask(subtask.id)}
                      type="button"
                    >
                      {subtask.isCompleted && (
                        <Check className="h-3 w-3 stroke-[3]" />
                      )}
                    </button>
                    <span
                      className={`flex-1 ${subtask.isCompleted ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Feed */}
            <div className="mt-8 border-zinc-100 border-t pt-6 dark:border-zinc-800">
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                Ekip Yorumları ({selectedItem.comments.length})
              </h4>

              <form className="mt-2 space-y-2" onSubmit={handleAddComment}>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder="Yorum ekle veya not bırak..."
                  rows={2}
                  value={newCommentContent}
                />
                <div className="flex justify-end">
                  <button
                    className="rounded-xl bg-blue-600 px-4 py-1.5 font-bold text-white text-xs hover:bg-blue-700"
                    disabled={!newCommentContent.trim()}
                    type="submit"
                  >
                    Yorum Yap
                  </button>
                </div>
              </form>

              <div className="mt-4 space-y-3">
                {selectedItem.comments.map((c) => (
                  <div
                    className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40"
                    key={c.id}
                  >
                    <div className="flex items-center justify-between font-medium text-[11px] text-zinc-400">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {c.userName}
                      </span>
                      <span>
                        {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE ITEM */}
      {/* ========================================================= */}
      {isCreateItemModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateItemModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-lg"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-4 dark:border-zinc-800">
              <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Yeni İş Maddesi Oluştur
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <form
              className="mt-4 space-y-3.5 text-xs"
              onSubmit={handleCreateItem}
            >
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Başlık *
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="İş maddesi başlığı..."
                  required
                  type="text"
                  value={newItemTitle}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Tür
                  </label>
                  <SelectField
                    onChange={setNewItemType}
                    options={[
                      { label: "Task (Görev)", value: "Task" },
                      { label: "Story (Hikaye)", value: "Story" },
                      { label: "Bug (Hata)", value: "Bug" },
                      { label: "Feature (Özellik)", value: "Feature" },
                      { label: "Geliştirme", value: "Improvement" },
                    ]}
                    value={newItemType}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Öncelik
                  </label>
                  <SelectField
                    onChange={setNewItemPriority}
                    options={[
                      { label: "Düşük", value: "Low" },
                      { label: "Normal", value: "Medium" },
                      { label: "Yüksek", value: "High" },
                      { label: "Acil", value: "Urgent" },
                    ]}
                    value={newItemPriority}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Story Points
                  </label>
                  <SelectField
                    onChange={(value) => setNewItemStoryPoints(Number(value))}
                    options={[
                      { label: "0 (Belirsiz)", value: "0" },
                      { label: "1 SP", value: "1" },
                      { label: "2 SP", value: "2" },
                      { label: "3 SP", value: "3" },
                      { label: "5 SP", value: "5" },
                      { label: "8 SP", value: "8" },
                      { label: "13 SP", value: "13" },
                    ]}
                    value={String(newItemStoryPoints)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Epik
                  </label>
                  <Combobox
                    onChange={setNewItemEpicId}
                    options={[
                      { label: "Epiksiz", value: "" },
                      ...epics.map((ep) => ({ label: ep.name, value: ep.id })),
                    ]}
                    placeholder="Epiksiz"
                    value={newItemEpicId}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Atanan Temsilci
                  </label>
                  <Combobox
                    onChange={setNewItemAssigneeId}
                    options={[
                      { label: "Atanmamış", value: "" },
                      ...employees.map((emp) => ({
                        label: emp.fullName,
                        value: emp.id,
                      })),
                    ]}
                    placeholder="Atanmamış"
                    value={newItemAssigneeId}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Açıklama
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="İşin detayları..."
                  rows={2}
                  value={newItemDescription}
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
                <button
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => setIsCreateItemModalOpen(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={!newItemTitle.trim() || submittingItem}
                  type="submit"
                >
                  {submittingItem ? "Oluşturuluyor..." : "İş Maddesini Kaydet"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE SPRINT */}
      {/* ========================================================= */}
      {isCreateSprintModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateSprintModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Yeni Sprint Başlat / Planla
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <form
              className="mt-4 space-y-3.5 text-xs"
              onSubmit={handleCreateSprint}
            >
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Sprint Adı *
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewSprintName(e.target.value)}
                  placeholder={`Sprint ${sprints.length + 1}`}
                  required
                  type="text"
                  value={newSprintName}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Sprint Hedefi (Goal)
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  placeholder="Bu sprintte neyi başarmayı hedefliyoruz?"
                  rows={2}
                  value={newSprintGoal}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Başlangıç
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setNewSprintStartDate(e.target.value)}
                    type="date"
                    value={newSprintStartDate}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Bitiş
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    onChange={(e) => setNewSprintEndDate(e.target.value)}
                    type="date"
                    value={newSprintEndDate}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
                <button
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => setIsCreateSprintModalOpen(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700"
                  disabled={!newSprintName.trim()}
                  type="submit"
                >
                  Sprint Oluştur
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE EPIC */}
      {/* ========================================================= */}
      {isCreateEpicModalOpen && (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateEpicModalOpen(false);
            }
          }}
          open
        >
          <DialogContent
            aria-describedby={undefined}
            className="max-h-[90vh] w-full overflow-y-auto gap-0 p-6 sm:max-w-md"
            showCloseButton={false}
          >
            <div className="flex items-center justify-between border-zinc-100 border-b pb-3 dark:border-zinc-800">
              <DialogTitle className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Yeni Epik Oluştur
              </DialogTitle>
              <DialogClose asChild>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>

            <form
              className="mt-4 space-y-3.5 text-xs"
              onSubmit={handleCreateEpic}
            >
              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Epik Adı *
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewEpicName(e.target.value)}
                  placeholder="Örn. Kullanıcı Yönetimi & Yetkilendirme"
                  required
                  type="text"
                  value={newEpicName}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Açıklama
                </label>
                <textarea
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  onChange={(e) => setNewEpicDescription(e.target.value)}
                  placeholder="Epik hedefleri ve kapsam..."
                  rows={2}
                  value={newEpicDescription}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Renk Teması
                </label>
                <div className="flex items-center gap-2">
                  {["purple", "blue", "emerald", "amber", "rose"].map((c) => (
                    <button
                      className={`h-7 w-7 rounded-xl border-2 transition ${
                        c === "purple"
                          ? "bg-purple-500"
                          : c === "blue"
                            ? "bg-blue-500"
                            : c === "emerald"
                              ? "bg-emerald-500"
                              : c === "amber"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                      } ${newEpicColor === c ? "scale-110 border-zinc-900 dark:border-white" : "border-transparent opacity-60 hover:opacity-100"}`}
                      key={c}
                      onClick={() => setNewEpicColor(c)}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-zinc-100 border-t pt-3 dark:border-zinc-800">
                <button
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => setIsCreateEpicModalOpen(false)}
                  type="button"
                >
                  İptal
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700"
                  disabled={!newEpicName.trim()}
                  type="submit"
                >
                  Epik Oluştur
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
    </PageContainer>
  );
}
