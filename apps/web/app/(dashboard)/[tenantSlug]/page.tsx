"use client";

import {
  ArrowRight,
  Bell,
  ChevronDown,
  Download,
  Filter,
  Info,
  Maximize2,
  Plus,
  Share2,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { usePermissions } from "@/lib/permissions/permission-context";

export default function WorkspaceOverviewPage() {
  const { activeTenant, profile } = usePermissions();
  const [activeTab, setActiveTab] = useState("Overview");
  const [hoveredMonth, setHoveredMonth] = useState<string | null>("Jun");

  const tabs = ["Overview", "Sales", "Order"];

  return (
    <div className="space-y-6">
      {/* 1. Top Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight sm:text-3xl">
            Dashboard
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Share"
            type="button"
          >
            <Share2 className="h-4 w-4" />
          </button>

          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Notifications"
            type="button"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-white" />
          </button>

          {/* Member Avatars Stack */}
          <div className="flex items-center -space-x-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 font-semibold text-white text-xs shadow-xs">
              S
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-600 font-semibold text-white text-xs shadow-xs">
              A
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-fuchsia-500 font-semibold text-white text-xs shadow-xs">
              K
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 font-bold text-[10px] text-slate-700 shadow-xs">
              +3
            </div>
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Invite Member"
            type="button"
          >
            <UserPlus className="h-4 w-4" />
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 font-semibold text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-50"
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Customize Widget</span>
          </button>
        </div>
      </div>

      {/* 2. Subheader Tabs & Filters Bar */}
      <div className="flex flex-col justify-between gap-3 border-slate-100 border-b pb-4 sm:flex-row sm:items-center">
        {/* Pill Tabs */}
        <div className="flex w-fit items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
          {tabs.map((tab) => (
            <button
              className={`rounded-xl px-4 py-1.5 font-semibold text-xs transition-all ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
          <button
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 font-semibold text-slate-600 text-xs transition-colors hover:text-slate-900"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Widget</span>
          </button>
        </div>

        {/* Filter & Export */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-slate-700 text-xs shadow-2xs transition-colors hover:bg-slate-50"
            type="button"
          >
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-1.5 font-medium text-white text-xs shadow-xs transition-colors hover:bg-slate-800"
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 3. Row 1: 4 Metric Cards (KPI Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Active Sales */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div>
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700 text-xs">
                Active Sales
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="font-extrabold text-2xl text-slate-900 tracking-tight">
                  $24,064
                </div>
                <div className="mt-1 flex items-center gap-1 font-semibold text-[11px] text-emerald-600">
                  <span className="font-normal text-slate-400">
                    vs last month
                  </span>
                  <span className="flex items-center">↑ 12%</span>
                </div>
              </div>

              {/* Mini Chart: 4 vertical rounded bars */}
              <div className="flex h-9 items-end gap-1">
                <div className="h-4 w-2 rounded-full bg-cyan-300" />
                <div className="h-7 w-2 rounded-full bg-indigo-400" />
                <div className="h-9 w-2 rounded-full bg-violet-500" />
                <div className="h-6 w-2 rounded-full bg-fuchsia-500" />
              </div>
            </div>
          </div>

          <button
            className="mt-4 flex items-center gap-1 border-slate-100 border-t pt-3 font-semibold text-[11px] text-slate-700 transition-colors hover:text-fuchsia-600"
            type="button"
          >
            <span>See Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Metric 2: Product Revenue */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div>
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700 text-xs">
                Product Revenue
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="font-extrabold text-2xl text-slate-900 tracking-tight">
                  $15,490
                </div>
                <div className="mt-1 flex items-center gap-1 font-semibold text-[11px] text-emerald-600">
                  <span className="font-normal text-slate-400">
                    vs last month
                  </span>
                  <span className="flex items-center">↑ 9%</span>
                </div>
              </div>

              {/* Mini Chart: Smooth sparkline wave */}
              <div className="flex h-9 w-14 items-center">
                <svg
                  className="h-full w-full overflow-visible"
                  viewBox="0 0 60 30"
                >
                  <defs>
                    <linearGradient
                      id="revenueSparkGrad"
                      x1="0%"
                      x2="100%"
                      y1="0%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,22 Q 15,30 30,12 T 60,8"
                    fill="none"
                    stroke="url(#revenueSparkGrad)"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
            </div>
          </div>

          <button
            className="mt-4 flex items-center gap-1 border-slate-100 border-t pt-3 font-semibold text-[11px] text-slate-700 transition-colors hover:text-fuchsia-600"
            type="button"
          >
            <span>See Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Metric 3: Product Sold */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div>
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700 text-xs">
                Product Sold
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="font-extrabold text-2xl text-slate-900 tracking-tight">
                  2,355
                </div>
                <div className="mt-1 flex items-center gap-1 font-semibold text-[11px] text-emerald-600">
                  <span className="font-normal text-slate-400">
                    vs last month
                  </span>
                  <span className="flex items-center">↑ 7%</span>
                </div>
              </div>

              {/* Mini Chart: Donut Ring */}
              <div className="relative flex h-9 w-9 items-center justify-center">
                <svg className="h-9 w-9 -rotate-90 transform">
                  <circle
                    cx="18"
                    cy="18"
                    fill="none"
                    r="13"
                    stroke="#ede9fe"
                    strokeWidth="4"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    fill="none"
                    r="13"
                    stroke="#8b5cf6"
                    strokeDasharray="81"
                    strokeDashoffset="25"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <button
            className="mt-4 flex items-center gap-1 border-slate-100 border-t pt-3 font-semibold text-[11px] text-slate-700 transition-colors hover:text-fuchsia-600"
            type="button"
          >
            <span>See Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Metric 4: Conversion Rate */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div>
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700 text-xs">
                Conversion Rate
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="font-extrabold text-2xl text-slate-900 tracking-tight">
                  12,5%
                </div>
                <div className="mt-1 flex items-center gap-1 font-semibold text-[11px] text-rose-500">
                  <span className="font-normal text-slate-400">
                    vs last month
                  </span>
                  <span className="flex items-center">↓ 2%</span>
                </div>
              </div>

              {/* Mini Chart: Waveform bars */}
              <div className="flex h-9 items-center gap-1">
                <div className="h-3 w-1.5 rounded-full bg-cyan-400" />
                <div className="h-6 w-1.5 rounded-full bg-indigo-500" />
                <div className="h-9 w-1.5 rounded-full bg-fuchsia-500" />
                <div className="h-4 w-1.5 rounded-full bg-violet-400" />
                <div className="h-7 w-1.5 rounded-full bg-cyan-300" />
              </div>
            </div>
          </div>

          <button
            className="mt-4 flex items-center gap-1 border-slate-100 border-t pt-3 font-semibold text-[11px] text-slate-700 transition-colors hover:text-fuchsia-600"
            type="button"
          >
            <span>See Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 4. Row 2: Sales Performance Speedometer + Analytics Bar Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sales Performance Card (Gauge) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-4">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                Sales Performance
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Speedometer Radial Gauge */}
            <div className="relative my-4 flex flex-col items-center justify-center">
              <svg className="w-48 overflow-visible" viewBox="0 0 200 120">
                {/* Background track */}
                <path
                  d="M 20,110 A 80,80 0 0,1 180,110"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeLinecap="round"
                  strokeWidth="14"
                />
                {/* Active Neon track (82%) */}
                <path
                  d="M 20,110 A 80,80 0 0,1 165,65"
                  fill="none"
                  stroke="url(#neonGaugeGrad)"
                  strokeLinecap="round"
                  strokeWidth="14"
                />
                <defs>
                  <linearGradient
                    id="neonGaugeGrad"
                    x1="0%"
                    x2="100%"
                    y1="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Centered Score */}
              <div className="absolute top-12 flex flex-col items-center text-center">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-4xl text-slate-900 tracking-tight">
                    82
                  </span>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-[10px] text-emerald-700">
                    +1
                  </span>
                </div>
                <span className="font-medium text-[11px] text-slate-400">
                  of 100 points
                </span>
              </div>
            </div>

            {/* Motivational message */}
            <div className="mt-2 space-y-1 text-center">
              <div className="flex items-center justify-center gap-1 font-bold text-slate-900 text-xs">
                You&apos;re team is great! ✨
              </div>
              <p className="mx-auto max-w-xs text-[11px] text-slate-500 leading-relaxed">
                The team is performing well above average, meeting or exceeding
                targets in several areas.
              </p>
            </div>
          </div>

          <button
            className="mt-6 flex items-center justify-center gap-1 border-slate-100 border-t pt-4 font-semibold text-slate-800 text-xs transition-colors hover:text-fuchsia-600"
            type="button"
          >
            <span>Improve Your Score</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Analytics Bar Chart Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-8">
          <div>
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs">
                  Analytics
                </span>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1 font-semibold text-[11px] text-slate-700 hover:bg-slate-50"
                  type="button"
                >
                  <Filter className="h-3 w-3 text-slate-500" />
                  <span>Filter</span>
                </button>

                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 font-semibold text-[11px] text-slate-700">
                  <span>Last Year</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>

                <button
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                  type="button"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* SVG Interactive Monthly Bar Chart */}
            <div className="relative pt-6 pb-2">
              {/* Floating June Tooltip */}
              <div className="fade-in absolute -top-2 left-[44%] z-20 min-w-[130px] animate-in rounded-xl bg-slate-950 p-2.5 text-white shadow-xl">
                <div className="mb-1 font-bold text-[10px] text-slate-400">
                  Jun, 2024
                </div>
                <div className="flex items-center justify-between gap-3 font-semibold text-xs">
                  <span className="font-normal text-slate-300">Revenue</span>
                  <span>$2,766</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-3 font-semibold text-xs">
                  <span className="font-normal text-slate-300">Conv. Rate</span>
                  <span>8.7%</span>
                </div>
                {/* Pointer indicator */}
                <div className="absolute -bottom-1 left-6 h-2 w-2 rotate-45 bg-slate-950" />
              </div>

              {/* Y Axis Grid Lines */}
              <div className="mb-2 space-y-6 font-mono text-[10px] text-slate-400">
                {["$4K", "$3K", "$2K", "$1K", "0"].map((label) => (
                  <div className="flex items-center gap-3" key={label}>
                    <span className="w-7 text-right">{label}</span>
                    <div className="flex-1 border-slate-200 border-b border-dashed" />
                  </div>
                ))}
              </div>

              {/* Monthly Bar Columns */}
              <div className="-mt-28 grid h-28 grid-cols-12 items-end gap-1.5 pr-2 pl-10 sm:gap-3">
                {[
                  { active: false, h: "h-14", m: "Jan" },
                  { active: false, h: "h-20", m: "Feb" },
                  { active: false, h: "h-16", m: "Mar" },
                  { active: false, h: "h-22", m: "Apr" },
                  { active: false, h: "h-12", m: "May" },
                  { active: true, h: "h-28", m: "Jun" },
                  { active: false, h: "h-18", m: "Jul" },
                  { active: false, h: "h-22", m: "Aug" },
                  { active: false, h: "h-16", m: "Sept" },
                  { active: false, h: "h-20", m: "Okt" },
                  { active: false, h: "h-14", m: "Nov" },
                  { active: false, h: "h-16", m: "Dec" },
                ].map((bar) => (
                  <div
                    className="group flex cursor-pointer flex-col items-center gap-2"
                    key={bar.m}
                    onMouseEnter={() => setHoveredMonth(bar.m)}
                  >
                    <div className="flex h-28 w-full items-end justify-center">
                      {bar.active ? (
                        <div
                          className={`w-full max-w-[28px] ${bar.h} rounded-2xl bg-gradient-to-t from-violet-600 via-purple-500 to-fuchsia-500 shadow-fuchsia-500/25 shadow-md transition-transform group-hover:scale-105`}
                        />
                      ) : (
                        <div
                          className={`w-full max-w-[28px] ${bar.h} rounded-2xl bg-slate-100 transition-all hover:bg-slate-200`}
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 2px, #f8fafc 2px, #f8fafc 6px)",
                          }}
                        />
                      )}
                    </div>
                    <span
                      className={`font-semibold text-[10px] ${bar.active ? "font-bold text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`}
                    >
                      {bar.m}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Row 3: Visit by Time Heatmap + Total Visit Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Visit by Time Heatmap */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-8">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-xs">
                Visit by Time
              </span>
            </div>

            {/* Legend Scale */}
            <div className="flex items-center gap-2 font-medium text-[10px] text-slate-500">
              <span>0</span>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-slate-100" />
                <div className="h-2 w-2 rounded-full bg-cyan-100" />
                <div className="h-2 w-2 rounded-full bg-cyan-300" />
                <div className="h-2 w-2 rounded-full bg-violet-400" />
                <div className="h-2 w-2 rounded-full bg-fuchsia-500" />
              </div>
              <span>10,000+</span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Days Header */}
              <div className="mb-2 grid grid-cols-8 gap-2 text-center font-semibold text-[10px] text-slate-400">
                <div className="text-left" />
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>

              {/* Time Slot Rows */}
              {[
                {
                  colors: [
                    "bg-cyan-300",
                    "bg-slate-100",
                    "bg-cyan-100",
                    "bg-slate-100",
                    "bg-cyan-100",
                    "bg-slate-100",
                    "bg-slate-100",
                  ],
                  label: "12 AM - 8 AM",
                },
                {
                  colors: [
                    "bg-fuchsia-500",
                    "bg-cyan-100",
                    "bg-fuchsia-500",
                    "bg-violet-400",
                    "bg-cyan-100",
                    "bg-cyan-300",
                    "bg-fuchsia-500",
                  ],
                  label: "8 AM - 4 PM",
                },
                {
                  colors: [
                    "bg-cyan-100",
                    "bg-cyan-300",
                    "bg-slate-100",
                    "bg-slate-100",
                    "bg-fuchsia-500",
                    "bg-slate-100",
                    "bg-violet-400",
                  ],
                  label: "4 PM - 12 AM",
                },
              ].map((row) => (
                <div
                  className="mb-2 grid grid-cols-8 items-center gap-2"
                  key={row.label}
                >
                  <span className="truncate font-semibold text-[10px] text-slate-500">
                    {row.label}
                  </span>
                  {row.colors.map((c, i) => (
                    <div
                      className={`h-7 rounded-xl ${c} cursor-pointer transition-opacity hover:opacity-80`}
                      key={i}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Visit Donut Chart Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-4">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                Total Visit
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="mb-4 flex items-baseline justify-between">
              <div className="font-extrabold text-2xl text-slate-900 tracking-tight">
                191,886
              </div>
              <div className="flex items-center font-semibold text-[11px] text-emerald-600">
                <span>vs last month ↑ 8.5%</span>
              </div>
            </div>

            {/* Donut Chart and Legend */}
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899]" />
                  <span className="text-slate-600">Mobile</span>
                  <span className="ml-auto font-bold text-slate-900">
                    115,132
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#06b6d4]" />
                  <span className="text-slate-600">Website</span>
                  <span className="ml-auto font-bold text-slate-900">
                    76,754
                  </span>
                </div>
              </div>

              {/* Pie/Donut Chart */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg
                  className="h-full w-full -rotate-90 transform"
                  viewBox="0 0 100 100"
                >
                  {/* Website (40%) */}
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="36"
                    stroke="#22d3ee"
                    strokeDasharray="226"
                    strokeDashoffset="0"
                    strokeWidth="20"
                  />
                  {/* Mobile (60%) */}
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="36"
                    stroke="#ec4899"
                    strokeDasharray="226"
                    strokeDashoffset="90"
                    strokeWidth="20"
                  />
                </svg>

                {/* Donut percentage markers */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold text-[10px] text-white">
                  <span className="absolute top-8 left-6 text-white">60%</span>
                  <span className="absolute top-7 right-5 text-slate-700">
                    40%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
