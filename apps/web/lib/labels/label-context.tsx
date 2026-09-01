"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/lib/permissions/permission-context";

export interface TenantLabels {
  fieldLabels: Record<string, string>;
  industryKey?: string;
  industryName?: string;
  moduleDisplayNames: Record<string, string>;
  tenantId: string;
}

export interface TenantModuleStatus {
  activatedAt?: string;
  category: string;
  defaultDisplayName: string;
  displayNameOverride?: string;
  isEnabled: boolean;
  moduleKey: string;
}

interface LabelContextType {
  error: Error | null;
  getLabel: (key: string, defaultText?: string) => string;
  getModuleDisplayName: (moduleKey: string, defaultText?: string) => string;
  isLoading: boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  labels: TenantLabels | null;
  modules: TenantModuleStatus[];
  refetch: () => Promise<void>;
}

const LabelContext = createContext<LabelContextType | null>(null);

const DEFAULT_MODULE_NAMES: Record<string, string> = {
  attendance: "Vardiya & PDKS",
  chat: "Mesajlar",
  customers: "Müşteriler",
  leaves: "İzinler & Takvim",
  orders: "Siparişler",
  organization: "Organizasyon",
  payroll: "Bordro & Maaşlar",
  pipelines: "Pipeline & Akış",
  products: "Ürün & Hizmetler",
  quotes: "Teklifler",
  shipping: "Kargo & Sevkiyat",
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

  // Super Admin bypass: if current user is Super Admin, all modules are enabled
  let isSuperAdmin = false;
  try {
    const permCtx = usePermissions();
    isSuperAdmin = permCtx.isSuperAdmin ?? false;
  } catch {
    isSuperAdmin = false;
  }

  const fetchLabelsAndModules = async () => {
    if (!(tenantSlug || tenantId)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Resolve tenantId if we only have tenantSlug
      let targetTenantId = tenantId;
      if (!targetTenantId && tenantSlug) {
        const tenantRes = await apiClient.get<any>(
          `/api/tenants/by-slug/${tenantSlug}`
        );
        if (tenantRes?.data?.id) {
          targetTenantId = tenantRes.data.id;
        }
      }

      if (targetTenantId) {
        const [labelsRes, modulesRes] = await Promise.all([
          apiClient
            .get<any>(`/api/tenants/${targetTenantId}/labels`)
            .catch(() => null),
          apiClient
            .get<any>(`/api/tenants/${targetTenantId}/modules`)
            .catch(() => null),
        ]);

        if (labelsRes?.data) {
          setLabels(labelsRes.data);
        }

        if (modulesRes?.data) {
          setModules(modulesRes.data);
        }
      }
    } catch (err: any) {
      console.warn(
        "Label and Module configuration could not be loaded, using defaults.",
        err
      );
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

  const getModuleDisplayName = (
    moduleKey: string,
    defaultText?: string
  ): string => {
    const lower = moduleKey.toLowerCase();
    if (labels?.moduleDisplayNames && labels.moduleDisplayNames[lower]) {
      return labels.moduleDisplayNames[lower];
    }
    return defaultText ?? DEFAULT_MODULE_NAMES[lower] ?? moduleKey;
  };

  const isModuleEnabled = useCallback(
    (moduleKey: string): boolean => {
      // Super Admin sees all modules regardless of tenant_modules
      if (isSuperAdmin) {
        return true;
      }
      // If no module config is fetched yet, default to enabled for standard workflow
      if (modules.length === 0) {
        return true;
      }
      const mod = modules.find(
        (m) => m.moduleKey.toLowerCase() === moduleKey.toLowerCase()
      );
      // If module not in registry, treat as enabled (consistent fallback)
      return mod ? mod.isEnabled : true;
    },
    [modules, isSuperAdmin]
  );

  const value = useMemo(
    () => ({
      error,
      getLabel,
      getModuleDisplayName,
      isLoading,
      isModuleEnabled,
      labels,
      modules,
      refetch: fetchLabelsAndModules,
    }),
    [labels, modules, isLoading, error, isModuleEnabled]
  );

  return (
    <LabelContext.Provider value={value}>{children}</LabelContext.Provider>
  );
}

export function useLabels(): LabelContextType {
  const context = useContext(LabelContext);
  if (!context) {
    // Fallback safe dummy context if accessed outside LabelProvider
    return {
      error: null,
      getLabel: (key: string, defaultText?: string) => defaultText ?? key,
      getModuleDisplayName: (moduleKey: string, defaultText?: string) =>
        defaultText ??
        DEFAULT_MODULE_NAMES[moduleKey.toLowerCase()] ??
        moduleKey,
      isLoading: false,
      isModuleEnabled: () => true,
      labels: null,
      modules: [],
      refetch: async () => {},
    };
  }
  return context;
}
