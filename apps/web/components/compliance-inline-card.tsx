/* Hallmark · component: compliance-inline-card · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Coffee,
  FileCheck,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { ComplianceValidationResultDto } from "@/lib/api-client";

export interface ComplianceMetrics {
  netWorkHours?: number;
  nightWorkHours?: number;
  projectedWeeklyHours?: number;
  providedBreakMinutes?: number;
  requiredBreakMinutes?: number;
  totalDurationHours?: number;
  weeklyTotalHours?: number;
}

interface ComplianceInlineCardProps {
  allowOverride?: boolean;
  className?: string;
  isOverridden?: boolean;
  metrics?: ComplianceMetrics;
  onOverrideChange?: (overridden: boolean, reason: string) => void;
  overrideReason?: string;
  validationResult: ComplianceValidationResultDto | null;
}

export function ComplianceInlineCard({
  validationResult,
  metrics,
  allowOverride = true,
  isOverridden = false,
  overrideReason = "",
  onOverrideChange,
  className = "",
}: ComplianceInlineCardProps) {
  const [localReason, setLocalReason] = useState(overrideReason);
  const [localChecked, setLocalChecked] = useState(isOverridden);

  const handleToggle = (checked: boolean) => {
    setLocalChecked(checked);
    onOverrideChange?.(checked, localReason);
  };

  const handleReasonChange = (reason: string) => {
    setLocalReason(reason);
    onOverrideChange?.(localChecked, reason);
  };

  if (!(validationResult || metrics)) {
    return null;
  }

  const isCompliant = validationResult?.isCompliant ?? true;
  const hasHardBlock = validationResult?.hasHardBlock ?? false;
  const violations = validationResult?.violations ?? [];

  return (
    <div
      className={`overflow-hidden rounded-2xl border text-xs transition-all ${
        hasHardBlock
          ? "border-red-200 bg-red-50/70 text-red-950 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          : isCompliant
            ? "border-emerald-200/80 bg-emerald-50/50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
            : "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
      } ${className}`}
    >
      {/* 1. Header Bar */}
      <div
        className={`flex items-center justify-between border-b px-3.5 py-2.5 ${
          hasHardBlock
            ? "border-red-100 bg-red-100/50 dark:border-red-900/40 dark:bg-red-900/30"
            : isCompliant
              ? "border-emerald-100/70 bg-emerald-100/30 dark:border-emerald-900/40 dark:bg-emerald-900/20"
              : "border-amber-100 bg-amber-100/50 dark:border-amber-900/40 dark:bg-amber-900/30"
        }`}
      >
        <div className="flex items-center gap-2 font-bold">
          {hasHardBlock ? (
            <AlertOctagon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          ) : isCompliant ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span className="text-2xs uppercase tracking-wider">
            {hasHardBlock
              ? "🚨 YASAL ENGEL (HARD BLOCK) - KAYIT ENGELLENDİ"
              : isCompliant
                ? "🛡️ T.C. ÇALIŞMA MEVZUATINA TAM UYUMLU"
                : "⚠️ MEVZUAT UYARISI (SOFT WARNING)"}
          </span>
        </div>

        <span className="flex items-center gap-1 font-mono font-semibold text-3xs opacity-80">
          <Scale className="h-3 w-3" /> 4857 / 6331 SK.
        </span>
      </div>

      <div className="space-y-3 p-3.5">
        {/* 2. Optional Metrics Micro-Chips */}
        {metrics && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {metrics.netWorkHours !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-white/90 px-2.5 py-1 font-semibold text-2xs text-zinc-700 shadow-2xs dark:bg-zinc-800 dark:text-zinc-200">
                <Clock className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                Net Çalışma:{" "}
                <strong>{metrics.netWorkHours.toFixed(1)} saat</strong>
              </span>
            )}

            {metrics.providedBreakMinutes !== undefined && (
              <span
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-semibold text-2xs shadow-2xs ${ metrics.requiredBreakMinutes && metrics.providedBreakMinutes < metrics.requiredBreakMinutes ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "border-border bg-white/90 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" }`}
              >
                <Coffee className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                Mola: <strong>{metrics.providedBreakMinutes} dk</strong>
                {metrics.requiredBreakMinutes && (
                  <span className="text-3xs opacity-75">
                    (Yasal Asgari: {metrics.requiredBreakMinutes} dk)
                  </span>
                )}
              </span>
            )}

            {metrics.nightWorkHours !== undefined &&
              metrics.nightWorkHours > 0 && (
                <span
                  className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-semibold text-2xs shadow-2xs ${
                    metrics.nightWorkHours > 7.5
                      ? "border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
                      : "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                  }`}
                >
                  Gece Dönemi:{" "}
                  <strong>{metrics.nightWorkHours.toFixed(1)} saat</strong>
                  {metrics.nightWorkHours > 7.5 && " (Sınır: 7.5s)"}
                </span>
              )}

            {metrics.projectedWeeklyHours !== undefined && (
              <span
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-semibold text-2xs shadow-2xs ${ metrics.projectedWeeklyHours > 45 ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "border-border bg-white/90 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" }`}
              >
                Haftalık Toplam:{" "}
                <strong>{metrics.projectedWeeklyHours.toFixed(1)} saat</strong>
                {metrics.projectedWeeklyHours > 45 && " (Fazla Mesai)"}
              </span>
            )}
          </div>
        )}

        {/* 3. Compliant State Content */}
        {isCompliant && (
          <p className="font-medium text-2xs text-emerald-800 leading-relaxed dark:text-emerald-300">
            Girdiğiniz süreler günlük 11 saat, gece 7.5 saat ve yasal asgari ara
            dinlenme baremlerine tam uygundur.
          </p>
        )}

        {/* 4. Violations List */}
        {!isCompliant && violations.length > 0 && (
          <div className="space-y-2">
            {violations.map((v, i) => (
              <div
                className="space-y-1 rounded-xl border border-border bg-white/95 p-2.5 shadow-2xs dark:bg-zinc-900"
                key={i}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded border border-amber-200 bg-amber-100/90 px-1.5 py-0.5 font-bold font-mono text-3xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    {v.lawReference}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold text-3xs ${
                      v.enforcementLevel === "HardBlock"
                        ? "bg-red-600 text-white dark:bg-red-500"
                        : "bg-amber-700 text-white"
                    }`}
                  >
                    {v.enforcementLevel === "HardBlock"
                      ? "Engellendi"
                      : "Uyarı"}
                  </span>
                </div>
                <h6 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  {v.ruleName}
                </h6>
                <p className="text-2xs text-zinc-600 leading-relaxed dark:text-zinc-400">
                  {v.details}
                </p>
                {v.penaltyRisk && (
                  <div className="flex items-center gap-1 pt-0.5 font-semibold text-3xs text-red-700 dark:text-red-400">
                    <span>🚨 Yaptırım Riski:</span>
                    <span className="opacity-90">{v.penaltyRisk}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 5. Manager Exception / Override Control (For Soft Warnings) */}
        {!(isCompliant || hasHardBlock) && allowOverride && (
          <div className="space-y-2 border-amber-200/80 border-t pt-2 dark:border-amber-900/60">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                checked={localChecked}
                className="h-4 w-4 rounded border-amber-300 dark:border-amber-700 text-amber-600 focus:ring-amber-500"
                onChange={(e) => handleToggle(e.target.checked)}
                type="checkbox"
              />
              <span className="flex items-center gap-1 font-bold text-2xs text-zinc-800 dark:text-zinc-200">
                <FileCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Yönetici İstisnası / Fazla Mesai Onayı ile Devam Et
              </span>
            </label>

            {localChecked && (
              <div className="fade-in slide-in-from-top-1 animate-in space-y-1">
                <input
                  className="w-full rounded-lg border border-amber-300 bg-card px-2.5 py-1.5 text-xs text-zinc-800 placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  onChange={(e) => handleReasonChange(e.target.value)}
                  placeholder="Gerekçe giriniz (Örn: Acil operasyonel ihtiyaç ve personel onayı)"
                  type="text"
                  value={localReason}
                />
                <span className="block text-3xs text-zinc-500 dark:text-zinc-400">
                  * Bu gerekçe denetim kütüğüne yönetici onaylı istisna olarak
                  kaydedilecektir.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
