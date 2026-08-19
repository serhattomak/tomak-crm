"use client";

import { Check, CheckSquare, Clock, Plus } from "lucide-react";
import { useState } from "react";
import type { TaskItem } from "./dashboard-types";

export function TasksChecklistWidget() {
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: "t-1",
      title: "Acme Holding teklif revizyonunu gönder",
      dueDate: "Bugün 14:00",
      priority: "urgent",
      completed: false,
      category: "Teklif",
    },
    {
      id: "t-2",
      title: "TechNova CTO'su ile demo toplantısı yap",
      dueDate: "Bugün 16:30",
      priority: "high",
      completed: false,
      category: "Görüşme",
    },
    {
      id: "t-3",
      title: "Haftalık satış raporunu yönetim kuruluna ilet",
      dueDate: "Yarın 10:00",
      priority: "medium",
      completed: true,
      category: "Rapor",
    },
    {
      id: "t-4",
      title: "Vortex Lojistik sözleşme taslağını hukuk birimine gönder",
      dueDate: "22 Ağu",
      priority: "high",
      completed: false,
      category: "Hukuk",
    },
    {
      id: "t-5",
      title: "Yeni gelen 12 web lead'ini satış temsilcilerine ata",
      dueDate: "Bugün 18:00",
      priority: "urgent",
      completed: false,
      category: "Lead",
    },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState("");

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: "Bugün",
      priority: "medium",
      completed: false,
      category: "Genel",
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle("");
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct = Math.round((completedCount / tasks.length) * 100) || 0;

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
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Görevler & Checklist</span>
              <div className="text-[11px] text-slate-500">
                {tasks.length} görevden {completedCount} tanesi tamamlandı (%{progressPct})
              </div>
            </div>
          </div>

          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Quick Add Task Input */}
        <form className="mb-4 flex gap-2" onSubmit={handleAddTask}>
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Hızlı yeni görev yaz ve Enter'a bas..."
            type="text"
            value={newTaskTitle}
          />
          <button
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 font-medium text-white text-xs shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
            disabled={!newTaskTitle.trim()}
            type="submit"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ekle</span>
          </button>
        </form>

        {/* Task Items List */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                task.completed
                  ? "border-slate-100 bg-slate-50/60 opacity-60"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              }`}
              key={task.id}
            >
              <div className="flex items-center gap-3">
                <button
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                    task.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white hover:border-emerald-500"
                  }`}
                  onClick={() => toggleTask(task.id)}
                  type="button"
                >
                  {task.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </button>

                <div className="space-y-0.5">
                  <p
                    className={`font-medium text-xs text-slate-800 ${
                      task.completed ? "text-slate-400 line-through" : ""
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.dueDate}
                    </span>
                    {task.category && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-slate-600 font-medium">
                        {task.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-md border px-1.5 py-0.5 font-semibold text-[10px] ${getPriorityBadge(
                  task.priority
                )}`}
              >
                {getPriorityLabel(task.priority)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-slate-100 border-t pt-3 text-xs text-slate-500">
        <span>Kalan acil görevler: {tasks.filter((t) => !t.completed && t.priority === "urgent").length}</span>
        <button
          className="font-semibold text-emerald-600 hover:text-emerald-700"
          onClick={() => setTasks((prev) => prev.filter((t) => !t.completed))}
          type="button"
        >
          Tamamlananları Temizle
        </button>
      </div>
    </div>
  );
}
