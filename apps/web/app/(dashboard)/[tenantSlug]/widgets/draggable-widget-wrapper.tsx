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
        <div className="fade-in zoom-in-95 mb-3 flex h-14 w-full animate-in items-center justify-center gap-2 rounded-lg border-2 border-primary border-dashed bg-primary/10 font-bold text-primary text-xs shadow-xs duration-150">
          <Sparkles className="h-4 w-4 animate-spin text-primary" />
          <span>
            {widgetTitle ? `"${widgetTitle}" öncesine taşı` : "Buraya Bırak"}
          </span>
        </div>
      )}

      {/* Widget Card Container */}
      <div
        className={`relative h-full transition-all duration-150 ${
          isHandleHovered ? "rounded-lg ring-2 ring-primary/40" : ""
        }`}
      >
        {/* Centered Floating Micro-Toolbar (Never covers top-left title or top-right buttons) */}
        <div className="pointer-events-auto absolute -top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/80 bg-background/95 px-2 py-0.5 opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/widget:opacity-100">
          {/* Drag Handle */}
          <div
            className="flex cursor-grab select-none items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[11px] text-muted-foreground hover:text-foreground active:cursor-grabbing"
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
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>Taşı</span>
          </div>

          <div className="h-3 w-px bg-border" />

          {/* Move Up */}
          <button
            className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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
            className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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

          <div className="h-3 w-px bg-border" />

          {/* Hide Widget */}
          <button
            className="rounded-full p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
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
        <div className="fade-in zoom-in-95 mt-3 flex h-14 w-full animate-in items-center justify-center gap-2 rounded-lg border-2 border-primary border-dashed bg-primary/10 font-bold text-primary text-xs shadow-xs duration-150">
          <Sparkles className="h-4 w-4 animate-spin text-primary" />
          <span>
            {widgetTitle ? `"${widgetTitle}" sonrasına taşı` : "Buraya Bırak"}
          </span>
        </div>
      )}
    </div>
  );
}
