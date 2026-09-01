/* Hallmark · component: tasks-checklist · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Check, CheckSquare, Clock, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TaskItem } from "./dashboard-types";

export function TasksChecklistWidget() {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) || "workspace";
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`crm_tasks_${tenantSlug}`);
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, [tenantSlug]);

  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(`crm_tasks_${tenantSlug}`, JSON.stringify(newTasks));
    } catch {
      // ignore
    }
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      return;
    }

    const newTask: TaskItem = {
      category: "Genel",
      completed: false,
      dueDate: "Bugün",
      id: `t-${Date.now()}`,
      priority: "medium",
      title: newTaskTitle.trim(),
    };

    saveTasks([newTask, ...tasks]);
    setNewTaskTitle("");
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getPriorityBadge = (priority: TaskItem["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "high":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "medium":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      default:
        return "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    }
  };

  const getPriorityLabel = (priority: TaskItem["priority"]) => {
    switch (priority) {
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
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:hover:border-zinc-700">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Görevler & Checklist
              </span>
              <div className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                {tasks.length > 0
                  ? `${tasks.length} görevden ${completedCount} tanesi tamamlandı (%${progressPct})`
                  : "Kişisel ve ekip içi yapılacak işler"}
              </div>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300 dark:bg-emerald-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Quick Add Task Input */}
        <form className="mb-3 flex gap-2" onSubmit={handleAddTask}>
          <input
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs transition placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-800 dark:placeholder:text-zinc-500"
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Hızlı yeni görev yaz ve Enter'a bas..."
            type="text"
            value={newTaskTitle}
          />
          <button
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white text-xs shadow-xs transition-colors hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            disabled={!newTaskTitle.trim()}
            type="submit"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ekle</span>
          </button>
        </form>

        {/* Task Items List */}
        {isLoaded ? (
          tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-7 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 shadow-2xs dark:bg-zinc-800 dark:text-zinc-500">
                <CheckSquare className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                Henüz planlanan görev bulunmuyor
              </h4>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                Yukarıdaki alana bir görev yazarak listenizi oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div
                  className={`group flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all ${
                    task.completed
                      ? "border-zinc-100 bg-zinc-50/60 opacity-60 dark:border-zinc-800/60 dark:bg-zinc-800/30"
                      : "border-zinc-200/80 bg-white shadow-2xs hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:border-zinc-700"
                  }`}
                  key={task.id}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <button
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        task.completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-zinc-300 bg-white hover:border-emerald-500 dark:border-zinc-600 dark:bg-zinc-700"
                      }`}
                      onClick={() => toggleTask(task.id)}
                      type="button"
                    >
                      {task.completed && (
                        <Check className="h-3 w-3 stroke-[3]" />
                      )}
                    </button>

                    <div className="space-y-0.5 truncate">
                      <p
                        className={`truncate font-semibold text-xs text-zinc-800 dark:text-zinc-200 ${
                          task.completed
                            ? "text-zinc-400 line-through dark:text-zinc-500"
                            : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 font-medium text-[10px] text-zinc-400 dark:text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.dueDate}
                        </span>
                        {task.category && (
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-bold text-[9px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-none items-center gap-1.5">
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-0.5 font-bold text-[9px] ${getPriorityBadge(
                        task.priority
                      )}`}
                    >
                      {getPriorityLabel(task.priority)}
                    </span>
                    <button
                      className="p-1 text-zinc-400 opacity-0 transition hover:text-rose-600 group-hover:opacity-100 dark:hover:text-rose-400"
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
          <div className="space-y-2 py-3">
            {[1, 2].map((i) => (
              <div
                className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                key={i}
              />
            ))}
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-zinc-100 border-t pt-2.5 font-medium text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
          <span>
            Kalan acil:{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {
                tasks.filter((t) => !t.completed && t.priority === "urgent")
                  .length
              }
            </strong>
          </span>
          <button
            className="font-bold text-emerald-600 transition hover:text-emerald-700 dark:hover:text-emerald-400"
            onClick={() => saveTasks(tasks.filter((t) => !t.completed))}
            type="button"
          >
            Tamamlananları Temizle
          </button>
        </div>
      )}
    </div>
  );
}
