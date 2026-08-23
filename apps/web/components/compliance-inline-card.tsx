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
          ? "bg-red-50/70 border-red-200 text-red-950"
          : !isCompliant
          ? "bg-amber-50/70 border-amber-200 text-amber-950"
          : "bg-emerald-50/50 border-emerald-200/80 text-emerald-950"
      } ${className}`}
    >
      {/* 1. Header Bar */}
      <div
        className={`px-3.5 py-2.5 flex items-center justify-between border-b ${
          hasHardBlock
            ? "border-red-100 bg-red-100/50"
            : !isCompliant
            ? "border-amber-100 bg-amber-100/50"
            : "border-emerald-100/70 bg-emerald-100/30"
        }`}
      >
        <div className="flex items-center gap-2 font-bold">
          {hasHardBlock ? (
            <AlertOctagon className="h-4 w-4 text-red-600 shrink-0" />
          ) : !isCompliant ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/90 text-slate-700 font-semibold text-[11px] shadow-2xs">
                <Clock className="h-3 w-3 text-indigo-500" />
                Net Çalışma: <strong>{metrics.netWorkHours.toFixed(1)} saat</strong>
              </span>
            )}

            {metrics.providedBreakMinutes !== undefined && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold shadow-2xs ${
                  metrics.requiredBreakMinutes &&
                  metrics.providedBreakMinutes < metrics.requiredBreakMinutes
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-white/90 border-slate-200/90 text-slate-700"
                }`}
              >
                <Coffee className="h-3 w-3 text-amber-600" />
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
                    ? "bg-red-100 border-red-300 text-red-900"
                    : "bg-indigo-50 border-indigo-200 text-indigo-800"
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
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-white/90 border-slate-200/90 text-slate-700"
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
          <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
            Girdiğiniz süreler günlük 11 saat, gece 7.5 saat ve yasal asgari ara dinlenme baremlerine tam uygundur.
          </p>
        )}

        {/* 4. Violations List */}
        {!isCompliant && violations.length > 0 && (
          <div className="space-y-2">
            {violations.map((v, i) => (
              <div
                key={i}
                className="bg-white/95 rounded-xl p-2.5 border border-slate-200/80 shadow-2xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-900 bg-amber-100/90 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {v.lawReference}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      v.enforcementLevel === "HardBlock"
                        ? "bg-red-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {v.enforcementLevel === "HardBlock" ? "Engellendi" : "Uyarı"}
                  </span>
                </div>
                <h6 className="font-bold text-slate-900 text-xs">{v.ruleName}</h6>
                <p className="text-slate-600 text-[11px] leading-relaxed">{v.details}</p>
                {v.penaltyRisk && (
                  <div className="text-[10px] text-red-700 font-semibold pt-0.5 flex items-center gap-1">
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
          <div className="pt-2 border-t border-amber-200/80 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={localChecked}
                onChange={(e) => handleToggle(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
              />
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5 text-amber-600" />
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 block">
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
