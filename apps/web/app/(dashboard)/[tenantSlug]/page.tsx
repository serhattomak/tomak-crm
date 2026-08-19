"use client"

import React from "react"
import { usePermissions } from "@/lib/permissions/permission-context"
import { Users, Shield, Database, Zap, Cpu, Server } from "lucide-react"

export default function WorkspaceOverviewPage() {
  const { profile, activeTenant, isLoading } = usePermissions()

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-1/4 rounded bg-slate-800"></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="h-32 rounded-xl bg-slate-800"></div>
          <div className="h-32 rounded-xl bg-slate-800"></div>
          <div className="h-32 rounded-xl bg-slate-800"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Welcome back, {profile?.fullName || profile?.email} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Workspace:{" "}
              <span className="font-semibold text-indigo-300">
                {activeTenant?.name}
              </span>{" "}
              ({activeTenant?.slug})
            </p>
          </div>
          <div className="flex gap-2">
            {profile?.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-indigo-500/40 bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-300"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics & Architecture Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Security & RBAC
            </span>
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {profile?.permissions.length || 0}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Active permissions loaded from Redis
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Database Multi-Tenancy
            </span>
            <Database className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">Dual-Layer</div>
          <p className="mt-1 text-xs text-slate-400">
            PostgreSQL RLS + EF Core Query Filter
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Messaging & Broker
            </span>
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">MassTransit</div>
          <p className="mt-1 text-xs text-slate-400">
            RabbitMQ + Transactional Outbox
          </p>
        </div>
      </div>

      {/* Active Permissions Details */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-100">
          <Shield className="h-4 w-4 text-indigo-400" />
          Your Active Granular Permissions in this Tenant
        </h2>
        <div className="flex flex-wrap gap-2">
          {profile?.permissions.map((perm) => (
            <span
              key={perm}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-300"
            >
              {perm}
            </span>
          ))}
          {(!profile?.permissions || profile.permissions.length === 0) && (
            <span className="text-xs text-slate-500">
              No explicit permissions assigned yet.
            </span>
          )}
        </div>
      </div>

      {/* Architecture Topology */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-100">
          <Server className="h-4 w-4 text-indigo-400" />
          Monolith & Stack Architecture Highlights
        </h2>
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-4">
            <div className="mb-1 flex items-center gap-2 font-semibold text-slate-200">
              <Cpu className="h-4 w-4 text-indigo-400" /> .NET 10 Vertical Slice
              Backend
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Every feature bundles Command/Query, Validator (FluentValidation),
              Mapping (AutoMapper), Handler, and Endpoint in a single slice.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-4">
            <div className="mb-1 flex items-center gap-2 font-semibold text-slate-200">
              <Database className="h-4 w-4 text-emerald-400" /> Local Supabase
              (GoTrue + Postgres)
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Supabase Auth triggers automatic user synchronization to public
              domain tables and initializes tenant ownership.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
