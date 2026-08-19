"use client";

import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import type { DateRange } from "./dashboard-types";

interface SalesGaugeWidgetProps {
  dateRange?: DateRange;
}

export function SalesGaugeWidget({ dateRange: _dateRange }: SalesGaugeWidgetProps) {
  const currentScore = 84;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Satış Hedef Performansı</span>
              <div className="text-[11px] text-slate-500">Dönemsel Kota Tamamlama</div>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-[10px] text-emerald-700">
            <Sparkles className="h-3 w-3" />
            Harika Gidiyor!
          </span>
        </div>

        {/* Speedometer Radial Gauge */}
        <div className="relative my-3 flex flex-col items-center justify-center">
          <svg className="w-48 overflow-visible" viewBox="0 0 200 120">
            <defs>
              <linearGradient id="salesGaugeGrad" x1="0%" x2="100%" y1="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Background track */}
            <path
              d="M 20,110 A 80,80 0 0,1 180,110"
              fill="none"
              stroke="#f1f5f9"
              strokeLinecap="round"
              strokeWidth="14"
            />
            {/* Active Neon track */}
            <path
              d="M 20,110 A 80,80 0 0,1 168,60"
              fill="none"
              stroke="url(#salesGaugeGrad)"
              strokeLinecap="round"
              strokeWidth="14"
            />
          </svg>

          {/* Centered Score */}
          <div className="absolute top-12 flex flex-col items-center text-center">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-4xl text-slate-900 tracking-tight">
                %{currentScore}
              </span>
            </div>
            <span className="font-medium text-[11px] text-slate-400">
              hedef: ₺600.000 (Gerçekleşen: ₺504.000)
            </span>
          </div>
        </div>

        {/* Motivational message & Highlights */}
        <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-600">Kapanan Anlaşmalar:</span>
            <span className="font-bold text-slate-900">42 / 50</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500"
              style={{ width: "84%" }}
            />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Ekip hedefin %84&apos;üne ulaştı. Kalan ₺96.000 için 8 gün var.
          </p>
        </div>
      </div>

      <button
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 font-semibold text-slate-800 text-xs shadow-2xs transition-colors hover:bg-slate-50 hover:text-fuchsia-600"
        type="button"
      >
        <span>Hedef ve Prim Detayları</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
