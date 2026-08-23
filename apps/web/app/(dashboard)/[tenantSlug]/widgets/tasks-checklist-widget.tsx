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
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "high":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "medium":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
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
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Görevler & Checklist
              </span>
              <div className="font-medium text-[11px] text-slate-500">
                {tasks.length > 0
                  ? `${tasks.length} görevden ${completedCount} tanesi tamamlandı (%${progressPct})`
                  : "Kişisel ve ekip içi yapılacak işler"}
              </div>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Quick Add Task Input */}
        <form className="mb-4 flex gap-2" onSubmit={handleAddTask}>
          <input
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2 text-xs transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Hızlı yeni görev yaz ve Enter'a bas..."
            type="text"
            value={newTaskTitle}
          />
          <button
            className="flex items-center gap-1 rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white text-xs shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 shadow-2xs">
                <CheckSquare className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs">
                Henüz planlanan görev bulunmuyor
              </h4>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Yukarıdaki alana bir görev yazarak listenizi oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div
                  className={`group flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all ${
                    task.completed
                      ? "border-slate-100 bg-slate-50/60 opacity-60"
                      : "border-slate-200/80 bg-white shadow-2xs hover:border-slate-300"
                  }`}
                  key={task.id}
                >
                  <div className="flex items-center gap-3 truncate">
                    <button
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                        task.completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white hover:border-emerald-500"
                      }`}
                      onClick={() => toggleTask(task.id)}
                      type="button"
                    >
                      {task.completed && (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      )}
                    </button>

                    <div className="space-y-0.5 truncate">
                      <p
                        className={`truncate font-semibold text-slate-800 text-xs ${
                          task.completed ? "text-slate-400 line-through" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 font-medium text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.dueDate}
                        </span>
                        {task.category && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-[9px] text-slate-600">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-none items-center gap-2">
                    <span
                      className={`shrink-0 rounded-lg border px-2 py-0.5 font-bold text-[10px] ${getPriorityBadge(
                        task.priority
                      )}`}
                    >
                      {getPriorityLabel(task.priority)}
                    </span>
                    <button
                      className="p-1 text-slate-400 opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
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
                className="h-10 w-full animate-pulse rounded-2xl bg-slate-50"
                key={i}
              />
            ))}
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-slate-100 border-t pt-3 font-medium text-slate-500 text-xs">
          <span>
            Kalan acil görevler:{" "}
            <strong className="text-slate-800">
              {
                tasks.filter((t) => !t.completed && t.priority === "urgent")
                  .length
              }
            </strong>
          </span>
          <button
            className="font-bold text-emerald-600 transition hover:text-emerald-700"
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
