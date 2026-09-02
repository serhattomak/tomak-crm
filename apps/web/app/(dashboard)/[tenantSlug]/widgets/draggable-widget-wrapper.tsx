/* Hallmark · genre: modern-minimal · theme: Adaptive Zinc/Violet · design-system: design.md */
"use client";

import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  GripVertical,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface DraggableWidgetWrapperProps {
  children: React.ReactNode;
  dropPosition: "before" | "after" | null;
  isDragging: boolean;
  isDragOver: boolean;
  isFirst: boolean;
  isLast: boolean;
  onDragEnd: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onHide: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  spanClass: string;
  widgetId: string;
  widgetTitle?: string;
}

export function DraggableWidgetWrapper({
  children,
  dropPosition,
  isDragOver,
  isDragging,
  isFirst,
  isLast,
  onDragEnd,
  onDragLeave,
  onDragOver,
  onDragStart,
  onDrop,
  onHide,
  onMoveDown,
  onMoveUp,
  spanClass,
  widgetId,
  widgetTitle,
}: DraggableWidgetWrapperProps) {
  const [isHandleHovered, setIsHandleHovered] = useState(false);

  return (
    <div
      className={`${spanClass} group/widget relative transition-all duration-150 ${
        isDragging ? "scale-[0.98] opacity-30" : ""
      }`}
      onDragLeave={(e) => onDragLeave(e, widgetId)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(e, widgetId);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, widgetId);
      }}
    >
      {/* Drop Indicator (Before target) */}
      {isDragOver && dropPosition === "before" && !isDragging && (
        <div className="fade-in zoom-in-95 mb-3 flex h-14 w-full animate-in items-center justify-center gap-2 rounded-2xl border-2 border-violet-500 border-dashed bg-violet-50/80 font-bold text-violet-700 text-xs shadow-xs duration-150 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-200">
          <Sparkles className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400" />
          <span>
            {widgetTitle ? `"${widgetTitle}" öncesine taşı` : "Buraya Bırak"}
          </span>
        </div>
      )}

      {/* Widget Card Container */}
      <div
        className={`relative h-full transition-all duration-150 ${
          isHandleHovered ? "rounded-2xl ring-2 ring-violet-500/50" : ""
        }`}
      >
        {/* Centered Floating Micro-Toolbar (Never covers top-left title or top-right buttons) */}
        <div className="pointer-events-auto absolute -top-3.5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-200 bg-white/95 px-2 py-0.5 opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/widget:opacity-100 dark:border-zinc-700 dark:bg-zinc-800/95">
          {/* Drag Handle */}
          <div
            className="flex cursor-grab select-none items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[11px] text-zinc-600 hover:text-violet-600 active:cursor-grabbing dark:text-zinc-300 dark:hover:text-violet-300"
            draggable={true}
            onDragEnd={onDragEnd}
            onDragStart={(e) => {
              e.stopPropagation();
              onDragStart(e, widgetId);
            }}
            onMouseEnter={() => setIsHandleHovered(true)}
            onMouseLeave={() => setIsHandleHovered(false)}
            title="Tut ve Sürükle"
          >
            <GripVertical className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Taşı</span>
          </div>

          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Move Up */}
          <button
            className="rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            title="Yukarı Taşı"
            type="button"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>

          {/* Move Down */}
          <button
            className="rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            title="Aşağı Taşı"
            type="button"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Hide Widget */}
          <button
            className="rounded-full p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
            title="Bu Sekmede Gizle"
            type="button"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Inner Content */}
        {children}
      </div>

      {/* Drop Indicator (After target) */}
      {isDragOver && dropPosition === "after" && !isDragging && (
        <div className="fade-in zoom-in-95 mt-3 flex h-14 w-full animate-in items-center justify-center gap-2 rounded-2xl border-2 border-violet-500 border-dashed bg-violet-50/80 font-bold text-violet-700 text-xs shadow-xs duration-150 dark:border-violet-400 dark:bg-violet-950/50 dark:text-violet-200">
          <Sparkles className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400" />
          <span>
            {widgetTitle ? `"${widgetTitle}" sonrasına taşı` : "Buraya Bırak"}
          </span>
        </div>
      )}
    </div>
  );
}
