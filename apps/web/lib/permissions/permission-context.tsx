"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ApiClient,
  type TenantDto,
  type UserProfileDto,
} from "@/lib/api-client";

interface PermissionContextType {
  activeTenant: TenantDto | null;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  profile: UserProfileDto | null;
  refreshProfile: () => Promise<void>;
  refreshTenants: () => Promise<void>;
  setActiveTenant: (tenant: TenantDto) => void;
  tenants: TenantDto[];
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

export function PermissionProvider({
  children,
  initialTenantSlug,
}: {
  children: React.ReactNode;
  initialTenantSlug?: string;
}) {
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [activeTenant, setActiveTenantState] = useState<TenantDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeTenantRef = useRef<TenantDto | null>(null);
  activeTenantRef.current = activeTenant;

  const refreshTenants = useCallback(async () => {
    const res = await ApiClient.getMyTenants();
    if (res.success && res.data) {
      setTenants(res.data);
      if (!activeTenantRef.current && res.data.length > 0) {
        const found = initialTenantSlug
          ? res.data.find((t) => t.slug === initialTenantSlug) || res.data[0]
          : res.data[0];
        if (found) {
          setActiveTenantState(found);
        }
      }
    }
  }, [initialTenantSlug]);

  const refreshProfile = useCallback(async () => {
    const current = activeTenantRef.current;
    if (!current) {
      return;
    }
    const res = await ApiClient.getProfile(current.id);
    if (res.success && res.data) {
      setProfile(res.data);
    }
  }, []);

  const setActiveTenant = (tenant: TenantDto) => {
    setActiveTenantState(tenant);
  };

  // Load tenants on mount
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setIsLoading(true);
      await refreshTenants();
      if (isMounted) {
        setIsLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [refreshTenants]);

  // Fetch profile when active tenant changes
  useEffect(() => {
    if (activeTenant?.id) {
      refreshProfile();
    }
  }, [activeTenant?.id, refreshProfile]);

  const isSuperAdmin = (() => {
    if (!profile) {
      return false;
    }
    // Direct boolean flag from API (profile.isSuperAdmin)
    const raw = profile as unknown as { isSuperAdmin?: boolean };
    if (raw.isSuperAdmin === true) {
      return true;
    }
    // Roles include Super Admin variants
    if (
      profile.roles?.includes("Super Admin") ||
      profile.roles?.includes("SuperAdmin") ||
      profile.roles?.some(
        (r) => r.toLowerCase().replace(/\s+/g, "") === "superadmin"
      )
    ) {
      return true;
    }
    // Wildcard permission also implies super admin
    if (profile.permissions?.includes("*")) {
      return true;
    }
    return false;
  })();

  const hasPermission = (permissionCode: string): boolean => {
    if (activeTenant?.isOwner) {
      return true;
    }
    if (isSuperAdmin) {
      return true;
    }
    if (!profile) {
      return false;
    }
    if (
      profile.roles?.includes("Owner") ||
      profile.roles?.includes("Admin") ||
      profile.permissions?.includes("*")
    ) {
      return true;
    }
    return profile.permissions?.includes(permissionCode) ?? false;
  };

  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    if (activeTenant?.isOwner) {
      return true;
    }
    if (isSuperAdmin) {
      return true;
    }
    if (!profile) {
      return false;
    }
    if (
      profile.roles?.includes("Owner") ||
      profile.roles?.includes("Admin") ||
      profile.permissions?.includes("*")
    ) {
      return true;
    }
    return permissionCodes.some((code) => profile.permissions?.includes(code));
  };

  return (
    <PermissionContext.Provider
      value={{
        activeTenant,
        hasAnyPermission,
        hasPermission,
        isLoading,
        isSuperAdmin,
        profile,
        refreshProfile,
        refreshTenants,
        setActiveTenant,
        tenants,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
