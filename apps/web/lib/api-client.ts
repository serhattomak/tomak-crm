import { createClient } from "./supabase/client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface ApiResponse<T> {
  success: boolean
  data?: T
  errorCode?: string
  message?: string
}

export interface TenantDto {
  id: string
  name: string
  slug: string
  logoUrl?: string
  isActive: boolean
  isOwner: boolean
  createdAt: string
}

export interface PermissionDto {
  id: string
  code: string
  name: string
  module: string
  description?: string
}

export interface PermissionGroupDto {
  module: string
  permissions: PermissionDto[]
}

export interface RoleDto {
  id: string
  tenantId: string
  name: string
  description?: string
  isDefault: boolean
  permissions: PermissionDto[]
  memberCount: number
  createdAt: string
}

export interface TenantUserDto {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  isActive: boolean
  roles: { id: string; name: string }[]
  createdAt: string
}

export interface UserProfileDto {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  permissions: string[]
  roles: string[]
}

export class ApiClient {
  private static async getAuthToken(): Promise<string | null> {
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token || null
    } catch {
      return null
    }
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    tenantId?: string
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken()

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!res.ok) {
      try {
        const errorJson = await res.json()
        return {
          success: false,
          errorCode:
            errorJson.errorCode || errorJson.title || `HTTP_${res.status}`,
          message: errorJson.message || errorJson.detail || "An error occurred",
        }
      } catch {
        return {
          success: false,
          errorCode: `HTTP_${res.status}`,
          message: res.statusText || "Request failed",
        }
      }
    }

    return await res.json()
  }

  // Tenants
  static async getMyTenants(): Promise<ApiResponse<TenantDto[]>> {
    return this.request<TenantDto[]>("/api/tenants/me")
  }

  static async getTenantBySlug(slug: string): Promise<ApiResponse<TenantDto>> {
    return this.request<TenantDto>(`/api/tenants/by-slug/${slug}`)
  }

  static async createTenant(
    name: string,
    slug?: string,
    logoUrl?: string
  ): Promise<ApiResponse<TenantDto>> {
    return this.request<TenantDto>("/api/tenants", {
      method: "POST",
      body: JSON.stringify({ name, slug, logoUrl }),
    })
  }

  static async updateTenant(
    id: string,
    name: string,
    logoUrl?: string,
    tenantId?: string
  ): Promise<ApiResponse<TenantDto>> {
    return this.request<TenantDto>(
      `/api/tenants/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({ id, name, logoUrl }),
      },
      tenantId
    )
  }

  // Identity & Users
  static async getProfile(
    tenantId?: string
  ): Promise<ApiResponse<UserProfileDto>> {
    return this.request<UserProfileDto>("/api/identity/profile", {}, tenantId)
  }

  static async getTenantUsers(
    tenantId: string
  ): Promise<ApiResponse<TenantUserDto[]>> {
    return this.request<TenantUserDto[]>("/api/identity/users", {}, tenantId)
  }

  static async inviteUser(
    email: string,
    roleId: string,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return this.request<string>(
      "/api/identity/users/invite",
      {
        method: "POST",
        body: JSON.stringify({ email, roleId }),
      },
      tenantId
    )
  }

  static async assignUserRole(
    userId: string,
    roleId: string,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return this.request<string>(
      `/api/identity/users/${userId}/role`,
      {
        method: "POST",
        body: JSON.stringify({ userId, roleId }),
      },
      tenantId
    )
  }

  // Roles & Permissions
  static async getRoles(tenantId: string): Promise<ApiResponse<RoleDto[]>> {
    return this.request<RoleDto[]>("/api/identity/roles", {}, tenantId)
  }

  static async getAllPermissions(): Promise<ApiResponse<PermissionGroupDto[]>> {
    return this.request<PermissionGroupDto[]>("/api/identity/permissions")
  }

  static async createRole(
    name: string,
    description: string | undefined,
    permissionIds: string[],
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return this.request<string>(
      "/api/identity/roles",
      {
        method: "POST",
        body: JSON.stringify({ name, description, permissionIds }),
      },
      tenantId
    )
  }

  static async updateRolePermissions(
    roleId: string,
    name: string | undefined,
    description: string | undefined,
    permissionIds: string[],
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return this.request<string>(
      `/api/identity/roles/${roleId}/permissions`,
      {
        method: "PUT",
        body: JSON.stringify({ roleId, name, description, permissionIds }),
      },
      tenantId
    )
  }

  static async deleteRole(
    roleId: string,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return this.request<string>(
      `/api/identity/roles/${roleId}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }
}
