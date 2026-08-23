"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";

export interface TenantLabels {
  tenantId: string;
  industryKey?: string;
  industryName?: string;
  moduleDisplayNames: Record<string, string>;
  fieldLabels: Record<string, string>;
}

export interface TenantModuleStatus {
  moduleKey: string;
  defaultDisplayName: string;
  displayNameOverride?: string;
  category: string;
  isEnabled: boolean;
  activatedAt?: string;
}

interface LabelContextType {
  labels: TenantLabels | null;
  modules: TenantModuleStatus[];
  isLoading: boolean;
  error: Error | null;
  getLabel: (key: string, defaultText?: string) => string;
  getModuleDisplayName: (moduleKey: string, defaultText?: string) => string;
  isModuleEnabled: (moduleKey: string) => boolean;
  refetch: () => Promise<void>;
}

const LabelContext = createContext<LabelContextType | null>(null);

const DEFAULT_MODULE_NAMES: Record<string, string> = {
  customers: "Müşteriler",
  products: "Ürün & Hizmetler",
  orders: "Siparişler",
  pipelines: "Pipeline & Akış",
  quotes: "Teklifler",
  shipping: "Kargo & Sevkiyat",
  organization: "Organizasyon",
  payroll: "Bordro & Maaşlar",
  leaves: "İzinler & Takvim",
  attendance: "Vardiya & PDKS",
  chat: "Mesajlar",
};

export function LabelProvider({
  children,
  tenantSlug,
  tenantId,
}: {
  children: React.ReactNode;
  tenantSlug: string;
  tenantId?: string;
}) {
  const [labels, setLabels] = useState<TenantLabels | null>(null);
  const [modules, setModules] = useState<TenantModuleStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLabelsAndModules = async () => {
    if (!tenantSlug && !tenantId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Resolve tenantId if we only have tenantSlug
      let targetTenantId = tenantId;
      if (!targetTenantId && tenantSlug) {
        const tenantRes = await apiClient.get<any>(`/api/tenants/by-slug/${tenantSlug}`);
        if (tenantRes?.data?.id) {
          targetTenantId = tenantRes.data.id;
        }
      }

      if (targetTenantId) {
        const [labelsRes, modulesRes] = await Promise.all([
          apiClient.get<any>(`/api/tenants/${targetTenantId}/labels`).catch(() => null),
          apiClient.get<any>(`/api/tenants/${targetTenantId}/modules`).catch(() => null),
        ]);

        if (labelsRes?.data) {
          setLabels(labelsRes.data);
        }

        if (modulesRes?.data) {
          setModules(modulesRes.data);
        }
      }
    } catch (err: any) {
      console.warn("Label and Module configuration could not be loaded, using defaults.", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabelsAndModules();
  }, [tenantSlug, tenantId]);

  const getLabel = (key: string, defaultText?: string): string => {
    if (labels?.fieldLabels && labels.fieldLabels[key]) {
      return labels.fieldLabels[key];
    }
    return defaultText ?? key;
  };

  const getModuleDisplayName = (moduleKey: string, defaultText?: string): string => {
    const lower = moduleKey.toLowerCase();
    if (labels?.moduleDisplayNames && labels.moduleDisplayNames[lower]) {
      return labels.moduleDisplayNames[lower];
    }
    return defaultText ?? DEFAULT_MODULE_NAMES[lower] ?? moduleKey;
  };

  const isModuleEnabled = (moduleKey: string): boolean => {
    // If no module config is fetched yet, default to enabled for standard workflow
    if (modules.length === 0) return true;
    const mod = modules.find((m) => m.moduleKey.toLowerCase() === moduleKey.toLowerCase());
    return mod ? mod.isEnabled : true;
  };

  const value = useMemo(
    () => ({
      labels,
      modules,
      isLoading,
      error,
      getLabel,
      getModuleDisplayName,
      isModuleEnabled,
      refetch: fetchLabelsAndModules,
    }),
    [labels, modules, isLoading, error]
  );

  return <LabelContext.Provider value={value}>{children}</LabelContext.Provider>;
}

export function useLabels(): LabelContextType {
  const context = useContext(LabelContext);
  if (!context) {
    // Fallback safe dummy context if accessed outside LabelProvider
    return {
      labels: null,
      modules: [],
      isLoading: false,
      error: null,
      getLabel: (key: string, defaultText?: string) => defaultText ?? key,
      getModuleDisplayName: (moduleKey: string, defaultText?: string) =>
        defaultText ?? DEFAULT_MODULE_NAMES[moduleKey.toLowerCase()] ?? moduleKey,
      isModuleEnabled: () => true,
      refetch: async () => {},
    };
  }
  return context;
}
