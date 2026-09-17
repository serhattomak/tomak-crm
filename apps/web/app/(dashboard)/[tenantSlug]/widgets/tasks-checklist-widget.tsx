"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { SelectField } from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Check, CheckSquare, Clock, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiClient, type CrmTaskDto } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

type FilterTab = "all" | "pending" | "completed";

export function TasksChecklistWidget() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "workspace";
  const { activeTenant } = usePermissions();

  const [tasks, setTasks] = useState<CrmTaskDto[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!activeTenant) {
      return;
    }
    try {
      const res = await ApiClient.getTasks({ pageSize: 50 }, activeTenant.id);
      if (res.success && res.data) {
        setTasks(res.data.items);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoaded(true);
    }
  }, [activeTenant]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completedAt: nextStatus ? new Date().toISOString() : undefined,
              isCompleted: nextStatus,
              status: nextStatus ? "Completed" : "Pending",
            }
          : t
      )
    );

    if (activeTenant) {
      try {
        await ApiClient.toggleTaskStatus(taskId, nextStatus, activeTenant.id);
      } catch {
        // Rollback on failure
        loadTasks();
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    // Optimistic UI update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    if (activeTenant) {
      try {
        await ApiClient.deleteTask(taskId, activeTenant.id);
      } catch {
        // Rollback on failure
        loadTasks();
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newTaskTitle.trim() && activeTenant) || submitting) {
      return;
    }

    setSubmitting(true);
    const title = newTaskTitle.trim();

    try {
      const res = await ApiClient.createTask(
        {
          category: "Genel",
          priority: newTaskPriority,
          title,
        },
        activeTenant.id
      );

      if (res.success) {
        setNewTaskTitle("");
        loadTasks();
      }
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPct =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "pending") {
      return !t.isCompleted;
    }
    if (activeFilter === "completed") {
      return t.isCompleted;
    }
    return true;
  });

  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "destructive" as const;
      case "high":
        return "warning" as const;
      case "medium":
        return "accent" as const;
      default:
        return "neutral" as const;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "Acil";
      case "high":
        return "Yüksek";
      case "medium":
        return "Normal";
      default:
        return "Düşük";
    }
  };

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-semibold text-sm tracking-tight">
                Görevler & Checklist
              </CardTitle>
              <p className="text-2xs text-muted-foreground">
                {tasks.length > 0
                  ? `${tasks.length} görevden ${completedCount} tanesi tamamlandı (%${progressPct})`
                  : "Kişisel ve ekip içi yapılacak işler"}
              </p>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-250"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Quick Add Task Input with Priority Selector */}
          <form
            className="mb-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={handleAddTask}
          >
            <div className="relative flex flex-1 items-center">
              <input
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-foreground text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Yeni görev başlığı yazın..."
                type="text"
                value={newTaskTitle}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <SelectField
                onChange={(value) =>
                  setNewTaskPriority(
                    value as "low" | "medium" | "high" | "urgent"
                  )
                }
                options={[
                  { label: "Normal", value: "medium" },
                  { label: "Yüksek", value: "high" },
                  { label: "Acil", value: "urgent" },
                  { label: "Düşük", value: "low" },
                ]}
                triggerClassName="h-7 px-2 font-medium text-2xs"
                value={newTaskPriority}
              />

              <Button
                className="h-8 gap-1 px-3 text-xs"
                disabled={!newTaskTitle.trim() || submitting}
                size="sm"
                type="submit"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{submitting ? "..." : "Ekle"}</span>
              </Button>
            </div>
          </form>

          {/* Filter Pills */}
          <div className="mb-2.5 flex items-center gap-1">
            <Button
              className="h-6 px-2 font-semibold text-3xs"
              onClick={() => setActiveFilter("all")}
              size="sm"
              type="button"
              variant={activeFilter === "all" ? "default" : "outline"}
            >
              Tümü ({tasks.length})
            </Button>
            <Button
              className="h-6 px-2 font-semibold text-3xs"
              onClick={() => setActiveFilter("pending")}
              size="sm"
              type="button"
              variant={activeFilter === "pending" ? "default" : "outline"}
            >
              Bekleyen ({tasks.length - completedCount})
            </Button>
            <Button
              className="h-6 px-2 font-semibold text-3xs"
              onClick={() => setActiveFilter("completed")}
              size="sm"
              type="button"
              variant={activeFilter === "completed" ? "default" : "outline"}
            >
              Tamamlanan ({completedCount})
            </Button>
          </div>

          {/* Task Items List */}
          {isLoaded ? (
            filteredTasks.length === 0 ? (
              <EmptyState
                description="Yukarıdaki alana bir görev yazarak listenizi oluşturabilirsiniz."
                icon={CheckSquare}
                title={
                  activeFilter === "completed"
                    ? "Tamamlanan görev bulunmuyor"
                    : activeFilter === "pending"
                      ? "Bekleyen tüm görevler tamamlandı! 🎉"
                      : "Henüz planlanan görev bulunmuyor"
                }
              />
            ) : (
              <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                {filteredTasks.map((task) => (
                  <div
                    className={`group flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-all ${task.isCompleted ? "border-border/50 bg-muted/30 opacity-60" : "border-border/80 bg-card hover:border-border hover:bg-muted/40"}`}
                    key={task.id}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <button
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${task.isCompleted ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background hover:border-emerald-500"}`}
                        onClick={() => toggleTask(task.id, task.isCompleted)}
                        type="button"
                      >
                        {task.isCompleted && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>

                      <div className="space-y-0.5 truncate">
                        <p
                          className={`truncate font-semibold text-foreground text-xs ${
                            task.isCompleted
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 font-medium text-3xs text-muted-foreground">
                          {task.dueDate ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString(
                                "tr-TR"
                              )}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Bugün
                            </span>
                          )}
                          {task.customerName && (
                            <span className="truncate text-primary">
                              • {task.customerName}
                            </span>
                          )}
                          {task.category && (
                            <Badge
                              className="px-1 py-0 text-3xs"
                              variant="neutral"
                            >
                              {task.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-none items-center gap-1.5">
                      <Badge
                        className="px-1.5 py-0 text-3xs"
                        variant={getPriorityVariant(task.priority)}
                      >
                        {getPriorityLabel(task.priority)}
                      </Badge>
                      <button
                        className="p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                        onClick={() => deleteTask(task.id)}
                        title="Sil"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
        </CardContent>
      </div>

      {tasks.length > 0 && (
        <CardFooter className="flex items-center justify-between border-border/80 border-t pt-2 pb-3 text-muted-foreground text-xs">
          <span>
            Kalan acil:{" "}
            <strong className="text-foreground">
              {
                tasks.filter(
                  (t) => !t.isCompleted && t.priority.toLowerCase() === "urgent"
                ).length
              }
            </strong>
          </span>
          <Button
            className="h-6 p-0 text-emerald-700 text-xs hover:text-emerald-700 dark:text-emerald-400"
            onClick={async () => {
              const completedTasks = tasks.filter((t) => t.isCompleted);
              for (const t of completedTasks) {
                deleteTask(t.id);
              }
            }}
            type="button"
            variant="ghost"
          >
            Tamamlananları Temizle
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
