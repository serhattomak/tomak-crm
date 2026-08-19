"use client"

import React, { useState } from "react"
import { usePermissions } from "@/lib/permissions/permission-context"
import {
  Share2,
  Bell,
  UserPlus,
  SlidersHorizontal,
  Plus,
  Filter,
  Download,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from "lucide-react"

export default function WorkspaceOverviewPage() {
  const { activeTenant, profile } = usePermissions()
  const [activeTab, setActiveTab] = useState("Overview")
  const [hoveredMonth, setHoveredMonth] = useState<string | null>("Jun")

  const tabs = ["Overview", "Sales", "Order"]

  return (
    <div className="space-y-6">
      {/* 1. Top Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
          </button>

          {/* Member Avatars Stack */}
          <div className="flex items-center -space-x-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-semibold text-white shadow-xs">
              S
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-xs font-semibold text-white shadow-xs">
              A
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-xs font-semibold text-white shadow-xs">
              K
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-700 shadow-xs">
              +3
            </div>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
            title="Invite Member"
          >
            <UserPlus className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Customize Widget</span>
          </button>
        </div>
      </div>

      {/* 2. Subheader Tabs & Filters Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        {/* Pill Tabs */}
        <div className="flex w-fit items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Widget</span>
          </button>
        </div>

        {/* Filter & Export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
          >
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-slate-800"
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
              <span className="text-xs font-semibold text-slate-700">
                Active Sales
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                  $24,064
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="font-normal text-slate-400">
                    vs last month
                  </span>
                  <span className="flex items-center">↑ 12%</span>
                </div>
              </div>

              {/* Mini Chart: 4 vertical rounded bars */}
              <div className="flex h-9 items-end gap-1">
                <div className="h-4 w-2 rounded-full bg-orange-200" />
                <div className="h-7 w-2 rounded-full bg-orange-400" />
                <div className="h-9 w-2 rounded-full bg-orange-500" />
                <div className="h-6 w-2 rounded-full bg-orange-600" />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-700 transition-colors hover:text-orange-600"
          >
            <span>See Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Metric 2: Product Revenue */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div>
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">
                Product Revenue
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                  $15,490
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="font-normal text-slate-400">
                    vs last month
                  </span>
                  <span className="flex items-center">↑ 9%</span>
                </div>
              </div>

              {/* Mini Chart: Smooth sparkline wave */}
              <div className="flex h-9 w-14 items-center">
                <svg
                  viewBox="0 0 60 30"
                  className="h-full w-full overflow-visible"
                >
                  <path
                    d="M 0,22 Q 15,30 30,12 T 60,8"
                    fill="none"
                    stroke="#f95721"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-700 transition-colors hover:text-orange-600"
          >
            <span>See Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Metric 3: Product Sold */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div>
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">
                Product Sold
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                  2,355
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
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
                    r="13"
                    stroke="#fed7aa"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    stroke="#f95721"
                    strokeWidth="4"
                    strokeDasharray="81"
                    strokeDashoffset="25"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-700 transition-colors hover:text-orange-600"
          >
            <span>See Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Metric 4: Conversion Rate */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div>
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">
                Conversion Rate
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                  12,5%
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                  <span className="font-normal text-slate-400">
                    vs last month
                  </span>
                  <span className="flex items-center">↓ 2%</span>
                </div>
              </div>

              {/* Mini Chart: Waveform bars */}
              <div className="flex h-9 items-center gap-1">
                <div className="h-3 w-1.5 rounded-full bg-orange-400" />
                <div className="h-6 w-1.5 rounded-full bg-orange-500" />
                <div className="h-9 w-1.5 rounded-full bg-orange-600" />
                <div className="h-4 w-1.5 rounded-full bg-orange-400" />
                <div className="h-7 w-1.5 rounded-full bg-orange-300" />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-700 transition-colors hover:text-orange-600"
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
              <span className="text-xs font-bold text-slate-900">
                Sales Performance
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Speedometer Radial Gauge */}
            <div className="relative my-4 flex flex-col items-center justify-center">
              <svg viewBox="0 0 200 120" className="w-48 overflow-visible">
                {/* Background track */}
                <path
                  d="M 20,110 A 80,80 0 0,1 180,110"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Active Orange track (82%) */}
                <path
                  d="M 20,110 A 80,80 0 0,1 165,65"
                  fill="none"
                  stroke="url(#orangeGaugeGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="orangeGaugeGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#ff7849" />
                    <stop offset="100%" stopColor="#f95721" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Centered Score */}
              <div className="absolute top-12 flex flex-col items-center text-center">
                <div className="flex items-center gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                    82
                  </span>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    +1
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  of 100 points
                </span>
              </div>
            </div>

            {/* Motivational message */}
            <div className="mt-2 space-y-1 text-center">
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-900">
                You&apos;re team is great! ✨
              </div>
              <p className="mx-auto max-w-xs text-[11px] leading-relaxed text-slate-500">
                The team is performing well above average, meeting or exceeding
                targets in several areas.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mt-6 flex items-center justify-center gap-1 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-800 transition-colors hover:text-orange-600"
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
                <span className="text-xs font-bold text-slate-900">
                  Analytics
                </span>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Filter className="h-3 w-3 text-slate-500" />
                  <span>Filter</span>
                </button>

                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                  <span>Last Year</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* SVG Interactive Monthly Bar Chart */}
            <div className="relative pt-6 pb-2">
              {/* Floating June Tooltip */}
              <div className="absolute -top-2 left-[44%] z-20 min-w-[130px] animate-in rounded-xl bg-slate-950 p-2.5 text-white shadow-xl fade-in">
                <div className="mb-1 text-[10px] font-bold text-slate-400">
                  Jun, 2024
                </div>
                <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="font-normal text-slate-300">Revenue</span>
                  <span>$2,766</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="font-normal text-slate-300">Conv. Rate</span>
                  <span>8.7%</span>
                </div>
                {/* Pointer indicator */}
                <div className="absolute -bottom-1 left-6 h-2 w-2 rotate-45 bg-slate-950" />
              </div>

              {/* Y Axis Grid Lines */}
              <div className="mb-2 space-y-6 font-mono text-[10px] text-slate-400">
                {["$4K", "$3K", "$2K", "$1K", "0"].map((label) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-7 text-right">{label}</span>
                    <div className="flex-1 border-b border-dashed border-slate-200" />
                  </div>
                ))}
              </div>

              {/* Monthly Bar Columns */}
              <div className="-mt-28 grid h-28 grid-cols-12 items-end gap-1.5 pr-2 pl-10 sm:gap-3">
                {[
                  { m: "Jan", h: "h-14", active: false },
                  { m: "Feb", h: "h-20", active: false },
                  { m: "Mar", h: "h-16", active: false },
                  { m: "Apr", h: "h-22", active: false },
                  { m: "May", h: "h-12", active: false },
                  { m: "Jun", h: "h-28", active: true },
                  { m: "Jul", h: "h-18", active: false },
                  { m: "Aug", h: "h-22", active: false },
                  { m: "Sept", h: "h-16", active: false },
                  { m: "Okt", h: "h-20", active: false },
                  { m: "Nov", h: "h-14", active: false },
                  { m: "Dec", h: "h-16", active: false },
                ].map((bar) => (
                  <div
                    key={bar.m}
                    className="group flex cursor-pointer flex-col items-center gap-2"
                    onMouseEnter={() => setHoveredMonth(bar.m)}
                  >
                    <div className="flex h-28 w-full items-end justify-center">
                      {bar.active ? (
                        <div
                          className={`w-full max-w-[28px] ${bar.h} rounded-2xl bg-gradient-to-t from-orange-600 to-orange-500 shadow-md shadow-orange-500/25 transition-transform group-hover:scale-105`}
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
                      className={`text-[10px] font-semibold ${bar.active ? "font-bold text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`}
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
              <span className="text-xs font-bold text-slate-900">
                Visit by Time
              </span>
            </div>

            {/* Legend Scale */}
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
              <span>0</span>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-orange-100" />
                <div className="h-2 w-2 rounded-full bg-orange-200" />
                <div className="h-2 w-2 rounded-full bg-orange-300" />
                <div className="h-2 w-2 rounded-full bg-orange-400" />
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              </div>
              <span>10,000+</span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Days Header */}
              <div className="mb-2 grid grid-cols-8 gap-2 text-center text-[10px] font-semibold text-slate-400">
                <div className="text-left"></div>
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
                  label: "12 AM - 8 AM",
                  colors: [
                    "bg-orange-300",
                    "bg-orange-100",
                    "bg-orange-200",
                    "bg-orange-100",
                    "bg-orange-200",
                    "bg-orange-100",
                    "bg-orange-100",
                  ],
                },
                {
                  label: "8 AM - 4 PM",
                  colors: [
                    "bg-orange-500",
                    "bg-orange-200",
                    "bg-orange-500",
                    "bg-orange-400",
                    "bg-orange-200",
                    "bg-orange-300",
                    "bg-orange-500",
                  ],
                },
                {
                  label: "4 PM - 12 AM",
                  colors: [
                    "bg-orange-200",
                    "bg-orange-300",
                    "bg-orange-100",
                    "bg-orange-100",
                    "bg-orange-500",
                    "bg-orange-100",
                    "bg-orange-400",
                  ],
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="mb-2 grid grid-cols-8 items-center gap-2"
                >
                  <span className="truncate text-[10px] font-semibold text-slate-500">
                    {row.label}
                  </span>
                  {row.colors.map((c, i) => (
                    <div
                      key={i}
                      className={`h-7 rounded-xl ${c} cursor-pointer transition-opacity hover:opacity-80`}
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
              <span className="text-xs font-bold text-slate-900">
                Total Visit
              </span>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="mb-4 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                191,886
              </div>
              <div className="flex items-center text-[11px] font-semibold text-emerald-600">
                <span>vs last month ↑ 8.5%</span>
              </div>
            </div>

            {/* Donut Chart and Legend */}
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f95721]" />
                  <span className="text-slate-600">Mobile</span>
                  <span className="ml-auto font-bold text-slate-900">
                    115,132
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-200" />
                  <span className="text-slate-600">Website</span>
                  <span className="ml-auto font-bold text-slate-900">
                    76,754
                  </span>
                </div>
              </div>

              {/* Pie/Donut Chart */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className="h-full w-full -rotate-90 transform"
                >
                  {/* Website (40%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#fed7aa"
                    strokeWidth="20"
                    strokeDasharray="226"
                    strokeDashoffset="0"
                    fill="none"
                  />
                  {/* Mobile (60%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#f95721"
                    strokeWidth="20"
                    strokeDasharray="226"
                    strokeDashoffset="90"
                    fill="none"
                  />
                </svg>

                {/* Donut percentage markers */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
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
  )
}
