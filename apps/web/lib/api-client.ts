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

  // ==========================================
  // Customers Module
  // ==========================================
  static async getCustomers(
    tenantId: string,
    params?: {
      type?: string
      status?: string
      tier?: string
      industry?: string
      assignedEmployeeId?: string
      search?: string
      page?: number
      pageSize?: number
    }
  ): Promise<ApiResponse<PagedCustomersResponse>> {
    const query = new URLSearchParams()
    if (params?.type) query.set("type", params.type)
    if (params?.status) query.set("status", params.status)
    if (params?.tier) query.set("tier", params.tier)
    if (params?.industry) query.set("industry", params.industry)
    if (params?.assignedEmployeeId) query.set("assignedEmployeeId", params.assignedEmployeeId)
    if (params?.search) query.set("search", params.search)
    if (params?.page) query.set("page", params.page.toString())
    if (params?.pageSize) query.set("pageSize", params.pageSize.toString())
    const qs = query.toString()
    const url = `/api/customers${qs ? `?${qs}` : ""}`
    return ApiClient.request<PagedCustomersResponse>(url, {}, tenantId)
  }

  static async getCustomerById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<CustomerDetailDto>> {
    return ApiClient.request<CustomerDetailDto>(`/api/customers/${id}`, {}, tenantId)
  }

  static async getCustomerStats(
    tenantId: string
  ): Promise<ApiResponse<CustomerStatsDto>> {
    return ApiClient.request<CustomerStatsDto>("/api/customers/stats", {}, tenantId)
  }

  static async createCustomer(
    data: CreateCustomerRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/customers",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async updateCustomer(
    id: string,
    data: UpdateCustomerRequest,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/customers/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    )
  }

  static async deleteCustomer(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/customers/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  static async addCustomerContact(
    customerId: string,
    data: AddCustomerContactRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/customers/${customerId}/contacts`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async deleteCustomerContact(
    customerId: string,
    contactId: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/customers/${customerId}/contacts/${contactId}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  static async addCustomerNote(
    customerId: string,
    data: AddCustomerNoteRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/customers/${customerId}/notes`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async addCustomerActivity(
    customerId: string,
    data: AddCustomerActivityRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/customers/${customerId}/activities`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  // ==========================================
  // Products Module
  // ==========================================
  static async getProducts(
    params: {
      type?: string
      categoryId?: string
      status?: string
      stockStatus?: string
      search?: string
      page?: number
      pageSize?: number
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedProductsResponse>> {
    const query = new URLSearchParams()
    if (params.type) query.set("type", params.type)
    if (params.categoryId) query.set("categoryId", params.categoryId)
    if (params.status) query.set("status", params.status)
    if (params.stockStatus) query.set("stockStatus", params.stockStatus)
    if (params.search) query.set("search", params.search)
    if (params.page) query.set("page", params.page.toString())
    if (params.pageSize) query.set("pageSize", params.pageSize.toString())
    const qs = query.toString()
    const url = `/api/products${qs ? `?${qs}` : ""}`
    return ApiClient.request<PagedProductsResponse>(url, {}, tenantId)
  }

  static async getProductById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<ProductDetailDto>> {
    return ApiClient.request<ProductDetailDto>(`/api/products/${id}`, {}, tenantId)
  }

  static async getProductStats(
    tenantId: string
  ): Promise<ApiResponse<ProductStatsDto>> {
    return ApiClient.request<ProductStatsDto>("/api/products/stats", {}, tenantId)
  }

  static async createProduct(
    data: CreateProductRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/products",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async updateProduct(
    id: string,
    data: UpdateProductRequest,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/products/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    )
  }

  static async deleteProduct(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/products/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  static async adjustProductStock(
    productId: string,
    data: AdjustProductStockRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/products/${productId}/stock-adjustments`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async getProductCategories(
    tenantId: string
  ): Promise<ApiResponse<ProductCategoryDto[]>> {
    return ApiClient.request<ProductCategoryDto[]>("/api/products/categories", {}, tenantId)
  }

  static async createProductCategory(
    data: CreateProductCategoryRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/products/categories",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async deleteProductCategory(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/products/categories/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  static async addProductVariant(
    productId: string,
    data: AddProductVariantRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/products/${productId}/variants`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async deleteProductVariant(
    productId: string,
    variantId: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/products/${productId}/variants/${variantId}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  // ==========================================
  // Orders Module
  // ==========================================
  static async getOrders(
    params: {
      status?: string
      paymentStatus?: string
      customerId?: string
      search?: string
      page?: number
      pageSize?: number
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedOrdersResponse>> {
    const query = new URLSearchParams()
    if (params.status) query.set("status", params.status)
    if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus)
    if (params.customerId) query.set("customerId", params.customerId)
    if (params.search) query.set("search", params.search)
    if (params.page) query.set("page", params.page.toString())
    if (params.pageSize) query.set("pageSize", params.pageSize.toString())
    const qs = query.toString()
    const url = `/api/orders${qs ? `?${qs}` : ""}`
    return ApiClient.request<PagedOrdersResponse>(url, {}, tenantId)
  }

  static async getOrderById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<OrderDetailDto>> {
    return ApiClient.request<OrderDetailDto>(`/api/orders/${id}`, {}, tenantId)
  }

  static async getOrderStats(
    tenantId: string
  ): Promise<ApiResponse<OrderStatsDto>> {
    return ApiClient.request<OrderStatsDto>("/api/orders/stats", {}, tenantId)
  }

  static async createOrder(
    data: CreateOrderRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/orders",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async updateOrder(
    id: string,
    data: UpdateOrderRequest,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/orders/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    )
  }

  static async changeOrderStatus(
    id: string,
    data: ChangeOrderStatusRequest,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/orders/${id}/status`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async addOrderPayment(
    orderId: string,
    data: AddOrderPaymentRequest,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/orders/${orderId}/payments`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async deleteOrder(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/orders/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    )
  }

  // ==========================================
  // Leaves Module
  // ==========================================
  static async getLeaveRequests(
    params: {
      status?: string
      leaveType?: string
      employeeId?: string
      departmentId?: string
      search?: string
      page?: number
      pageSize?: number
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedLeaveRequestsResponse>> {
    const query = new URLSearchParams()
    if (params.status) query.set("status", params.status)
    if (params.leaveType) query.set("leaveType", params.leaveType)
    if (params.employeeId) query.set("employeeId", params.employeeId)
    if (params.departmentId) query.set("departmentId", params.departmentId)
    if (params.search) query.set("search", params.search)
    if (params.page) query.set("page", params.page.toString())
    if (params.pageSize) query.set("pageSize", params.pageSize.toString())
    const qs = query.toString()
    const url = `/api/leaves${qs ? `?${qs}` : ""}`
    return ApiClient.request<PagedLeaveRequestsResponse>(url, {}, tenantId)
  }

  static async getLeaveCalendar(
    params: {
      year?: number
      month?: number
      startDate?: string
      endDate?: string
      departmentId?: string
      status?: string
    } = {},
    tenantId: string
  ): Promise<ApiResponse<LeaveCalendarEventDto[]>> {
    const query = new URLSearchParams()
    if (params.year) query.set("year", params.year.toString())
    if (params.month) query.set("month", params.month.toString())
    if (params.startDate) query.set("startDate", params.startDate)
    if (params.endDate) query.set("endDate", params.endDate)
    if (params.departmentId) query.set("departmentId", params.departmentId)
    if (params.status) query.set("status", params.status)
    const qs = query.toString()
    const url = `/api/leaves/calendar${qs ? `?${qs}` : ""}`
    return ApiClient.request<LeaveCalendarEventDto[]>(url, {}, tenantId)
  }

  static async getLeaveStats(
    tenantId: string
  ): Promise<ApiResponse<LeaveStatsDto>> {
    return ApiClient.request<LeaveStatsDto>("/api/leaves/stats", {}, tenantId)
  }

  static async getMyLeaveBalance(
    params: { employeeId?: string; year?: number } = {},
    tenantId: string
  ): Promise<ApiResponse<LeaveBalanceDto>> {
    const query = new URLSearchParams()
    if (params.employeeId) query.set("employeeId", params.employeeId)
    if (params.year) query.set("year", params.year.toString())
    const qs = query.toString()
    const url = `/api/leaves/my-balance${qs ? `?${qs}` : ""}`
    return ApiClient.request<LeaveBalanceDto>(url, {}, tenantId)
  }

  static async createLeaveRequest(
    data: CreateLeaveRequestPayload,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/leaves",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async approveLeaveRequest(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/leaves/${id}/approve`,
      {
        method: "POST",
      },
      tenantId
    )
  }

  static async rejectLeaveRequest(
    id: string,
    data: { rejectionReason: string },
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/leaves/${id}/reject`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    )
  }

  static async cancelLeaveRequest(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/leaves/${id}/cancel`,
      {
        method: "POST",
      },
      tenantId
    )
  }
}

export interface CustomerListDto {
  assignedEmployeeId?: string
  assignedEmployeeName?: string
  city?: string
  contactsCount: number
  country?: string
  createdAt: string
  currency: string
  dealsCount: number
  email?: string
  id: string
  industry?: string
  name: string
  notesCount: number
  phone?: string
  status: "Lead" | "Active" | "Passive" | "Churned" | string
  tags?: string[]
  tenantId: string
  tier: "VIP" | "Enterprise" | "SME" | "Standard" | string
  totalRevenue: number
  type: "Company" | "Individual" | string
  updatedAt: string
  website?: string
}

export interface PagedCustomersResponse {
  items: CustomerListDto[]
  page: number
  pageSize: number
  totalCount: number
}

export interface CustomerContactDto {
  createdAt: string
  customerId: string
  department?: string
  email?: string
  firstName: string
  fullName: string
  id: string
  isPrimary: boolean
  lastName: string
  mobile?: string
  notes?: string
  phone?: string
  title?: string
}

export interface CustomerActivityDto {
  activityType: "Call" | "Meeting" | "Email" | "Note" | "StatusChange" | "DealCreated" | string
  createdAt: string
  customerId: string
  description?: string
  id: string
  performedAt: string
  title: string
  userId?: string
}

export interface CustomerNoteDto {
  content: string
  createdAt: string
  customerId: string
  id: string
  isPinned: boolean
  updatedAt: string
  userId?: string
}

export interface CustomerDetailDto {
  activities: CustomerActivityDto[]
  addressLine?: string
  assignedEmployeeAvatar?: string
  assignedEmployeeId?: string
  assignedEmployeeName?: string
  assignedUserId?: string
  city?: string
  contacts: CustomerContactDto[]
  country?: string
  createdAt: string
  currency: string
  dealsCount: number
  email?: string
  id: string
  industry?: string
  name: string
  notes: CustomerNoteDto[]
  notesCount: number
  phone?: string
  postalCode?: string
  state?: string
  status: "Lead" | "Active" | "Passive" | "Churned" | string
  tags?: string[]
  taxNumber?: string
  taxOffice?: string
  tenantId: string
  tier: "VIP" | "Enterprise" | "SME" | "Standard" | string
  totalRevenue: number
  type: "Company" | "Individual" | string
  updatedAt: string
  website?: string
}

export interface CustomerStatsDto {
  activeCustomers: number
  averageRevenuePerCustomer: number
  churnedCustomers: number
  companiesCount: number
  currency: string
  enterpriseCount: number
  individualsCount: number
  leadCustomers: number
  totalCustomers: number
  totalRevenue: number
  vipCount: number
}

export interface CreateCustomerRequest {
  addressLine?: string
  assignedEmployeeId?: string
  city?: string
  country?: string
  email?: string
  industry?: string
  initialContactEmail?: string
  initialContactFirstName?: string
  initialContactLastName?: string
  initialContactPhone?: string
  initialContactTitle?: string
  name: string
  phone?: string
  postalCode?: string
  state?: string
  status: string
  tags?: string[]
  taxNumber?: string
  taxOffice?: string
  tier: string
  type: string
  website?: string
}

export interface UpdateCustomerRequest {
  addressLine?: string
  assignedEmployeeId?: string
  city?: string
  country?: string
  email?: string
  industry?: string
  name: string
  phone?: string
  postalCode?: string
  state?: string
  status: string
  tags?: string[]
  taxNumber?: string
  taxOffice?: string
  tier: string
  type: string
  website?: string
}

export interface AddCustomerContactRequest {
  department?: string
  email?: string
  firstName: string
  isPrimary: boolean
  lastName: string
  mobile?: string
  notes?: string
  phone?: string
  title?: string
}

export interface AddCustomerNoteRequest {
  content: string
  isPinned?: boolean
}

export interface AddCustomerActivityRequest {
  activityType: string
  description?: string
  performedAt?: string
  title: string
}

// ==========================================
// Product DTOs
// ==========================================
export interface ProductCategoryDto {
  createdAt: string
  description?: string
  fullPath?: string
  icon?: string
  id: string
  isActive: boolean
  name: string
  parentId?: string
  parentName?: string
  productsCount: number
  slug: string
  tenantId: string
  updatedAt: string
}

export interface ProductListDto {
  availableStock: number
  barcode?: string
  brand?: string
  categoryId?: string
  categoryName?: string
  costPrice: number
  createdAt: string
  currency: string
  currentStock: number
  discountRate: number
  id: string
  images?: string[]
  isLowStock: boolean
  minStockLevel: number
  name: string
  profitMargin: number
  reservedStock: number
  sellingPrice: number
  sku?: string
  status: "Active" | "Inactive" | "Draft" | "Discontinued" | string
  tags?: string[]
  taxRate: number
  tenantId: string
  trackInventory: boolean
  type: "Physical" | "Service" | "Digital" | "Subscription" | string
  unit: string
  updatedAt: string
  variantsCount: number
}

export interface PagedProductsResponse {
  items: ProductListDto[]
  page: number
  pageSize: number
  totalCount: number
}

export interface ProductVariantDetailDto {
  additionalPrice: number
  attributes?: string
  barcode?: string
  createdAt: string
  id: string
  isActive: boolean
  name: string
  productId: string
  sku?: string
  stockQuantity: number
}

export interface ProductStockMovementDto {
  createdAt: string
  id: string
  movementType: "In" | "Out" | "Adjustment" | "Return" | string
  newStock: number
  notes?: string
  performedByUserId?: string
  previousStock: number
  productId: string
  quantity: number
  reason?: string
  referenceNumber?: string
  unitCost?: number
  variantId?: string
  variantName?: string
}

export interface ProductDetailDto {
  attributes?: string
  availableStock: number
  barcode?: string
  brand?: string
  categoryId?: string
  categoryName?: string
  costPrice: number
  createdAt: string
  currency: string
  currentStock: number
  description?: string
  discountRate: number
  id: string
  images?: string[]
  isLowStock: boolean
  minStockLevel: number
  name: string
  profitMargin: number
  reservedStock: number
  sellingPrice: number
  sku?: string
  status: "Active" | "Inactive" | "Draft" | "Discontinued" | string
  stockMovements: ProductStockMovementDto[]
  tags?: string[]
  taxRate: number
  tenantId: string
  trackInventory: boolean
  type: "Physical" | "Service" | "Digital" | "Subscription" | string
  unit: string
  updatedAt: string
  variants: ProductVariantDetailDto[]
}

export interface ProductStatsDto {
  currency: string
  digitalProductsCount: number
  lowStockCount: number
  outOfStockCount: number
  physicalProductsCount: number
  servicesCount: number
  subscriptionsCount: number
  totalInventoryValue: number
  totalProducts: number
  totalRetailValue: number
}

export interface CreateProductRequest {
  attributes?: string
  barcode?: string
  brand?: string
  categoryId?: string
  costPrice: number
  currency?: string
  description?: string
  discountRate?: number
  images?: string[]
  initialStock?: number
  minStockLevel?: number
  name: string
  sellingPrice: number
  sku?: string
  status?: string
  tags?: string[]
  taxRate?: number
  trackInventory?: boolean
  type: string
  unit: string
}

export interface UpdateProductRequest {
  attributes?: string
  barcode?: string
  brand?: string
  categoryId?: string
  costPrice: number
  currency?: string
  description?: string
  discountRate?: number
  images?: string[]
  minStockLevel?: number
  name: string
  sellingPrice: number
  sku?: string
  status?: string
  tags?: string[]
  taxRate?: number
  trackInventory?: boolean
  type: string
  unit: string
}

export interface CreateProductCategoryRequest {
  description?: string
  icon?: string
  name: string
  parentId?: string
}

export interface AdjustProductStockRequest {
  movementType: "In" | "Out" | "Adjustment" | "Return" | string
  notes?: string
  quantity: number
  reason?: string
  referenceNumber?: string
  unitCost?: number
  variantId?: string
}

export interface AddProductVariantRequest {
  additionalPrice?: number
  attributes?: string
  barcode?: string
  name: string
  sku?: string
  stockQuantity?: number
}

// ==========================================
// Order DTOs
// ==========================================
export interface OrderListDto {
  carrier?: string
  createdAt: string
  currency: string
  customerId?: string
  customerName: string
  discountAmount: number
  dueDate?: string
  id: string
  invoiceNumber?: string
  itemsCount: number
  orderDate: string
  orderNumber: string
  paidAmount: number
  paymentMethod: "BankTransfer" | "CreditCard" | "Cash" | "Check" | "OpenAccount" | string
  paymentStatus: "Unpaid" | "PartiallyPaid" | "Paid" | "Refunded" | string
  remainingAmount: number
  shippingFee: number
  status: "Draft" | "PendingApproval" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded" | string
  subtotal: number
  taxAmount: number
  tenantId: string
  totalAmount: number
  trackingNumber?: string
  updatedAt: string
}

export interface PagedOrdersResponse {
  items: OrderListDto[]
  page: number
  pageSize: number
  totalCount: number
}

export interface OrderItemDetailDto {
  createdAt: string
  discountAmount: number
  discountRate: number
  id: string
  optionsOrNotes?: string
  orderId: string
  productId?: string
  productName: string
  quantity: number
  sku?: string
  taxAmount: number
  taxRate: number
  totalPrice: number
  unit: string
  unitCost: number
  unitPrice: number
  variantId?: string
}

export interface OrderPaymentDetailDto {
  amount: number
  createdAt: string
  id: string
  notes?: string
  orderId: string
  paymentDate: string
  paymentMethod: string
  referenceNumber?: string
}

export interface OrderActivityDetailDto {
  activityType: string
  createdAt: string
  description?: string
  id: string
  orderId: string
  title: string
}

export interface OrderDetailDto {
  activities: OrderActivityDetailDto[]
  billingAddress?: string
  carrier?: string
  createdAt: string
  currency: string
  customerId?: string
  customerName: string
  discountAmount: number
  dueDate?: string
  id: string
  invoiceNumber?: string
  items: OrderItemDetailDto[]
  notes?: string
  orderDate: string
  orderNumber: string
  paidAmount: number
  paymentMethod: string
  paymentStatus: string
  payments: OrderPaymentDetailDto[]
  remainingAmount: number
  shippingAddress?: string
  shippingFee: number
  status: string
  subtotal: number
  taxAmount: number
  tenantId: string
  totalAmount: number
  trackingNumber?: string
  updatedAt: string
}

export interface OrderStatsDto {
  cancelledOrders: number
  confirmedOrders: number
  currency: string
  deliveredOrders: number
  paidRevenue: number
  pendingOrders: number
  processingOrders: number
  shippedOrders: number
  totalOrders: number
  totalRevenue: number
  unpaidRevenue: number
}

export interface CreateOrderItemRequest {
  discountRate?: number
  optionsOrNotes?: string
  productId?: string
  productName: string
  quantity: number
  sku?: string
  taxRate?: number
  unit?: string
  unitCost?: number
  unitPrice: number
  variantId?: string
}

export interface CreateOrderRequest {
  billingAddress?: string
  carrier?: string
  currency?: string
  customerId?: string
  customerName: string
  dueDate?: string
  generalDiscountAmount?: number
  invoiceNumber?: string
  items: CreateOrderItemRequest[]
  notes?: string
  orderDate?: string
  paymentMethod?: string
  shippingAddress?: string
  shippingFee?: number
  status?: string
  trackingNumber?: string
}

export interface UpdateOrderItemDto {
  discountRate?: number
  id?: string
  optionsOrNotes?: string
  productId?: string
  productName: string
  quantity: number
  sku?: string
  taxRate?: number
  unit?: string
  unitCost?: number
  unitPrice: number
  variantId?: string
}

export interface UpdateOrderRequest {
  billingAddress?: string
  carrier?: string
  currency?: string
  customerId?: string
  customerName: string
  dueDate?: string
  generalDiscountAmount?: number
  invoiceNumber?: string
  items: UpdateOrderItemDto[]
  notes?: string
  orderDate?: string
  paymentMethod?: string
  shippingAddress?: string
  shippingFee?: number
  trackingNumber?: string
}

export interface ChangeOrderStatusRequest {
  newStatus: string
  notes?: string
}

export interface AddOrderPaymentRequest {
  amount: number
  notes?: string
  paymentDate?: string
  paymentMethod?: string
  referenceNumber?: string
}

// ==========================================
// Leave DTOs
// ==========================================
export interface LeaveBalanceDto {
  employeeId: string
  id: string
  pendingDays: number
  remainingDays: number
  totalDays: number
  usedDays: number
  year: number
}

export interface LeaveRequestDto {
  approvedAt?: string
  approvedByUserId?: string
  approvedByUserName?: string
  createdAt: string
  departmentId?: string
  departmentName?: string
  emergencyContact?: string
  employeeId: string
  employeeName: string
  endDate: string
  halfDayPeriod?: "Morning" | "Afternoon" | string
  id: string
  isHalfDay: boolean
  leaveType: "Annual" | "Casual" | "Sick" | "Unpaid" | "Marriage" | "Maternity" | "Paternity" | "Bereavement" | "Other" | string
  reason?: string
  rejectionReason?: string
  startDate: string
  status: "Pending" | "Approved" | "Rejected" | "Cancelled" | string
  tenantId: string
  totalDays: number
  updatedAt: string
}

export interface PagedLeaveRequestsResponse {
  items: LeaveRequestDto[]
  page: number
  pageSize: number
  totalCount: number
}

export interface LeaveCalendarEventDto {
  departmentId?: string
  departmentName?: string
  employeeId: string
  employeeName: string
  endDate: string
  halfDayPeriod?: string
  id: string
  isHalfDay: boolean
  leaveType: string
  reason?: string
  startDate: string
  status: string
  totalDays: number
}

export interface LeaveStatsDto {
  pendingRequestsCount: number
  thisMonthUsedDays: number
  todayOnLeaveCount: number
  totalApprovedRequests: number
}

export interface CreateLeaveRequestPayload {
  departmentId?: string
  departmentName?: string
  emergencyContact?: string
  employeeId: string
  employeeName: string
  endDate: string
  halfDayPeriod?: string
  isHalfDay?: boolean
  leaveType: string
  reason?: string
  startDate: string
}




