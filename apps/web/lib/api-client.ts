import { createClient } from "./supabase/client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface ApiResponse<T> {
  data?: T
  errorCode?: string
  message?: string
  success: boolean
}

export interface TenantDto {
  createdAt: string
  id: string
  isActive: boolean
  isOwner: boolean
  logoUrl?: string
  name: string
  slug: string
}

export interface PermissionDto {
  code: string
  description?: string
  id: string
  module: string
  name: string
}

export interface PermissionGroupDto {
  module: string
  permissions: PermissionDto[]
}

export interface RoleDto {
  createdAt: string
  description?: string
  id: string
  isDefault: boolean
  memberCount: number
  name: string
  permissions: PermissionDto[]
  tenantId: string
}

export interface TenantUserDto {
  avatarUrl?: string
  createdAt: string
  email: string
  fullName?: string
  id: string
  isActive: boolean
  roles: { id: string; name: string }[]
}

export interface UserProfileDto {
  avatarUrl?: string
  email: string
  fullName?: string
  id: string
  permissions: string[]
  roles: string[]
}

export interface DepartmentDto {
  code?: string
  costCenter?: string
  createdAt: string
  description?: string
  employeeCount: number
  id: string
  leadAvatarUrl?: string
  leadId?: string
  leadName?: string
  name: string
  parentId?: string
  parentName?: string
  subDepartmentCount: number
  subDepartments?: DepartmentDto[]
  tenantId: string
}

export interface JobPositionDto {
  createdAt: string
  departmentId?: string
  departmentName?: string
  employeeCount: number
  id: string
  jobDescription?: string
  level: string
  maxSalary?: number
  minSalary?: number
  tenantId: string
  title: string
}

export interface EmployeeDto {
  avatarUrl?: string
  createdAt: string
  currency: string
  departmentId?: string
  departmentName?: string
  directReportCount: number
  email: string
  employeeNumber?: string
  employmentType: string
  firstName: string
  fullName: string
  hireDate?: string
  id: string
  jobPositionId?: string
  jobPositionTitle?: string
  lastName: string
  level?: string
  managerId?: string
  managerName?: string
  phone?: string
  salary?: number
  status: string
  tenantId: string
  title?: string
  userId?: string
}

export interface DirectReportSummaryDto {
  avatarUrl?: string
  email: string
  fullName: string
  id: string
  status: string
  title?: string
}

export interface EmployeeDetailDto extends EmployeeDto {
  directReports: DirectReportSummaryDto[]
  managerAvatarUrl?: string
  updatedAt: string
}

export interface PagedEmployeesResponse {
  items: EmployeeDto[]
  page: number
  pageSize: number
  totalCount: number
}

export interface OrgChartNodeDto {
  avatarUrl?: string
  departmentCode?: string
  departmentId?: string
  departmentName?: string
  directReports: OrgChartNodeDto[]
  directReportsCount: number
  email: string
  employeeNumber?: string
  employmentType: string
  fullName: string
  id: string
  level?: string
  phone?: string
  status: string
  title?: string
  totalSubordinatesCount: number
}

export class ApiClient {
  private static cachedToken: string | null = null
  private static tokenExpiresAt = 0

  private static async getAuthToken(): Promise<string | null> {
    try {
      const now = Date.now()
      if (ApiClient.cachedToken && ApiClient.tokenExpiresAt > now) {
        return ApiClient.cachedToken
      }

      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      ApiClient.cachedToken = data.session?.access_token || null
      ApiClient.tokenExpiresAt = now + 15000 // Cache for 15s
      return ApiClient.cachedToken
    } catch {
      return null
    }
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    tenantId?: string
  ): Promise<ApiResponse<T>> {
    const token = await ApiClient.getAuthToken()

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
          errorCode:
            errorJson.errorCode || errorJson.title || `HTTP_${res.status}`,
          message: errorJson.message || errorJson.detail || "An error occurred",
          success: false,
        }
      } catch {
        return {
          errorCode: `HTTP_${res.status}`,
          message: res.statusText || "Request failed",
          success: false,
        }
      }
    }

    return await res.json()
  }

  // Tenants
  static async getMyTenants(): Promise<ApiResponse<TenantDto[]>> {
    return ApiClient.request<TenantDto[]>("/api/tenants/me")
  }

  static async getTenantBySlug(slug: string): Promise<ApiResponse<TenantDto>> {
    return ApiClient.request<TenantDto>(`/api/tenants/by-slug/${slug}`)
  }

  static async createTenant(
    name: string,
    slug?: string,
    logoUrl?: string
  ): Promise<ApiResponse<TenantDto>> {
    return ApiClient.request<TenantDto>("/api/tenants", {
      body: JSON.stringify({ logoUrl, name, slug }),
      method: "POST",
    })
  }

  static async updateTenant(
    id: string,
    name: string,
    logoUrl?: string,
    tenantId?: string
  ): Promise<ApiResponse<TenantDto>> {
    return ApiClient.request<TenantDto>(
      `/api/tenants/${id}`,
      {
        body: JSON.stringify({ id, logoUrl, name }),
        method: "PUT",
      },
      tenantId
    )
  }

  // Identity & Users
  static async getProfile(
    tenantId?: string
  ): Promise<ApiResponse<UserProfileDto>> {
    return ApiClient.request<UserProfileDto>(
      "/api/identity/profile",
      {},
      tenantId
    )
  }

  static async getTenantUsers(
    tenantId: string
  ): Promise<ApiResponse<TenantUserDto[]>> {
    return ApiClient.request<TenantUserDto[]>(
      "/api/identity/users",
      {},
      tenantId
    )
  }

  static async inviteUser(
    email: string,
    roleId: string,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/identity/users/invite",
      {
        body: JSON.stringify({ email, roleId }),
        method: "POST",
      },
      tenantId
    )
  }

  static async assignUserRole(
    userId: string,
    roleId: string,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/identity/users/${userId}/role`,
      {
        body: JSON.stringify({ roleId, userId }),
        method: "POST",
      },
      tenantId
    )
  }

  // Roles & Permissions
  static async getRoles(tenantId: string): Promise<ApiResponse<RoleDto[]>> {
    return ApiClient.request<RoleDto[]>("/api/identity/roles", {}, tenantId)
  }

  static async getAllPermissions(): Promise<ApiResponse<PermissionGroupDto[]>> {
    return ApiClient.request<PermissionGroupDto[]>("/api/identity/permissions")
  }

  static async createRole(
    name: string,
    description: string | undefined,
    permissionIds: string[],
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/identity/roles",
      {
        body: JSON.stringify({ description, name, permissionIds }),
        method: "POST",
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
    return ApiClient.request<string>(
      `/api/identity/roles/${roleId}/permissions`,
      {
        body: JSON.stringify({ description, name, permissionIds, roleId }),
        method: "PUT",
      },
      tenantId
    )
  }

  static async deleteRole(
    roleId: string,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/identity/roles/${roleId}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  // ==========================================
  // Organization - Departments
  // ==========================================
  static async getDepartments(
    tenantId: string,
    asTree = false
  ): Promise<ApiResponse<DepartmentDto[]>> {
    const url = `/api/organization/departments${asTree ? "?asTree=true" : ""}`
    return ApiClient.request<DepartmentDto[]>(url, {}, tenantId)
  }

  static async createDepartment(
    data: {
      name: string
      code?: string
      description?: string
      parentId?: string
      leadId?: string
      costCenter?: string
    },
    tenantId: string
  ): Promise<ApiResponse<DepartmentDto>> {
    return ApiClient.request<DepartmentDto>(
      "/api/organization/departments",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async updateDepartment(
    id: string,
    data: {
      name: string
      code?: string
      description?: string
      parentId?: string
      leadId?: string
      costCenter?: string
    },
    tenantId: string
  ): Promise<ApiResponse<DepartmentDto>> {
    return ApiClient.request<DepartmentDto>(
      `/api/organization/departments/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    )
  }

  static async deleteDepartment(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/organization/departments/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  // ==========================================
  // Organization - Job Positions
  // ==========================================
  static async getJobPositions(
    tenantId: string,
    departmentId?: string
  ): Promise<ApiResponse<JobPositionDto[]>> {
    const url = `/api/organization/positions${departmentId ? `?departmentId=${departmentId}` : ""}`
    return ApiClient.request<JobPositionDto[]>(url, {}, tenantId)
  }

  static async createJobPosition(
    data: {
      title: string
      level: string
      departmentId?: string
      jobDescription?: string
      minSalary?: number
      maxSalary?: number
    },
    tenantId: string
  ): Promise<ApiResponse<JobPositionDto>> {
    return ApiClient.request<JobPositionDto>(
      "/api/organization/positions",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async updateJobPosition(
    id: string,
    data: {
      title: string
      level: string
      departmentId?: string
      jobDescription?: string
      minSalary?: number
      maxSalary?: number
    },
    tenantId: string
  ): Promise<ApiResponse<JobPositionDto>> {
    return ApiClient.request<JobPositionDto>(
      `/api/organization/positions/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    )
  }

  static async deleteJobPosition(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/organization/positions/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  // ==========================================
  // Organization - Employees
  // ==========================================
  static async getEmployees(
    params: {
      departmentId?: string
      jobPositionId?: string
      status?: string
      employmentType?: string
      search?: string
      page?: number
      pageSize?: number
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedEmployeesResponse>> {
    const query = new URLSearchParams()
    if (params.departmentId) query.set("departmentId", params.departmentId)
    if (params.jobPositionId) query.set("jobPositionId", params.jobPositionId)
    if (params.status) query.set("status", params.status)
    if (params.employmentType)
      query.set("employmentType", params.employmentType)
    if (params.search) query.set("search", params.search)
    if (params.page) query.set("page", params.page.toString())
    if (params.pageSize) query.set("pageSize", params.pageSize.toString())

    const qs = query.toString()
    const url = `/api/organization/employees${qs ? `?${qs}` : ""}`
    return ApiClient.request<PagedEmployeesResponse>(url, {}, tenantId)
  }

  static async getEmployeeById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<EmployeeDetailDto>> {
    return ApiClient.request<EmployeeDetailDto>(
      `/api/organization/employees/${id}`,
      {},
      tenantId
    )
  }

  static async createEmployee(
    data: {
      firstName: string
      lastName: string
      email: string
      phone?: string
      employeeNumber?: string
      title?: string
      departmentId?: string
      jobPositionId?: string
      managerId?: string
      employmentType?: string
      status?: string
      hireDate?: string
      avatarUrl?: string
      salary?: number
      currency?: string
      userId?: string
    },
    tenantId: string
  ): Promise<ApiResponse<EmployeeDto>> {
    return ApiClient.request<EmployeeDto>(
      "/api/organization/employees",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async updateEmployee(
    id: string,
    data: {
      firstName: string
      lastName: string
      email: string
      phone?: string
      employeeNumber?: string
      title?: string
      departmentId?: string
      jobPositionId?: string
      managerId?: string
      employmentType?: string
      status?: string
      hireDate?: string
      avatarUrl?: string
      salary?: number
      currency?: string
      userId?: string
    },
    tenantId: string
  ): Promise<ApiResponse<EmployeeDto>> {
    return ApiClient.request<EmployeeDto>(
      `/api/organization/employees/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    )
  }

  static async deleteEmployee(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/organization/employees/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  // ==========================================
  // Organization - Org Chart
  // ==========================================
  static async getOrgChart(
    tenantId: string,
    rootId?: string,
    departmentId?: string
  ): Promise<ApiResponse<OrgChartNodeDto[]>> {
    const query = new URLSearchParams()
    if (rootId) query.set("rootId", rootId)
    if (departmentId) query.set("departmentId", departmentId)
    const qs = query.toString()
    const url = `/api/organization/chart${qs ? `?${qs}` : ""}`
    return ApiClient.request<OrgChartNodeDto[]>(url, {}, tenantId)
  }
}
