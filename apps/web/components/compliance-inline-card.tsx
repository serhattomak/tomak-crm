/* Hallmark · component: compliance-inline-card · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import React, { useState } from "react";
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Lock,
  Unlock,
  Clock,
  Coffee,
  Info,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import type { ComplianceValidationResultDto } from "@/lib/api-client";

export interface ComplianceMetrics {
  totalDurationHours?: number;
  netWorkHours?: number;
  nightWorkHours?: number;
  providedBreakMinutes?: number;
  requiredBreakMinutes?: number;
  weeklyTotalHours?: number;
  projectedWeeklyHours?: number;
}

interface ComplianceInlineCardProps {
  validationResult: ComplianceValidationResultDto | null;
  metrics?: ComplianceMetrics;
  allowOverride?: boolean;
  isOverridden?: boolean;
  overrideReason?: string;
  onOverrideChange?: (overridden: boolean, reason: string) => void;
  className?: string;
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

  if (!validationResult && !metrics) {
    return null;
  }

  const isCompliant = validationResult?.isCompliant ?? true;
  const hasHardBlock = validationResult?.hasHardBlock ?? false;
  const violations = validationResult?.violations ?? [];

  return (
    <div
      className={`rounded-2xl border transition-all text-xs overflow-hidden ${
        hasHardBlock
          ? "bg-red-50/70 border-red-200 text-red-950 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-200"
          : !isCompliant
          ? "bg-amber-50/70 border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200"
          : "bg-emerald-50/50 border-emerald-200/80 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-200"
      } ${className}`}
    >
      {/* 1. Header Bar */}
      <div
        className={`px-3.5 py-2.5 flex items-center justify-between border-b ${
          hasHardBlock
            ? "border-red-100 bg-red-100/50 dark:border-red-900/40 dark:bg-red-900/30"
            : !isCompliant
            ? "border-amber-100 bg-amber-100/50 dark:border-amber-900/40 dark:bg-amber-900/30"
            : "border-emerald-100/70 bg-emerald-100/30 dark:border-emerald-900/40 dark:bg-emerald-900/20"
        }`}
      >
        <div className="flex items-center gap-2 font-bold">
          {hasHardBlock ? (
            <AlertOctagon className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          ) : !isCompliant ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span className="text-[11px] uppercase tracking-wider">
            {hasHardBlock
              ? "🚨 YASAL ENGEL (HARD BLOCK) - KAYIT ENGELLENDİ"
              : !isCompliant
              ? "⚠️ MEVZUAT UYARISI (SOFT WARNING)"
              : "🛡️ T.C. ÇALIŞMA MEVZUATINA TAM UYUMLU"}
          </span>
        </div>

        <span className="text-[10px] font-mono opacity-80 flex items-center gap-1 font-semibold">
          <Scale className="h-3 w-3" /> 4857 / 6331 SK.
        </span>
      </div>

      <div className="p-3.5 space-y-3">
        {/* 2. Optional Metrics Micro-Chips */}
        {metrics && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {metrics.netWorkHours !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 border border-zinc-200 text-zinc-700 font-semibold text-[11px] shadow-2xs dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
                <Clock className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                Net Çalışma: <strong>{metrics.netWorkHours.toFixed(1)} saat</strong>
              </span>
            )}

            {metrics.providedBreakMinutes !== undefined && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold shadow-2xs ${
                  metrics.requiredBreakMinutes &&
                  metrics.providedBreakMinutes < metrics.requiredBreakMinutes
                    ? "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300"
                    : "bg-white/90 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                }`}
              >
                <Coffee className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                Mola: <strong>{metrics.providedBreakMinutes} dk</strong>
                {metrics.requiredBreakMinutes && (
                  <span className="text-[10px] opacity-75">
                    (Yasal Asgari: {metrics.requiredBreakMinutes} dk)
                  </span>
                )}
              </span>
            )}

            {metrics.nightWorkHours !== undefined && metrics.nightWorkHours > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold shadow-2xs ${
                  metrics.nightWorkHours > 7.5
                    ? "bg-red-100 border-red-300 text-red-900 dark:bg-red-950/60 dark:border-red-800 dark:text-red-300"
                    : "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                }`}
              >
                Gece Dönemi: <strong>{metrics.nightWorkHours.toFixed(1)} saat</strong>
                {metrics.nightWorkHours > 7.5 && " (Sınır: 7.5s)"}
              </span>
            )}

            {metrics.projectedWeeklyHours !== undefined && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold shadow-2xs ${
                  metrics.projectedWeeklyHours > 45
                    ? "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300"
                    : "bg-white/90 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                }`}
              >
                Haftalık Toplam: <strong>{metrics.projectedWeeklyHours.toFixed(1)} saat</strong>
                {metrics.projectedWeeklyHours > 45 && " (Fazla Mesai)"}
              </span>
            )}
          </div>
        )}

        {/* 3. Compliant State Content */}
        {isCompliant && (
          <p className="text-[11px] text-emerald-800 leading-relaxed font-medium dark:text-emerald-300">
            Girdiğiniz süreler günlük 11 saat, gece 7.5 saat ve yasal asgari ara dinlenme baremlerine tam uygundur.
          </p>
        )}

        {/* 4. Violations List */}
        {!isCompliant && violations.length > 0 && (
          <div className="space-y-2">
            {violations.map((v, i) => (
              <div
                key={i}
                className="bg-white/95 rounded-xl p-2.5 border border-zinc-200/80 shadow-2xs space-y-1 dark:bg-zinc-900 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-900 bg-amber-100/90 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-mono dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300">
                    {v.lawReference}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      v.enforcementLevel === "HardBlock"
                        ? "bg-red-600 text-white dark:bg-red-500"
                        : "bg-amber-500 text-white dark:bg-amber-600"
                    }`}
                  >
                    {v.enforcementLevel === "HardBlock" ? "Engellendi" : "Uyarı"}
                  </span>
                </div>
                <h6 className="font-bold text-zinc-900 text-xs dark:text-zinc-100">{v.ruleName}</h6>
                <p className="text-zinc-600 text-[11px] leading-relaxed dark:text-zinc-400">{v.details}</p>
                {v.penaltyRisk && (
                  <div className="text-[10px] text-red-700 font-semibold pt-0.5 flex items-center gap-1 dark:text-red-400">
                    <span>🚨 Yaptırım Riski:</span>
                    <span className="opacity-90">{v.penaltyRisk}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 5. Manager Exception / Override Control (For Soft Warnings) */}
        {!isCompliant && !hasHardBlock && allowOverride && (
          <div className="pt-2 border-t border-amber-200/80 space-y-2 dark:border-amber-900/60">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={localChecked}
                onChange={(e) => handleToggle(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
              />
              <span className="font-bold text-zinc-800 text-[11px] flex items-center gap-1 dark:text-zinc-200">
                <FileCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Yönetici İstisnası / Fazla Mesai Onayı ile Devam Et
              </span>
            </label>

            {localChecked && (
              <div className="animate-in fade-in slide-in-from-top-1 space-y-1">
                <input
                  type="text"
                  value={localReason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  placeholder="Gerekçe giriniz (Örn: Acil operasyonel ihtiyaç ve personel onayı)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                <span className="text-[10px] text-zinc-500 block dark:text-zinc-400">
                  * Bu gerekçe denetim kütüğüne yönetici onaylı istisna olarak kaydedilecektir.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
