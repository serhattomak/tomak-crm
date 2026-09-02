import { createClient } from "./supabase/client";

const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    : "";

export interface ApiResponse<T> {
  data?: T;
  errorCode?: string;
  message?: string;
  success: boolean;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface TenantDto {
  createdAt: string;
  id: string;
  isActive: boolean;
  isOwner: boolean;
  logoUrl?: string;
  name: string;
  slug: string;
}

export interface PermissionDto {
  code: string;
  description?: string;
  id: string;
  module: string;
  name: string;
}

export interface PermissionGroupDto {
  module: string;
  permissions: PermissionDto[];
}

export interface RoleDto {
  createdAt: string;
  description?: string;
  id: string;
  isDefault: boolean;
  memberCount: number;
  name: string;
  permissions: PermissionDto[];
  tenantId: string;
}

export interface TenantUserDto {
  avatarUrl?: string;
  createdAt: string;
  email: string;
  fullName?: string;
  id: string;
  isActive: boolean;
  roles: { id: string; name: string }[];
}

export interface UserProfileDto {
  avatarUrl?: string;
  email: string;
  fullName?: string;
  id: string;
  isSuperAdmin?: boolean;
  permissions: string[];
  roles: string[];
}

export interface DepartmentDto {
  code?: string;
  costCenter?: string;
  createdAt: string;
  description?: string;
  employeeCount: number;
  id: string;
  leadAvatarUrl?: string;
  leadId?: string;
  leadName?: string;
  name: string;
  parentId?: string;
  parentName?: string;
  subDepartmentCount: number;
  subDepartments?: DepartmentDto[];
  tenantId: string;
}

export interface JobPositionDto {
  createdAt: string;
  departmentId?: string;
  departmentName?: string;
  employeeCount: number;
  id: string;
  jobDescription?: string;
  level: string;
  maxSalary?: number;
  minSalary?: number;
  tenantId: string;
  title: string;
}

export interface EmployeeDto {
  avatarUrl?: string;
  createdAt: string;
  currency: string;
  departmentId?: string;
  departmentName?: string;
  directReportCount: number;
  email: string;
  employeeNumber?: string;
  employmentType: string;
  firstName: string;
  fullName: string;
  hireDate?: string;
  id: string;
  jobPositionId?: string;
  jobPositionTitle?: string;
  lastName: string;
  level?: string;
  managerId?: string;
  managerName?: string;
  phone?: string;
  salary?: number;
  status: string;
  tenantId: string;
  title?: string;
  userId?: string;
}

export interface DirectReportSummaryDto {
  avatarUrl?: string;
  email: string;
  fullName: string;
  id: string;
  status: string;
  title?: string;
}

export interface EmployeeDetailDto extends EmployeeDto {
  directReports: DirectReportSummaryDto[];
  managerAvatarUrl?: string;
  updatedAt: string;
}

export interface PagedEmployeesResponse {
  items: EmployeeDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface OrgChartNodeDto {
  avatarUrl?: string;
  departmentCode?: string;
  departmentId?: string;
  departmentName?: string;
  directReports: OrgChartNodeDto[];
  directReportsCount: number;
  email: string;
  employeeNumber?: string;
  employmentType: string;
  fullName: string;
  id: string;
  level?: string;
  phone?: string;
  status: string;
  title?: string;
  totalSubordinatesCount: number;
}

export class ApiClient {
  private static cachedToken: string | null = null;
  private static tokenExpiresAt = 0;

  private static async getAuthToken(): Promise<string | null> {
    try {
      const now = Date.now();
      if (ApiClient.cachedToken && ApiClient.tokenExpiresAt > now) {
        return ApiClient.cachedToken;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      ApiClient.cachedToken = data.session?.access_token || null;
      ApiClient.tokenExpiresAt = now + 15_000; // Cache for 15s
      return ApiClient.cachedToken;
    } catch {
      return null;
    }
  }

  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    tenantId?: string
  ): Promise<ApiResponse<T>> {
    const token = await ApiClient.getAuthToken();
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
      headers["X-Tenant-Slug"] = tenantId;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      try {
        const errorJson = await res.json();
        return {
          errorCode:
            errorJson.errorCode || errorJson.title || `HTTP_${res.status}`,
          message: errorJson.message || errorJson.detail || "An error occurred",
          success: false,
        };
      } catch {
        return {
          errorCode: `HTTP_${res.status}`,
          message: res.statusText || "Request failed",
          success: false,
        };
      }
    }

    return await res.json();
  }

  // Tenants
  static async getMyTenants(): Promise<ApiResponse<TenantDto[]>> {
    return ApiClient.request<TenantDto[]>("/api/tenants/me");
  }

  static async getTenantBySlug(slug: string): Promise<ApiResponse<TenantDto>> {
    return ApiClient.request<TenantDto>(`/api/tenants/by-slug/${slug}`);
  }

  static async createTenant(
    name: string,
    slug?: string,
    logoUrl?: string
  ): Promise<ApiResponse<TenantDto>> {
    return ApiClient.request<TenantDto>("/api/tenants", {
      body: JSON.stringify({ logoUrl, name, slug }),
      method: "POST",
    });
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
    );
  }

  // Identity & Users
  static async getProfile(
    tenantId?: string
  ): Promise<ApiResponse<UserProfileDto>> {
    return ApiClient.request<UserProfileDto>(
      "/api/identity/profile",
      {},
      tenantId
    );
  }

  static async getTenantUsers(
    tenantId: string
  ): Promise<ApiResponse<TenantUserDto[]>> {
    return ApiClient.request<TenantUserDto[]>(
      "/api/identity/users",
      {},
      tenantId
    );
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
    );
  }

  static async assignUserRole(
    userId: string,
    roleId: string | null,
    tenantId: string
  ): Promise<ApiResponse<string>> {
    const sanitizedRoleId =
      roleId && roleId.trim() !== "" && roleId !== "none"
        ? roleId.trim()
        : null;
    return ApiClient.request<string>(
      `/api/identity/users/${userId}/role`,
      {
        body: JSON.stringify({ roleId: sanitizedRoleId, userId }),
        method: "POST",
      },
      tenantId
    );
  }

  // Roles & Permissions
  static async getRoles(tenantId: string): Promise<ApiResponse<RoleDto[]>> {
    return ApiClient.request<RoleDto[]>("/api/identity/roles", {}, tenantId);
  }

  static async getAllPermissions(): Promise<ApiResponse<PermissionGroupDto[]>> {
    return ApiClient.request<PermissionGroupDto[]>("/api/identity/permissions");
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
    );
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
    );
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
    );
  }

  // ==========================================
  // Organization - Departments
  // ==========================================
  static async getDepartments(
    tenantId: string,
    asTree = false
  ): Promise<ApiResponse<DepartmentDto[]>> {
    const url = `/api/organization/departments${asTree ? "?asTree=true" : ""}`;
    return ApiClient.request<DepartmentDto[]>(url, {}, tenantId);
  }

  static async createDepartment(
    data: {
      name: string;
      code?: string;
      description?: string;
      parentId?: string;
      leadId?: string;
      costCenter?: string;
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
    );
  }

  static async updateDepartment(
    id: string,
    data: {
      name: string;
      code?: string;
      description?: string;
      parentId?: string;
      leadId?: string;
      costCenter?: string;
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
    );
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
    );
  }

  // ==========================================
  // Organization - Job Positions
  // ==========================================
  static async getJobPositions(
    tenantId: string,
    departmentId?: string
  ): Promise<ApiResponse<JobPositionDto[]>> {
    const url = `/api/organization/positions${departmentId ? `?departmentId=${departmentId}` : ""}`;
    return ApiClient.request<JobPositionDto[]>(url, {}, tenantId);
  }

  static async createJobPosition(
    data: {
      title: string;
      level: string;
      departmentId?: string;
      jobDescription?: string;
      minSalary?: number;
      maxSalary?: number;
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
    );
  }

  static async updateJobPosition(
    id: string,
    data: {
      title: string;
      level: string;
      departmentId?: string;
      jobDescription?: string;
      minSalary?: number;
      maxSalary?: number;
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
    );
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
    );
  }

  // ==========================================
  // Organization - Employees
  // ==========================================
  static async getEmployees(
    params: {
      departmentId?: string;
      jobPositionId?: string;
      status?: string;
      employmentType?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedEmployeesResponse>> {
    const query = new URLSearchParams();
    if (params.departmentId) {
      query.set("departmentId", params.departmentId);
    }
    if (params.jobPositionId) {
      query.set("jobPositionId", params.jobPositionId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.employmentType) {
      query.set("employmentType", params.employmentType);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }

    const qs = query.toString();
    const url = `/api/organization/employees${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedEmployeesResponse>(url, {}, tenantId);
  }

  static async getEmployeeById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<EmployeeDetailDto>> {
    return ApiClient.request<EmployeeDetailDto>(
      `/api/organization/employees/${id}`,
      {},
      tenantId
    );
  }

  static async createEmployee(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      employeeNumber?: string;
      title?: string;
      departmentId?: string;
      jobPositionId?: string;
      managerId?: string;
      employmentType?: string;
      status?: string;
      hireDate?: string;
      avatarUrl?: string;
      salary?: number;
      currency?: string;
      userId?: string;
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
    );
  }

  static async updateEmployee(
    id: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      employeeNumber?: string;
      title?: string;
      departmentId?: string;
      jobPositionId?: string;
      managerId?: string;
      employmentType?: string;
      status?: string;
      hireDate?: string;
      avatarUrl?: string;
      salary?: number;
      currency?: string;
      userId?: string;
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
    );
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
    );
  }

  // ==========================================
  // Organization - Org Chart
  // ==========================================
  static async getOrgChart(
    tenantId: string,
    rootId?: string,
    departmentId?: string
  ): Promise<ApiResponse<OrgChartNodeDto[]>> {
    const query = new URLSearchParams();
    if (rootId) {
      query.set("rootId", rootId);
    }
    if (departmentId) {
      query.set("departmentId", departmentId);
    }
    const qs = query.toString();
    const url = `/api/organization/chart${qs ? `?${qs}` : ""}`;
    return ApiClient.request<OrgChartNodeDto[]>(url, {}, tenantId);
  }

  // ==========================================
  // Customers Module
  // ==========================================
  static async getCustomers(
    tenantId: string,
    params?: {
      type?: string;
      status?: string;
      tier?: string;
      industry?: string;
      assignedEmployeeId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PagedCustomersResponse>> {
    const query = new URLSearchParams();
    if (params?.type) {
      query.set("type", params.type);
    }
    if (params?.status) {
      query.set("status", params.status);
    }
    if (params?.tier) {
      query.set("tier", params.tier);
    }
    if (params?.industry) {
      query.set("industry", params.industry);
    }
    if (params?.assignedEmployeeId) {
      query.set("assignedEmployeeId", params.assignedEmployeeId);
    }
    if (params?.search) {
      query.set("search", params.search);
    }
    if (params?.page) {
      query.set("page", params.page.toString());
    }
    if (params?.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }
    const qs = query.toString();
    const url = `/api/customers${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedCustomersResponse>(url, {}, tenantId);
  }

  static async getCustomerById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<CustomerDetailDto>> {
    return ApiClient.request<CustomerDetailDto>(
      `/api/customers/${id}`,
      {},
      tenantId
    );
  }

  static async getCustomerStats(
    tenantId: string
  ): Promise<ApiResponse<CustomerStatsDto>> {
    return ApiClient.request<CustomerStatsDto>(
      "/api/customers/stats",
      {},
      tenantId
    );
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
    );
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
    );
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
    );
  }

  /** Paralel toplu silme — fulfilled olanlar silinir, rejected olanlar atlanır */
  static async bulkDeleteCustomers(
    ids: string[],
    tenantId: string
  ): Promise<{ deletedCount: number; failedCount: number }> {
    const results = await Promise.allSettled(
      ids.map((id) => ApiClient.deleteCustomer(id, tenantId))
    );
    const deletedCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    return { deletedCount, failedCount: ids.length - deletedCount };
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
    );
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
    );
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
    );
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
    );
  }

  // ==========================================
  // Products Module
  // ==========================================
  static async getProducts(
    params: {
      type?: string;
      categoryId?: string;
      status?: string;
      stockStatus?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedProductsResponse>> {
    const query = new URLSearchParams();
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.categoryId) {
      query.set("categoryId", params.categoryId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.stockStatus) {
      query.set("stockStatus", params.stockStatus);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }
    const qs = query.toString();
    const url = `/api/products${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedProductsResponse>(url, {}, tenantId);
  }

  static async getProductById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<ProductDetailDto>> {
    return ApiClient.request<ProductDetailDto>(
      `/api/products/${id}`,
      {},
      tenantId
    );
  }

  static async getProductStats(
    tenantId: string
  ): Promise<ApiResponse<ProductStatsDto>> {
    return ApiClient.request<ProductStatsDto>(
      "/api/products/stats",
      {},
      tenantId
    );
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
    );
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
    );
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
    );
  }

  /** Paralel toplu silme — fulfilled olanlar silinir, rejected olanlar atlanır */
  static async bulkDeleteProducts(
    ids: string[],
    tenantId: string
  ): Promise<{ deletedCount: number; failedCount: number }> {
    const results = await Promise.allSettled(
      ids.map((id) => ApiClient.deleteProduct(id, tenantId))
    );
    const deletedCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    return { deletedCount, failedCount: ids.length - deletedCount };
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
    );
  }

  static async getProductCategories(
    tenantId: string
  ): Promise<ApiResponse<ProductCategoryDto[]>> {
    return ApiClient.request<ProductCategoryDto[]>(
      "/api/products/categories",
      {},
      tenantId
    );
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
    );
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
    );
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
    );
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
    );
  }

  // ==========================================
  // Orders Module
  // ==========================================
  static async getOrders(
    params: {
      status?: string;
      paymentStatus?: string;
      customerId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedOrdersResponse>> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.paymentStatus) {
      query.set("paymentStatus", params.paymentStatus);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }
    const qs = query.toString();
    const url = `/api/orders${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedOrdersResponse>(url, {}, tenantId);
  }

  static async getOrderById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<OrderDetailDto>> {
    return ApiClient.request<OrderDetailDto>(`/api/orders/${id}`, {}, tenantId);
  }

  static async getOrderStats(
    tenantId: string
  ): Promise<ApiResponse<OrderStatsDto>> {
    return ApiClient.request<OrderStatsDto>("/api/orders/stats", {}, tenantId);
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
    );
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
    );
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
    );
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
    );
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
    );
  }

  /** Paralel toplu silme — fulfilled olanlar silinir, rejected olanlar atlanır */
  static async bulkDeleteOrders(
    ids: string[],
    tenantId: string
  ): Promise<{ deletedCount: number; failedCount: number }> {
    const results = await Promise.allSettled(
      ids.map((id) => ApiClient.deleteOrder(id, tenantId))
    );
    const deletedCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    return { deletedCount, failedCount: ids.length - deletedCount };
  }

  // ==========================================
  // Leaves Module
  // ==========================================
  static async getLeaveRequests(
    params: {
      status?: string;
      leaveType?: string;
      employeeId?: string;
      departmentId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedLeaveRequestsResponse>> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.leaveType) {
      query.set("leaveType", params.leaveType);
    }
    if (params.employeeId) {
      query.set("employeeId", params.employeeId);
    }
    if (params.departmentId) {
      query.set("departmentId", params.departmentId);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }
    const qs = query.toString();
    const url = `/api/leaves${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedLeaveRequestsResponse>(url, {}, tenantId);
  }

  static async getLeaveCalendar(
    params: {
      year?: number;
      month?: number;
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      status?: string;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<LeaveCalendarEventDto[]>> {
    const query = new URLSearchParams();
    if (params.year) {
      query.set("year", params.year.toString());
    }
    if (params.month) {
      query.set("month", params.month.toString());
    }
    if (params.startDate) {
      query.set("startDate", params.startDate);
    }
    if (params.endDate) {
      query.set("endDate", params.endDate);
    }
    if (params.departmentId) {
      query.set("departmentId", params.departmentId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    const qs = query.toString();
    const url = `/api/leaves/calendar${qs ? `?${qs}` : ""}`;
    return ApiClient.request<LeaveCalendarEventDto[]>(url, {}, tenantId);
  }

  static async getLeaveStats(
    tenantId: string
  ): Promise<ApiResponse<LeaveStatsDto>> {
    return ApiClient.request<LeaveStatsDto>("/api/leaves/stats", {}, tenantId);
  }

  static async getMyLeaveBalance(
    params: { employeeId?: string; year?: number } = {},
    tenantId: string
  ): Promise<ApiResponse<LeaveBalanceDto>> {
    const query = new URLSearchParams();
    if (params.employeeId) {
      query.set("employeeId", params.employeeId);
    }
    if (params.year) {
      query.set("year", params.year.toString());
    }
    const qs = query.toString();
    const url = `/api/leaves/my-balance${qs ? `?${qs}` : ""}`;
    return ApiClient.request<LeaveBalanceDto>(url, {}, tenantId);
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
    );
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
    );
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
    );
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
    );
  }

  // ==========================================
  // Payroll API Methods
  // ==========================================
  static async getPayrollParameters(
    year?: number,
    tenantId?: string
  ): Promise<ApiResponse<PayrollParameterDto>> {
    const query = year ? `?year=${year}` : "";
    return ApiClient.request<PayrollParameterDto>(
      `/api/payroll/parameters${query}`,
      { method: "GET" },
      tenantId
    );
  }

  static async updatePayrollParameters(
    data: UpdatePayrollParametersRequest,
    tenantId?: string
  ): Promise<ApiResponse<PayrollParameterDto>> {
    return ApiClient.request<PayrollParameterDto>(
      "/api/payroll/parameters",
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async getPayrollRuns(
    params: {
      year?: number;
      month?: number;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedPayrollRunsResponse>> {
    const sp = new URLSearchParams();
    if (params.year) {
      sp.set("year", params.year.toString());
    }
    if (params.month) {
      sp.set("month", params.month.toString());
    }
    if (params.status) {
      sp.set("status", params.status);
    }
    if (params.page) {
      sp.set("page", params.page.toString());
    }
    if (params.pageSize) {
      sp.set("pageSize", params.pageSize.toString());
    }

    const query = sp.toString() ? `?${sp.toString()}` : "";
    return ApiClient.request<PagedPayrollRunsResponse>(
      `/api/payroll/runs${query}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getPayrollRunById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<PayrollRunDetailResponse>> {
    return ApiClient.request<PayrollRunDetailResponse>(
      `/api/payroll/runs/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createPayrollRun(
    data: CreatePayrollRunRequest,
    tenantId?: string
  ): Promise<ApiResponse<PayrollRunDto>> {
    return ApiClient.request<PayrollRunDto>(
      "/api/payroll/runs",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async calculatePayrollRun(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<PayrollRunDto>> {
    return ApiClient.request<PayrollRunDto>(
      `/api/payroll/runs/${id}/calculate`,
      { method: "POST" },
      tenantId
    );
  }

  static async approvePayrollRun(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<PayrollRunDto>> {
    return ApiClient.request<PayrollRunDto>(
      `/api/payroll/runs/${id}/approve`,
      { method: "POST" },
      tenantId
    );
  }

  static async lockPayrollRun(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<PayrollRunDto>> {
    return ApiClient.request<PayrollRunDto>(
      `/api/payroll/runs/${id}/lock`,
      { method: "POST" },
      tenantId
    );
  }

  static async deletePayrollRun(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/payroll/runs/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async updateEmployeePuantaj(
    runId: string,
    employeePayrollId: string,
    data: UpdateEmployeePuantajRequest,
    tenantId?: string
  ): Promise<ApiResponse<EmployeePayrollDetailDto>> {
    return ApiClient.request<EmployeePayrollDetailDto>(
      `/api/payroll/runs/${runId}/employees/${employeePayrollId}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async getEmployeePayslip(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<PayslipDto>> {
    return ApiClient.request<PayslipDto>(
      `/api/payroll/payslips/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getMyPayslips(
    tenantId?: string
  ): Promise<ApiResponse<PayslipDto[]>> {
    return ApiClient.request<PayslipDto[]>(
      "/api/payroll/my-payslips",
      { method: "GET" },
      tenantId
    );
  }

  static async simulatePayroll(
    data: SimulatePayrollRequest,
    tenantId?: string
  ): Promise<ApiResponse<PayrollCalculationResultDto>> {
    return ApiClient.request<PayrollCalculationResultDto>(
      "/api/payroll/simulate",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async exportPayrollIcmal(
    runId: string,
    tenantId?: string
  ): Promise<ApiResponse<PayrollIcmalResponse>> {
    return ApiClient.request<PayrollIcmalResponse>(
      `/api/payroll/runs/${runId}/icmal`,
      { method: "GET" },
      tenantId
    );
  }

  // --- Attendance & Shifts ---
  static async getShiftTemplates(
    tenantId?: string
  ): Promise<ApiResponse<ShiftTemplateDto[]>> {
    return ApiClient.request<ShiftTemplateDto[]>(
      "/api/attendance/shifts/templates",
      { method: "GET" },
      tenantId
    );
  }

  static async createShiftTemplate(
    data: CreateShiftTemplatePayload,
    tenantId?: string
  ): Promise<ApiResponse<ShiftTemplateDto>> {
    return ApiClient.request<ShiftTemplateDto>(
      "/api/attendance/shifts/templates",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async assignShifts(
    data: AssignShiftsPayload,
    tenantId?: string
  ): Promise<ApiResponse<number>> {
    return ApiClient.request<number>(
      "/api/attendance/shifts/assign",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getShiftCalendar(
    params: {
      startDate: string;
      endDate: string;
      departmentId?: string;
      employeeId?: string;
    },
    tenantId?: string
  ): Promise<ApiResponse<ShiftScheduleDto[]>> {
    const query = new URLSearchParams({
      endDate: params.endDate,
      startDate: params.startDate,
    });
    if (params.departmentId) {
      query.set("departmentId", params.departmentId);
    }
    if (params.employeeId) {
      query.set("employeeId", params.employeeId);
    }
    return ApiClient.request<ShiftScheduleDto[]>(
      `/api/attendance/shifts/calendar?${query.toString()}`,
      { method: "GET" },
      tenantId
    );
  }

  static async punchAttendance(
    data: PunchAttendancePayload,
    tenantId?: string
  ): Promise<ApiResponse<TodayStatusDto>> {
    return ApiClient.request<TodayStatusDto>(
      "/api/attendance/punch",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getTodayStatus(
    employeeId: string,
    tenantId?: string
  ): Promise<ApiResponse<TodayStatusDto>> {
    return ApiClient.request<TodayStatusDto>(
      `/api/attendance/today/status?employeeId=${employeeId}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getLiveMonitor(
    tenantId?: string
  ): Promise<ApiResponse<LiveMonitorResponse>> {
    return ApiClient.request<LiveMonitorResponse>(
      "/api/attendance/live-monitor",
      { method: "GET" },
      tenantId
    );
  }

  static async getAttendanceRecords(
    params: {
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      employeeId?: string;
      status?: string;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<AttendanceRecordDto[]>> {
    const query = new URLSearchParams();
    if (params.startDate) {
      query.set("startDate", params.startDate);
    }
    if (params.endDate) {
      query.set("endDate", params.endDate);
    }
    if (params.departmentId) {
      query.set("departmentId", params.departmentId);
    }
    if (params.employeeId) {
      query.set("employeeId", params.employeeId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    const qs = query.toString();
    return ApiClient.request<AttendanceRecordDto[]>(
      `/api/attendance/records${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async submitAttendanceCorrection(
    data: SubmitCorrectionPayload,
    tenantId?: string
  ): Promise<ApiResponse<AttendanceCorrectionRequestDto>> {
    return ApiClient.request<AttendanceCorrectionRequestDto>(
      "/api/attendance/corrections",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async reviewAttendanceCorrection(
    id: string,
    data: { approve: boolean; rejectionReason?: string },
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    const query = new URLSearchParams({ approve: String(data.approve) });
    if (data.rejectionReason) {
      query.set("rejectionReason", data.rejectionReason);
    }
    return ApiClient.request<string>(
      `/api/attendance/corrections/${id}/review?${query.toString()}`,
      {
        method: "POST",
      },
      tenantId
    );
  }

  // --- Chat & Customer Live Support ---
  static async getChatChannels(
    params: { search?: string; type?: string } = {},
    tenantId?: string
  ): Promise<ApiResponse<ChatChannelDto[]>> {
    const query = new URLSearchParams();
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    const qs = query.toString();
    return ApiClient.request<ChatChannelDto[]>(
      `/api/chat/channels${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createChatChannel(
    data: CreateChannelPayload,
    tenantId?: string
  ): Promise<ApiResponse<ChatChannelDto>> {
    return ApiClient.request<ChatChannelDto>(
      "/api/chat/channels",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getOrCreateDirectChat(
    data: GetOrCreateDirectChatPayload,
    tenantId?: string
  ): Promise<ApiResponse<ChatChannelDto>> {
    return ApiClient.request<ChatChannelDto>(
      "/api/chat/channels/direct",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getChatMessages(
    channelId: string,
    limit = 100,
    tenantId?: string
  ): Promise<ApiResponse<ChatMessageDto[]>> {
    return ApiClient.request<ChatMessageDto[]>(
      `/api/chat/messages/channel/${channelId}?limit=${limit}`,
      { method: "GET" },
      tenantId
    );
  }

  static async sendChatMessage(
    data: SendMessagePayload,
    tenantId?: string
  ): Promise<ApiResponse<ChatMessageDto>> {
    return ApiClient.request<ChatMessageDto>(
      "/api/chat/messages",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async markChatMessagesRead(
    data: { channelId: string; userId: string },
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      "/api/chat/messages/read",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async editChatMessage(
    messageId: string,
    data: { content: string },
    tenantId?: string
  ): Promise<ApiResponse<ChatMessageDto>> {
    return ApiClient.request<ChatMessageDto>(
      `/api/chat/messages/${messageId}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteChatMessage(
    messageId: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/chat/messages/${messageId}`,
      {
        method: "DELETE",
      },
      tenantId
    );
  }

  static async restoreChatMessage(
    messageId: string,
    tenantId?: string
  ): Promise<ApiResponse<ChatMessageDto>> {
    return ApiClient.request<ChatMessageDto>(
      `/api/chat/messages/${messageId}/restore`,
      {
        method: "POST",
      },
      tenantId
    );
  }

  static async getCannedResponses(
    params: { category?: string; search?: string } = {},
    tenantId?: string
  ): Promise<ApiResponse<CannedResponseDto[]>> {
    const query = new URLSearchParams();
    if (params.category) {
      query.set("category", params.category);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    const qs = query.toString();
    return ApiClient.request<CannedResponseDto[]>(
      `/api/chat/support/canned-responses${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createCannedResponse(
    data: CreateCannedResponsePayload,
    tenantId?: string
  ): Promise<ApiResponse<CannedResponseDto>> {
    return ApiClient.request<CannedResponseDto>(
      "/api/chat/support/canned-responses",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateCannedResponse(
    id: string,
    data: CreateCannedResponsePayload,
    tenantId?: string
  ): Promise<ApiResponse<CannedResponseDto>> {
    return ApiClient.request<CannedResponseDto>(
      `/api/chat/support/canned-responses/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteCannedResponse(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/chat/support/canned-responses/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    );
  }

  static async createCustomerSupportSession(
    data: CreateCustomerSupportSessionPayload,
    tenantId?: string
  ): Promise<ApiResponse<ChatChannelDto>> {
    return ApiClient.request<ChatChannelDto>(
      "/api/chat/support/sessions",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateSupportSessionStatus(
    data: UpdateSupportSessionStatusPayload,
    tenantId?: string
  ): Promise<ApiResponse<CustomerSupportSessionDto>> {
    return ApiClient.request<CustomerSupportSessionDto>(
      "/api/chat/support/sessions/status",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getCustomer360ChatContext(
    customerId: string,
    tenantId?: string
  ): Promise<ApiResponse<Customer360ChatContextDto>> {
    return ApiClient.request<Customer360ChatContextDto>(
      `/api/chat/support/customer-context/${customerId}`,
      { method: "GET" },
      tenantId
    );
  }

  // --- HelpDesk & Ticket Management ---
  static async getTickets(
    params: {
      assignedUserId?: string;
      category?: string;
      customerId?: string;
      departmentId?: string;
      page?: number;
      pageSize?: number;
      priority?: string;
      queue?: string;
      search?: string;
      status?: string;
    },
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<TicketListDto>>> {
    const q = new URLSearchParams();
    if (params.status) {
      q.set("status", params.status);
    }
    if (params.priority) {
      q.set("priority", params.priority);
    }
    if (params.category) {
      q.set("category", params.category);
    }
    if (params.customerId) {
      q.set("customerId", params.customerId);
    }
    if (params.departmentId) {
      q.set("departmentId", params.departmentId);
    }
    if (params.assignedUserId) {
      q.set("assignedUserId", params.assignedUserId);
    }
    if (params.queue) {
      q.set("queue", params.queue);
    }
    if (params.search) {
      q.set("search", params.search);
    }
    if (params.page) {
      q.set("page", params.page.toString());
    }
    if (params.pageSize) {
      q.set("pageSize", params.pageSize.toString());
    }

    const qs = q.toString();
    return ApiClient.request<PagedResult<TicketListDto>>(
      `/api/tickets${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getTicketStats(
    tenantId?: string
  ): Promise<ApiResponse<TicketStatsDto>> {
    return ApiClient.request<TicketStatsDto>(
      "/api/tickets/stats",
      { method: "GET" },
      tenantId
    );
  }

  static async getTicketById(
    ticketId: string,
    tenantId?: string,
    includeInternal = false
  ): Promise<ApiResponse<TicketDetailDto>> {
    const qs = includeInternal ? "?includeInternal=true" : "";
    return ApiClient.request<TicketDetailDto>(
      `/api/tickets/${ticketId}${qs}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getTicketDetails(
    ticketId: string,
    tenantId: string,
    includeInternal = false
  ): Promise<ApiResponse<TicketDetailDto>> {
    return ApiClient.getTicketById(ticketId, tenantId, includeInternal);
  }

  static async createTicket(
    data: CreateTicketPayload,
    tenantId?: string
  ): Promise<ApiResponse<CreateTicketResultDto>> {
    return ApiClient.request<CreateTicketResultDto>(
      "/api/tickets",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateTicket(
    ticketId: string,
    data: UpdateTicketPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/tickets/${ticketId}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async addTicketMessage(
    ticketId: string,
    data: AddTicketMessagePayload,
    tenantId?: string
  ): Promise<ApiResponse<ChatMessageDto>> {
    return ApiClient.request<ChatMessageDto>(
      `/api/tickets/${ticketId}/messages`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async convertChatToTicket(
    channelId: string,
    data: ConvertChatToTicketPayload,
    tenantId?: string
  ): Promise<ApiResponse<CreateTicketResultDto>> {
    return ApiClient.request<CreateTicketResultDto>(
      `/api/chat/channels/${channelId}/convert-to-ticket`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  // --- Shipping & Fulfillment ---
  static async getShipments(
    params: {
      status?: string;
      type?: string;
      carrierId?: string;
      customerId?: string;
      orderId?: string;
      search?: string;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<ShipmentDto[]>> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.carrierId) {
      query.set("carrierId", params.carrierId);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.orderId) {
      query.set("orderId", params.orderId);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    const qs = query.toString();
    return ApiClient.request<ShipmentDto[]>(
      `/api/shipping/shipments${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getShipmentById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<ShipmentDto>> {
    return ApiClient.request<ShipmentDto>(
      `/api/shipping/shipments/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getShippingStats(
    tenantId?: string
  ): Promise<ApiResponse<ShippingStatsDto>> {
    return ApiClient.request<ShippingStatsDto>(
      "/api/shipping/shipments/stats",
      { method: "GET" },
      tenantId
    );
  }

  static async createShipment(
    data: CreateShipmentPayload,
    tenantId?: string
  ): Promise<ApiResponse<ShipmentDto>> {
    return ApiClient.request<ShipmentDto>(
      "/api/shipping/shipments",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateShipmentStatus(
    id: string,
    data: UpdateShipmentStatusPayload,
    tenantId?: string
  ): Promise<ApiResponse<ShipmentDto>> {
    return ApiClient.request<ShipmentDto>(
      `/api/shipping/shipments/${id}/status`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateShipmentTracking(
    id: string,
    data: { carrierId?: string; trackingNumber?: string },
    tenantId?: string
  ): Promise<ApiResponse<ShipmentDto>> {
    return ApiClient.request<ShipmentDto>(
      `/api/shipping/shipments/${id}/tracking`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getShippingCarriers(
    activeOnly = false,
    tenantId?: string
  ): Promise<ApiResponse<CarrierDto[]>> {
    return ApiClient.request<CarrierDto[]>(
      `/api/shipping/carriers${activeOnly ? "?activeOnly=true" : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createShippingCarrier(
    data: CreateCarrierPayload,
    tenantId?: string
  ): Promise<ApiResponse<CarrierDto>> {
    return ApiClient.request<CarrierDto>(
      "/api/shipping/carriers",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getReturnShipments(
    params: { status?: string; customerId?: string; search?: string } = {},
    tenantId?: string
  ): Promise<ApiResponse<ReturnShipmentDto[]>> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    const qs = query.toString();
    return ApiClient.request<ReturnShipmentDto[]>(
      `/api/shipping/returns${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createReturnShipment(
    data: CreateReturnShipmentPayload,
    tenantId?: string
  ): Promise<ApiResponse<ReturnShipmentDto>> {
    return ApiClient.request<ReturnShipmentDto>(
      "/api/shipping/returns",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateReturnStatus(
    id: string,
    data: UpdateReturnStatusPayload,
    tenantId?: string
  ): Promise<ApiResponse<ReturnShipmentDto>> {
    return ApiClient.request<ReturnShipmentDto>(
      `/api/shipping/returns/${id}/status`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async deleteShipment(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/shipping/shipments/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async deleteReturnShipment(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/shipping/returns/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async deleteShippingCarrier(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/shipping/carriers/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // ==========================================
  // Pipelines & Deals
  // ==========================================
  static async getPipelines(
    tenantId?: string
  ): Promise<ApiResponse<PipelineDto[]>> {
    return ApiClient.request<PipelineDto[]>("/api/pipelines", {}, tenantId);
  }

  static async createPipeline(
    data: CreatePipelinePayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/pipelines",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updatePipeline(
    id: string,
    data: UpdatePipelinePayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/pipelines/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deletePipeline(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/pipelines/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async getDeals(
    params: GetDealsParams = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedDealsResponse>> {
    const query = new URLSearchParams();
    if (params.pipelineId) {
      query.set("pipelineId", params.pipelineId);
    }
    if (params.stageId) {
      query.set("stageId", params.stageId);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.assignedUserId) {
      query.set("assignedUserId", params.assignedUserId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.priority) {
      query.set("priority", params.priority);
    }
    if (params.source) {
      query.set("source", params.source);
    }
    if (params.onlyMyDeals) {
      query.set("onlyMyDeals", "true");
    }
    if (params.onlyUnassigned) {
      query.set("onlyUnassigned", "true");
    }
    if (params.onlySlaBreached) {
      query.set("onlySlaBreached", "true");
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }

    const qs = query.toString();
    return ApiClient.request<PagedDealsResponse>(
      `/api/deals${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getDealById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<DealDetailDto>> {
    return ApiClient.request<DealDetailDto>(
      `/api/deals/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createDeal(
    data: CreateDealPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/deals",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateDeal(
    id: string,
    data: UpdateDealPayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/deals/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async moveDealStage(
    id: string,
    data: MoveDealStagePayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/deals/${id}/move-stage`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async assignDeal(
    id: string,
    data: AssignDealPayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/deals/${id}/assign`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async addDealNote(
    id: string,
    data: AddDealNotePayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/deals/${id}/notes`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async deleteDeal(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/deals/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async getDealStats(
    pipelineId?: string,
    tenantId?: string
  ): Promise<ApiResponse<DealStatsResponse>> {
    const url = `/api/deals/stats${pipelineId ? `?pipelineId=${pipelineId}` : ""}`;
    return ApiClient.request<DealStatsResponse>(
      url,
      { method: "GET" },
      tenantId
    );
  }

  // ==========================================
  // Quotes (Teklifler)
  // ==========================================
  static async getQuotes(
    params: GetQuotesParams = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedQuotesResponse>> {
    const query = new URLSearchParams();
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.dealId) {
      query.set("dealId", params.dealId);
    }
    if (params.assignedUserId) {
      query.set("assignedUserId", params.assignedUserId);
    }
    if (params.fromDate) {
      query.set("fromDate", params.fromDate);
    }
    if (params.toDate) {
      query.set("toDate", params.toDate);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }

    const qs = query.toString();
    return ApiClient.request<PagedQuotesResponse>(
      `/api/quotes${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getQuoteById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<QuoteDetailDto>> {
    return ApiClient.request<QuoteDetailDto>(
      `/api/quotes/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createQuote(
    data: CreateQuotePayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/quotes",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateQuote(
    id: string,
    data: UpdateQuotePayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/quotes/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async createQuoteRevision(
    id: string,
    data: CreateQuoteRevisionPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/quotes/${id}/revisions`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async approveQuote(
    id: string,
    data: { isApproved: boolean; approvalNotes?: string },
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/quotes/${id}/approve`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async sendQuote(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/quotes/${id}/send`,
      { method: "POST" },
      tenantId
    );
  }

  static async downloadQuotePdf(
    id: string,
    tenantId?: string
  ): Promise<Blob | null> {
    const token = await ApiClient.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
      headers["X-Tenant-Slug"] = tenantId;
    }
    const res = await fetch(`${API_BASE_URL}/api/quotes/${id}/pdf`, {
      headers,
    });
    if (!res.ok) {
      return null;
    }
    return await res.blob();
  }

  static async sendQuoteEmail(
    id: string,
    data: {
      accountId?: string;
      attachPdf?: boolean;
      body?: string;
      cc?: string[];
      subject?: string;
      templateId?: string;
      to?: string[];
    },
    tenantId?: string
  ): Promise<
    ApiResponse<{
      message?: string;
      quoteNumber: string;
      recipients: string[];
      sentAt: string;
      success: boolean;
    }>
  > {
    return ApiClient.request(
      `/api/quotes/${id}/send-email`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async acceptQuote(
    id: string,
    data: { autoConvertToOrder: boolean } = { autoConvertToOrder: true },
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/quotes/${id}/accept`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async convertQuoteToOrder(
    id: string,
    data?: ConvertToOrderPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/quotes/${id}/convert-to-order`,
      {
        body: data ? JSON.stringify(data) : undefined,
        method: "POST",
      },
      tenantId
    );
  }

  static async rejectQuote(
    id: string,
    data: { reason: string },
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/quotes/${id}/reject`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async deleteQuote(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/quotes/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  /** Paralel toplu silme — fulfilled olanlar silinir, rejected olanlar atlanır */
  static async bulkDeleteQuotes(
    ids: string[],
    tenantId: string
  ): Promise<{ deletedCount: number; failedCount: number }> {
    const results = await Promise.allSettled(
      ids.map((id) => ApiClient.deleteQuote(id, tenantId))
    );
    const deletedCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    return { deletedCount, failedCount: ids.length - deletedCount };
  }

  static async getQuoteStats(
    tenantId?: string
  ): Promise<ApiResponse<QuoteStatsResponse>> {
    return ApiClient.request<QuoteStatsResponse>(
      "/api/quotes/stats",
      { method: "GET" },
      tenantId
    );
  }

  static async getQuoteTemplates(
    tenantId?: string
  ): Promise<ApiResponse<QuoteTemplateDto[]>> {
    return ApiClient.request<QuoteTemplateDto[]>(
      "/api/quotes/templates",
      { method: "GET" },
      tenantId
    );
  }

  static async createQuoteTemplate(
    data: Partial<QuoteTemplateDto>,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/quotes/templates",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateQuoteTemplate(
    id: string,
    data: Partial<QuoteTemplateDto>,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/quotes/templates/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteQuoteTemplate(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/quotes/templates/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  /**
   * Preview a quote email template with Handlebars compilation.
   * POST /api/quotes/templates/{id}/preview — uses mock quote data when quoteId omitted,
   * or real quote data when quoteId provided. Variables overrides allow caller-supplied replacements.
   * Returns rendered html + subject (both sanitized server-side; itemsTable is raw HTML table).
   */
  static async previewQuoteTemplate(
    id: string,
    data: { quoteId?: string; variables?: Record<string, string> } = {},
    tenantId?: string
  ): Promise<ApiResponse<{ html: string; subject: string }>> {
    return ApiClient.request<{ html: string; subject: string }>(
      `/api/quotes/templates/${id}/preview`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  /**
   * Test-send a quote email template (Phase 1: preview only, no real SMTP).
   * POST /api/quotes/templates/{id}/test-send — validates toEmail server-side (EmailAddressAttribute),
   * renders preview with real quote when quoteId provided else mock, logs + in-app notification.
   * Returns previewHtml + sent + message (subject/toEmail also returned by backend via TestSendQuoteTemplateResponse).
   * Error handling via ApiResponse.errorCode/message.
   */
  static async testSendQuoteTemplate(
    id: string,
    data: { toEmail: string; quoteId?: string },
    tenantId?: string
  ): Promise<
    ApiResponse<{ previewHtml: string; sent: boolean; message?: string }>
  > {
    return ApiClient.request<{
      previewHtml: string;
      sent: boolean;
      message?: string;
    }>(
      `/api/quotes/templates/${id}/test-send`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  // Public quote views (unauthenticated)
  static async getPublicQuote(
    token: string
  ): Promise<ApiResponse<PublicQuoteViewDto>> {
    return ApiClient.request<PublicQuoteViewDto>(
      `/api/public/quotes/${token}`,
      { method: "GET" }
    );
  }

  static async getPortalView(
    token: string
  ): Promise<ApiResponse<PortalViewDto>> {
    return ApiClient.request<PortalViewDto>(`/api/public/portal/${token}`, {
      method: "GET",
    });
  }

  static async publicAcceptQuote(
    token: string,
    data: { acceptedByName?: string; customerNotes?: string }
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(`/api/public/quotes/${token}/accept`, {
      body: JSON.stringify(data),
      method: "POST",
    });
  }

  // ==========================================
  // Automations & Workflow Engine
  // ==========================================
  static async getWorkflows(
    params: {
      category?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<WorkflowSummaryDto>>> {
    const q = new URLSearchParams();
    if (params.category && params.category !== "all") {
      q.set("category", params.category);
    }
    if (params.isActive !== undefined) {
      q.set("isActive", String(params.isActive));
    }
    if (params.search) {
      q.set("search", params.search);
    }
    if (params.page) {
      q.set("page", String(params.page));
    }
    if (params.pageSize) {
      q.set("pageSize", String(params.pageSize));
    }

    const qs = q.toString();
    return ApiClient.request<PagedResult<WorkflowSummaryDto>>(
      `/api/automations${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getWorkflowStats(
    tenantId?: string
  ): Promise<ApiResponse<WorkflowStatsDto>> {
    return ApiClient.request<WorkflowStatsDto>(
      "/api/automations/stats",
      { method: "GET" },
      tenantId
    );
  }

  static async getWorkflowTemplates(
    tenantId?: string
  ): Promise<ApiResponse<WorkflowTemplateDto[]>> {
    return ApiClient.request<WorkflowTemplateDto[]>(
      "/api/automations/templates",
      { method: "GET" },
      tenantId
    );
  }

  static async getWorkflowById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<WorkflowDetailDto>> {
    return ApiClient.request<WorkflowDetailDto>(
      `/api/automations/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createWorkflow(
    data: CreateWorkflowPayload,
    tenantId?: string
  ): Promise<ApiResponse<WorkflowSummaryDto>> {
    return ApiClient.request<WorkflowSummaryDto>(
      "/api/automations",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateWorkflow(
    id: string,
    data: UpdateWorkflowPayload,
    tenantId?: string
  ): Promise<ApiResponse<WorkflowSummaryDto>> {
    return ApiClient.request<WorkflowSummaryDto>(
      `/api/automations/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async toggleWorkflow(
    id: string,
    isActive?: boolean,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/automations/${id}/toggle`,
      {
        body: JSON.stringify({ id, isActive }),
        method: "PATCH",
      },
      tenantId
    );
  }

  static async deleteWorkflow(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/automations/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async testWorkflow(
    id: string,
    data: TestWorkflowPayload,
    tenantId?: string
  ): Promise<ApiResponse<AutomationExecutionResultDto>> {
    return ApiClient.request<AutomationExecutionResultDto>(
      `/api/automations/${id}/test`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async getWorkflowExecutions(
    params: {
      workflowId?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<ExecutionItemDto>>> {
    const q = new URLSearchParams();
    if (params.workflowId) {
      q.set("workflowId", params.workflowId);
    }
    if (params.status && params.status !== "all") {
      q.set("status", params.status);
    }
    if (params.page) {
      q.set("page", String(params.page));
    }
    if (params.pageSize) {
      q.set("pageSize", String(params.pageSize));
    }

    const qs = q.toString();
    return ApiClient.request<PagedResult<ExecutionItemDto>>(
      `/api/automations/executions${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async publicRequestRevision(
    token: string,
    feedback: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/public/quotes/${token}/request-revision?feedback=${encodeURIComponent(feedback)}`,
      { method: "POST" }
    );
  }

  // ==========================================
  // Compliance & Turkish Labor Law Engine
  // ==========================================
  static async getComplianceScore(
    tenantId?: string
  ): Promise<ApiResponse<ComplianceScoreResultDto>> {
    return ApiClient.request<ComplianceScoreResultDto>(
      "/api/compliance/score",
      { method: "GET" },
      tenantId
    );
  }

  static async getComplianceRules(
    category?: string,
    tenantId?: string
  ): Promise<ApiResponse<ComplianceRuleDto[]>> {
    const q = category && category !== "all" ? `?category=${category}` : "";
    return ApiClient.request<ComplianceRuleDto[]>(
      `/api/compliance/rules${q}`,
      { method: "GET" },
      tenantId
    );
  }

  static async updateComplianceRule(
    id: string,
    data: UpdateComplianceRulePayload,
    tenantId?: string
  ): Promise<ApiResponse<ComplianceRuleDto>> {
    return ApiClient.request<ComplianceRuleDto>(
      `/api/compliance/rules/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async getComplianceViolations(
    params: {
      status?: string;
      moduleSource?: string;
      severity?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<ComplianceViolationDto>>> {
    const q = new URLSearchParams();
    if (params.status && params.status !== "all") {
      q.set("status", params.status);
    }
    if (params.moduleSource && params.moduleSource !== "all") {
      q.set("moduleSource", params.moduleSource);
    }
    if (params.severity && params.severity !== "all") {
      q.set("severity", params.severity);
    }
    if (params.page) {
      q.set("page", String(params.page));
    }
    if (params.pageSize) {
      q.set("pageSize", String(params.pageSize));
    }

    const qs = q.toString();
    return ApiClient.request<PagedResult<ComplianceViolationDto>>(
      `/api/compliance/violations${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async overrideComplianceViolation(
    id: string,
    overrideReason: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/compliance/violations/${id}/override`,
      {
        body: JSON.stringify({ id, overrideReason }),
        method: "POST",
      },
      tenantId
    );
  }

  static async validateShift(
    data: ValidateShiftPayload,
    tenantId?: string
  ): Promise<ApiResponse<ComplianceValidationResultDto>> {
    return ApiClient.request<ComplianceValidationResultDto>(
      "/api/compliance/validate-shift",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async validateShiftTemplate(
    data: ValidateShiftTemplatePayload,
    tenantId?: string
  ): Promise<ApiResponse<ComplianceValidationResultDto>> {
    return ApiClient.request<ComplianceValidationResultDto>(
      "/api/compliance/validate-template",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async validateLeave(
    data: ValidateLeavePayload,
    tenantId?: string
  ): Promise<ApiResponse<ComplianceValidationResultDto>> {
    return ApiClient.request<ComplianceValidationResultDto>(
      "/api/compliance/validate-leave",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  // ==========================================
  // Recruitment - Requisitions
  // ==========================================
  static async getRequisitions(
    params: {
      search?: string;
      status?: string;
      departmentId?: string;
      isPublished?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedRequisitionsResponse>> {
    const query = new URLSearchParams();
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.departmentId) {
      query.set("departmentId", params.departmentId);
    }
    if (params.isPublished !== undefined) {
      query.set("isPublished", String(params.isPublished));
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }
    const qs = query.toString();
    const url = `/api/recruitment/requisitions${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedRequisitionsResponse>(url, {}, tenantId);
  }

  static async getRequisitionById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<RequisitionDto>> {
    return ApiClient.request<RequisitionDto>(
      `/api/recruitment/requisitions/${id}`,
      {},
      tenantId
    );
  }

  static async createRequisition(
    data: CreateRequisitionPayload,
    tenantId: string
  ): Promise<ApiResponse<RequisitionDto>> {
    return ApiClient.request<RequisitionDto>(
      "/api/recruitment/requisitions",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateRequisition(
    id: string,
    data: UpdateRequisitionPayload,
    tenantId: string
  ): Promise<ApiResponse<RequisitionDto>> {
    return ApiClient.request<RequisitionDto>(
      `/api/recruitment/requisitions/${id}`,
      {
        body: JSON.stringify({ ...data, id }),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteRequisition(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/recruitment/requisitions/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    );
  }

  static async publishRequisition(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<RequisitionDto>> {
    return ApiClient.request<RequisitionDto>(
      `/api/recruitment/requisitions/${id}/publish`,
      {
        method: "POST",
      },
      tenantId
    );
  }

  static async closeRequisition(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<RequisitionDto>> {
    return ApiClient.request<RequisitionDto>(
      `/api/recruitment/requisitions/${id}/close`,
      {
        method: "POST",
      },
      tenantId
    );
  }

  // ==========================================
  // Recruitment - Candidates
  // ==========================================
  static async getCandidates(
    params: {
      search?: string;
      source?: string;
      tag?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedCandidatesResponse>> {
    const query = new URLSearchParams();
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.source) {
      query.set("source", params.source);
    }
    if (params.tag) {
      query.set("tag", params.tag);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }
    const qs = query.toString();
    const url = `/api/recruitment/candidates${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedCandidatesResponse>(url, {}, tenantId);
  }

  static async getCandidateById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<CandidateDto>> {
    return ApiClient.request<CandidateDto>(
      `/api/recruitment/candidates/${id}`,
      {},
      tenantId
    );
  }

  static async createCandidate(
    data: CreateCandidatePayload,
    tenantId: string
  ): Promise<ApiResponse<CandidateDto>> {
    return ApiClient.request<CandidateDto>(
      "/api/recruitment/candidates",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateCandidate(
    id: string,
    data: UpdateCandidatePayload,
    tenantId: string
  ): Promise<ApiResponse<CandidateDto>> {
    return ApiClient.request<CandidateDto>(
      `/api/recruitment/candidates/${id}`,
      {
        body: JSON.stringify({ ...data, id }),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteCandidate(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/recruitment/candidates/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    );
  }

  static async hardDeleteCandidate(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/recruitment/candidates/${id}/hard`,
      {
        method: "DELETE",
      },
      tenantId
    );
  }

  static async uploadCv(
    candidateId: string,
    file: File,
    tenantId: string
  ): Promise<ApiResponse<CvUploadResponse>> {
    const token = await ApiClient.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
      headers["X-Tenant-Slug"] = tenantId;
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${API_BASE_URL}/api/recruitment/candidates/${candidateId}/cv`,
      {
        body: formData,
        headers,
        method: "POST",
      }
    );
    if (!res.ok) {
      try {
        const errorJson = await res.json();
        return {
          errorCode:
            errorJson.errorCode || errorJson.title || `HTTP_${res.status}`,
          message: errorJson.message || errorJson.detail || "An error occurred",
          success: false,
        };
      } catch {
        return {
          errorCode: `HTTP_${res.status}`,
          message: res.statusText || "Request failed",
          success: false,
        };
      }
    }
    return (await res.json()) as ApiResponse<CvUploadResponse>;
  }

  static async importCandidates(
    rows: CsvImportRowPayload[],
    tenantId: string
  ): Promise<ApiResponse<CsvImportResponse>> {
    return ApiClient.request<CsvImportResponse>(
      "/api/recruitment/candidates/import",
      {
        body: JSON.stringify(rows),
        method: "POST",
      },
      tenantId
    );
  }

  static async importCandidatesCsv(
    file: File,
    tenantId: string
  ): Promise<ApiResponse<CsvImportResponse>> {
    const token = await ApiClient.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (tenantId) {
      headers["X-Tenant-Id"] = tenantId;
      headers["X-Tenant-Slug"] = tenantId;
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${API_BASE_URL}/api/recruitment/candidates/import`,
      {
        body: formData,
        headers,
        method: "POST",
      }
    );
    if (!res.ok) {
      try {
        const errorJson = await res.json();
        return {
          errorCode:
            errorJson.errorCode || errorJson.title || `HTTP_${res.status}`,
          message: errorJson.message || errorJson.detail || "An error occurred",
          success: false,
        };
      } catch {
        return {
          errorCode: `HTTP_${res.status}`,
          message: res.statusText || "Request failed",
          success: false,
        };
      }
    }
    return (await res.json()) as ApiResponse<CsvImportResponse>;
  }

  // ==========================================
  // Recruitment - Applications
  // ==========================================
  static async getApplications(
    params: {
      requisitionId?: string;
      stageId?: string;
      candidateId?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId: string
  ): Promise<ApiResponse<PagedApplicationsResponse>> {
    const query = new URLSearchParams();
    if (params.requisitionId) {
      query.set("requisitionId", params.requisitionId);
    }
    if (params.stageId) {
      query.set("stageId", params.stageId);
    }
    if (params.candidateId) {
      query.set("candidateId", params.candidateId);
    }
    if (params.page) {
      query.set("page", params.page.toString());
    }
    if (params.pageSize) {
      query.set("pageSize", params.pageSize.toString());
    }
    const qs = query.toString();
    const url = `/api/recruitment/applications${qs ? `?${qs}` : ""}`;
    return ApiClient.request<PagedApplicationsResponse>(url, {}, tenantId);
  }

  static async getApplicationById(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<ApplicationDto>> {
    return ApiClient.request<ApplicationDto>(
      `/api/recruitment/applications/${id}`,
      {},
      tenantId
    );
  }

  static async createApplication(
    data: CreateApplicationPayload,
    tenantId: string
  ): Promise<ApiResponse<ApplicationDto>> {
    return ApiClient.request<ApplicationDto>(
      "/api/recruitment/applications",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateApplication(
    id: string,
    data: UpdateApplicationPayload,
    tenantId: string
  ): Promise<ApiResponse<ApplicationDto>> {
    return ApiClient.request<ApplicationDto>(
      `/api/recruitment/applications/${id}`,
      {
        body: JSON.stringify({ ...data, id }),
        method: "PUT",
      },
      tenantId
    );
  }

  static async moveApplicationStage(
    id: string,
    stageId: string,
    tenantId: string
  ): Promise<ApiResponse<ApplicationDto>> {
    return ApiClient.request<ApplicationDto>(
      `/api/recruitment/applications/${id}/move`,
      {
        body: JSON.stringify({ id, stageId }),
        method: "POST",
      },
      tenantId
    );
  }

  static async deleteApplication(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/recruitment/applications/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    );
  }

  // ==========================================
  // Recruitment - Stages
  // ==========================================
  static async getStages(
    tenantId: string,
    isActive?: boolean
  ): Promise<ApiResponse<StageDto[]>> {
    const qs = isActive === undefined ? "" : `?isActive=${isActive}`;
    return ApiClient.request<StageDto[]>(
      `/api/recruitment/stages${qs}`,
      {},
      tenantId
    );
  }

  static async createStage(
    data: CreateStagePayload,
    tenantId: string
  ): Promise<ApiResponse<StageDto>> {
    return ApiClient.request<StageDto>(
      "/api/recruitment/stages",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateStage(
    id: string,
    data: UpdateStagePayload,
    tenantId: string
  ): Promise<ApiResponse<StageDto>> {
    return ApiClient.request<StageDto>(
      `/api/recruitment/stages/${id}`,
      {
        body: JSON.stringify({ ...data, id }),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteStage(
    id: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/recruitment/stages/${id}`,
      {
        method: "DELETE",
      },
      tenantId
    );
  }

  static async reorderStages(
    items: { id: string; sortOrder: number }[],
    tenantId: string
  ): Promise<ApiResponse<StageDto[]>> {
    return ApiClient.request<StageDto[]>(
      "/api/recruitment/stages/reorder",
      {
        body: JSON.stringify({ items }),
        method: "PUT",
      },
      tenantId
    );
  }

  static async publicApply(
    data: PublicApplyPayload
  ): Promise<ApiResponse<PublicApplyResponse>> {
    return ApiClient.request<PublicApplyResponse>(
      "/api/recruitment/public/apply",
      {
        body: JSON.stringify(data),
        method: "POST",
      }
    );
  }

  // Promotions & Campaigns
  static async getCampaigns(
    params: {
      search?: string;
      type?: string;
      triggerType?: string;
      isActive?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<CampaignListItemDto>>> {
    const query = new URLSearchParams();
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.triggerType) {
      query.set("triggerType", params.triggerType);
    }
    if (params.isActive !== undefined) {
      query.set("isActive", String(params.isActive));
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.pageSize) {
      query.set("pageSize", String(params.pageSize));
    }
    const qs = query.toString();
    return ApiClient.request<PagedResult<CampaignListItemDto>>(
      `/api/promotions/campaigns${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getCampaignById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<CampaignDetailDto>> {
    return ApiClient.request<CampaignDetailDto>(
      `/api/promotions/campaigns/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createCampaign(
    data: CreateCampaignPayload,
    tenantId?: string
  ): Promise<ApiResponse<{ id: string; message: string }>> {
    return ApiClient.request<{ id: string; message: string }>(
      "/api/promotions/campaigns",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateCampaign(
    id: string,
    data: UpdateCampaignPayload,
    tenantId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return ApiClient.request<{ message: string }>(
      `/api/promotions/campaigns/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async toggleCampaignStatus(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<{ isActive: boolean; message: string }>> {
    return ApiClient.request<{ isActive: boolean; message: string }>(
      `/api/promotions/campaigns/${id}/toggle`,
      { method: "PATCH" },
      tenantId
    );
  }

  static async deleteCampaign(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return ApiClient.request<{ message: string }>(
      `/api/promotions/campaigns/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async getCoupons(
    params: {
      campaignId?: string;
      search?: string;
      batchId?: string;
      isActive?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<CouponListItemDto>>> {
    const query = new URLSearchParams();
    if (params.campaignId) {
      query.set("campaignId", params.campaignId);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.batchId) {
      query.set("batchId", params.batchId);
    }
    if (params.isActive !== undefined) {
      query.set("isActive", String(params.isActive));
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.pageSize) {
      query.set("pageSize", String(params.pageSize));
    }
    const qs = query.toString();
    return ApiClient.request<PagedResult<CouponListItemDto>>(
      `/api/promotions/coupons${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async generateCoupons(
    data: GenerateCouponsPayload,
    tenantId?: string
  ): Promise<
    ApiResponse<{
      batchId: string;
      generatedCount: number;
      codes: string[];
      message: string;
    }>
  > {
    return ApiClient.request<{
      batchId: string;
      generatedCount: number;
      codes: string[];
      message: string;
    }>(
      "/api/promotions/coupons/generate",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async deleteCoupon(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return ApiClient.request<{ message: string }>(
      `/api/promotions/coupons/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async getPromotionsStats(
    tenantId?: string
  ): Promise<ApiResponse<PromotionsStatsDto>> {
    return ApiClient.request<PromotionsStatsDto>(
      "/api/promotions/stats",
      { method: "GET" },
      tenantId
    );
  }

  static async evaluateCartPromotions(
    data: CartPromotionEvaluationPayload,
    tenantId?: string
  ): Promise<ApiResponse<CartPromotionEvaluationResultDto>> {
    return ApiClient.request<CartPromotionEvaluationResultDto>(
      "/api/promotions/evaluate",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  // ==========================================
  // Tasks & To-Do Management
  // ==========================================
  static async getTasks(
    params: GetTasksParams = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedTasksResponse>> {
    const query = new URLSearchParams();
    if (params.isCompleted !== undefined) {
      query.set("isCompleted", String(params.isCompleted));
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.priority) {
      query.set("priority", params.priority);
    }
    if (params.category) {
      query.set("category", params.category);
    }
    if (params.assignedUserId) {
      query.set("assignedUserId", params.assignedUserId);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.dealId) {
      query.set("dealId", params.dealId);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.pageSize) {
      query.set("pageSize", String(params.pageSize));
    }

    const qs = query.toString();
    return ApiClient.request<PagedTasksResponse>(
      `/api/tasks${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getTaskById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<CrmTaskDto>> {
    return ApiClient.request<CrmTaskDto>(
      `/api/tasks/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createTask(
    data: CreateTaskPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/tasks",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateTask(
    id: string,
    data: UpdateTaskPayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/tasks/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async toggleTaskStatus(
    id: string,
    isCompleted?: boolean,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/tasks/${id}/toggle`,
      {
        body: JSON.stringify({ isCompleted }),
        method: "PATCH",
      },
      tenantId
    );
  }

  static async deleteTask(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/tasks/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // ==========================================
  // Projects & Agile Backlog Module
  // ==========================================
  static async getProjects(
    params: { status?: string; customerId?: string; search?: string } = {},
    tenantId?: string
  ): Promise<ApiResponse<ProjectSummaryDto[]>> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.search) {
      query.set("search", params.search);
    }

    const qs = query.toString();
    return ApiClient.request<ProjectSummaryDto[]>(
      `/api/projects${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getProjectById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<ProjectSummaryDto>> {
    return ApiClient.request<ProjectSummaryDto>(
      `/api/projects/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createProject(
    data: CreateProjectPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      "/api/projects",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateProject(
    id: string,
    data: UpdateProjectPayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/projects/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteProject(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/projects/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // Epics
  static async getEpics(
    projectId: string,
    tenantId?: string
  ): Promise<ApiResponse<EpicDto[]>> {
    return ApiClient.request<EpicDto[]>(
      `/api/projects/${projectId}/epics`,
      { method: "GET" },
      tenantId
    );
  }

  static async createEpic(
    projectId: string,
    data: CreateEpicPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/projects/${projectId}/epics`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateEpic(
    id: string,
    data: UpdateEpicPayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/epics/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteEpic(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/epics/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // Sprints
  static async getSprints(
    projectId: string,
    tenantId?: string
  ): Promise<ApiResponse<SprintDto[]>> {
    return ApiClient.request<SprintDto[]>(
      `/api/projects/${projectId}/sprints`,
      { method: "GET" },
      tenantId
    );
  }

  static async createSprint(
    projectId: string,
    data: CreateSprintPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/projects/${projectId}/sprints`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateSprintStatus(
    id: string,
    status: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/sprints/${id}/status`,
      {
        body: JSON.stringify({ status }),
        method: "PATCH",
      },
      tenantId
    );
  }

  static async deleteSprint(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/sprints/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // Backlog Items
  static async getProjectBacklogItems(
    projectId: string,
    params: GetBacklogItemsParams = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedBacklogResponse>> {
    const query = new URLSearchParams();
    if (params.sprintId) {
      query.set("sprintId", params.sprintId);
    }
    if (params.epicId) {
      query.set("epicId", params.epicId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.priority) {
      query.set("priority", params.priority);
    }
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.assignedUserId) {
      query.set("assignedUserId", params.assignedUserId);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.dealId) {
      query.set("dealId", params.dealId);
    }
    if (params.unassignedSprint !== undefined) {
      query.set("unassignedSprint", String(params.unassignedSprint));
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.pageSize) {
      query.set("pageSize", String(params.pageSize));
    }

    const qs = query.toString();
    return ApiClient.request<PagedBacklogResponse>(
      `/api/projects/${projectId}/items${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getBacklogItems(
    params: GetBacklogItemsParams = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedBacklogResponse>> {
    const query = new URLSearchParams();
    if (params.projectId) {
      query.set("projectId", params.projectId);
    }
    if (params.sprintId) {
      query.set("sprintId", params.sprintId);
    }
    if (params.epicId) {
      query.set("epicId", params.epicId);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.priority) {
      query.set("priority", params.priority);
    }
    if (params.type) {
      query.set("type", params.type);
    }
    if (params.assignedUserId) {
      query.set("assignedUserId", params.assignedUserId);
    }
    if (params.customerId) {
      query.set("customerId", params.customerId);
    }
    if (params.dealId) {
      query.set("dealId", params.dealId);
    }
    if (params.unassignedSprint !== undefined) {
      query.set("unassignedSprint", String(params.unassignedSprint));
    }
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.pageSize) {
      query.set("pageSize", String(params.pageSize));
    }

    const qs = query.toString();
    return ApiClient.request<PagedBacklogResponse>(
      `/api/backlog-items${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getBacklogItemById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<BacklogItemDto>> {
    return ApiClient.request<BacklogItemDto>(
      `/api/backlog-items/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createBacklogItem(
    projectId: string,
    data: CreateBacklogItemPayload,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/projects/${projectId}/items`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateBacklogItem(
    id: string,
    data: UpdateBacklogItemPayload,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/backlog-items/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async moveBacklogItemStatus(
    id: string,
    status: string,
    orderIndex = 0,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/backlog-items/${id}/status`,
      {
        body: JSON.stringify({ orderIndex, status }),
        method: "PATCH",
      },
      tenantId
    );
  }

  static async assignItemToSprint(
    id: string,
    sprintId?: string | null,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/backlog-items/${id}/sprint`,
      {
        body: JSON.stringify({ sprintId: sprintId || null }),
        method: "PATCH",
      },
      tenantId
    );
  }

  static async addBacklogSubtask(
    backlogItemId: string,
    title: string,
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/backlog-items/${backlogItemId}/subtasks`,
      {
        body: JSON.stringify({ title }),
        method: "POST",
      },
      tenantId
    );
  }

  static async toggleBacklogSubtask(
    subtaskId: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/subtasks/${subtaskId}/toggle`,
      { method: "PATCH" },
      tenantId
    );
  }

  static async deleteBacklogSubtask(
    subtaskId: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/subtasks/${subtaskId}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async addBacklogComment(
    backlogItemId: string,
    data: {
      content: string;
      userName: string;
      userId?: string;
      userAvatar?: string;
    },
    tenantId?: string
  ): Promise<ApiResponse<string>> {
    return ApiClient.request<string>(
      `/api/backlog-items/${backlogItemId}/comments`,
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async deleteBacklogItem(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/backlog-items/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // ==========================================
  // Vehicles & Automotive Platform Module
  // ==========================================
  static async getVehicles(
    params: {
      search?: string;
      brand?: string;
      segment?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<VehicleListResponse>> {
    const sp = new URLSearchParams();
    if (params.search) {
      sp.set("search", params.search);
    }
    if (params.brand) {
      sp.set("brand", params.brand);
    }
    if (params.segment) {
      sp.set("segment", params.segment);
    }
    if (params.status) {
      sp.set("status", params.status);
    }
    if (params.page) {
      sp.set("page", params.page.toString());
    }
    if (params.pageSize) {
      sp.set("pageSize", params.pageSize.toString());
    }

    const query = sp.toString() ? `?${sp.toString()}` : "";
    return ApiClient.request<VehicleListResponse>(
      `/api/vehicles${query}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getVehicleById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<VehicleSummaryDto>> {
    return ApiClient.request<VehicleSummaryDto>(
      `/api/vehicles/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createVehicle(
    data: CreateVehiclePayload,
    tenantId?: string
  ): Promise<ApiResponse<VehicleSummaryDto>> {
    return ApiClient.request<VehicleSummaryDto>(
      "/api/vehicles",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateVehicle(
    id: string,
    data: UpdateVehiclePayload,
    tenantId?: string
  ): Promise<ApiResponse<VehicleSummaryDto>> {
    return ApiClient.request<VehicleSummaryDto>(
      `/api/vehicles/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteVehicle(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/vehicles/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // --- EPC (Electronic Parts Catalog) ---
  static async getEpcSystems(
    tenantId?: string
  ): Promise<ApiResponse<EpcSystemDto[]>> {
    return ApiClient.request<EpcSystemDto[]>(
      "/api/vehicles/epc/systems",
      { method: "GET" },
      tenantId
    );
  }

  static async getEpcParts(
    params: {
      systemId?: string;
      subsystemId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<VehiclePartDto[]>> {
    const sp = new URLSearchParams();
    if (params.systemId) {
      sp.set("systemId", params.systemId);
    }
    if (params.subsystemId) {
      sp.set("subsystemId", params.subsystemId);
    }
    if (params.search) {
      sp.set("search", params.search);
    }
    if (params.page) {
      sp.set("page", params.page.toString());
    }
    if (params.pageSize) {
      sp.set("pageSize", params.pageSize.toString());
    }

    const query = sp.toString() ? `?${sp.toString()}` : "";
    return ApiClient.request<VehiclePartDto[]>(
      `/api/vehicles/epc/parts${query}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createEpcPart(
    data: CreatePartPayload,
    tenantId?: string
  ): Promise<ApiResponse<VehiclePartDto>> {
    return ApiClient.request<VehiclePartDto>(
      "/api/vehicles/epc/parts",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateEpcPart(
    id: string,
    data: UpdatePartPayload,
    tenantId?: string
  ): Promise<ApiResponse<VehiclePartDto>> {
    return ApiClient.request<VehiclePartDto>(
      `/api/vehicles/epc/parts/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async deleteEpcPart(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/vehicles/epc/parts/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // --- Vehicle Documents ---
  static async getVehicleDocuments(
    params: {
      vehicleId?: string;
      partId?: string;
      documentType?: string;
      category?: string;
      search?: string;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<VehicleDocumentDto[]>> {
    const sp = new URLSearchParams();
    if (params.vehicleId) {
      sp.set("vehicleId", params.vehicleId);
    }
    if (params.partId) {
      sp.set("partId", params.partId);
    }
    if (params.documentType) {
      sp.set("documentType", params.documentType);
    }
    if (params.category) {
      sp.set("category", params.category);
    }
    if (params.search) {
      sp.set("search", params.search);
    }

    const query = sp.toString() ? `?${sp.toString()}` : "";
    return ApiClient.request<VehicleDocumentDto[]>(
      `/api/vehicles/documents${query}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createVehicleDocument(
    data: CreateVehicleDocumentPayload,
    tenantId?: string
  ): Promise<ApiResponse<VehicleDocumentDto>> {
    return ApiClient.request<VehicleDocumentDto>(
      "/api/vehicles/documents",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async uploadVehicleDocument(
    formData: FormData,
    tenantId?: string
  ): Promise<
    ApiResponse<{
      fileUrl: string;
      fileName: string;
      fileSize: string;
      documentType: string;
    }>
  > {
    return ApiClient.request<{
      fileUrl: string;
      fileName: string;
      fileSize: string;
      documentType: string;
    }>(
      "/api/vehicles/documents/upload",
      {
        body: formData,
        method: "POST",
      },
      tenantId
    );
  }

  static async deleteVehicleDocument(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/vehicles/documents/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  // ==========================================
  // Webhooks Module
  // ==========================================
  static async getWebhookEndpoints(
    params: {
      search?: string;
      event?: string;
      isActive?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<WebhookEndpointDto>>> {
    const q = new URLSearchParams();
    if (params.search) {
      q.set("search", params.search);
    }
    if (params.event) {
      q.set("event", params.event);
    }
    if (params.isActive !== undefined) {
      q.set("isActive", String(params.isActive));
    }
    if (params.page) {
      q.set("page", String(params.page));
    }
    if (params.pageSize) {
      q.set("pageSize", String(params.pageSize));
    }
    const qs = q.toString();
    return ApiClient.request<PagedResult<WebhookEndpointDto>>(
      `/api/webhooks${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getWebhookById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<WebhookEndpointDetailDto>> {
    return ApiClient.request<WebhookEndpointDetailDto>(
      `/api/webhooks/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createWebhookEndpoint(
    data: CreateWebhookPayload,
    tenantId?: string
  ): Promise<ApiResponse<WebhookEndpointDto>> {
    return ApiClient.request<WebhookEndpointDto>(
      "/api/webhooks",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateWebhookEndpoint(
    id: string,
    data: UpdateWebhookPayload,
    tenantId?: string
  ): Promise<ApiResponse<WebhookEndpointDto>> {
    return ApiClient.request<WebhookEndpointDto>(
      `/api/webhooks/${id}`,
      {
        body: JSON.stringify({ id, ...data }),
        method: "PUT",
      },
      tenantId
    );
  }

  static async toggleWebhookEndpoint(
    id: string,
    isActive?: boolean,
    tenantId?: string
  ): Promise<ApiResponse<WebhookEndpointDto>> {
    return ApiClient.request<WebhookEndpointDto>(
      `/api/webhooks/${id}/toggle`,
      {
        body: JSON.stringify({ isActive }),
        method: "PATCH",
      },
      tenantId
    );
  }

  static async deleteWebhookEndpoint(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return ApiClient.request<boolean>(
      `/api/webhooks/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async getWebhookDeliveries(
    params: {
      endpointId?: string;
      eventType?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<WebhookDeliveryDto>>> {
    const q = new URLSearchParams();
    if (params.endpointId) {
      q.set("endpointId", params.endpointId);
    }
    if (params.eventType) {
      q.set("eventType", params.eventType);
    }
    if (params.status) {
      q.set("status", params.status);
    }
    if (params.page) {
      q.set("page", String(params.page));
    }
    if (params.pageSize) {
      q.set("pageSize", String(params.pageSize));
    }
    const qs = q.toString();
    return ApiClient.request<PagedResult<WebhookDeliveryDto>>(
      `/api/webhooks/deliveries${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async testWebhookEndpoint(
    id: string,
    data?: {
      mockEventType?: string;
      mockPayload?: Record<string, unknown>;
      payload?: unknown;
      isSimulation?: boolean;
    },
    tenantId?: string
  ): Promise<ApiResponse<WebhookDeliveryDto>> {
    const body: Record<string, unknown> = {
      endpointId: id,
      isSimulation: data?.isSimulation ?? true,
    };
    if (data?.mockEventType) {
      body["mockEventType"] = data.mockEventType;
    }
    if (data?.mockPayload) {
      body["mockPayload"] = data.mockPayload;
    }
    if (data?.payload !== undefined) {
      body["payload"] = data.payload;
    }
    return ApiClient.request<WebhookDeliveryDto>(
      `/api/webhooks/${id}/test-send`,
      {
        body: JSON.stringify(body),
        method: "POST",
      },
      tenantId
    );
  }

  static async retryWebhookDelivery(
    deliveryId: string,
    tenantId?: string
  ): Promise<ApiResponse<WebhookDeliveryDto>> {
    return ApiClient.request<WebhookDeliveryDto>(
      `/api/webhooks/deliveries/${deliveryId}/retry`,
      { method: "POST" },
      tenantId
    );
  }

  // ==========================================
  // Email Module (Phase 1)
  // ==========================================
  static async getEmailAccounts(
    tenantId?: string
  ): Promise<ApiResponse<EmailAccountDto[]>> {
    return await ApiClient.request<EmailAccountDto[]>(
      "/api/email/accounts",
      { method: "GET" },
      tenantId
    );
  }

  static async getEmailAccountById(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<EmailAccountDetailDto>> {
    return await ApiClient.request<EmailAccountDetailDto>(
      `/api/email/accounts/${id}`,
      { method: "GET" },
      tenantId
    );
  }

  static async createEmailAccount(
    data: {
      email: string;
      provider?: string;
      imapHost?: string;
      imapPort?: number;
      smtpHost?: string;
      smtpPort?: number;
      password?: string;
      description?: string;
      isActive?: boolean;
    },
    tenantId?: string
  ): Promise<ApiResponse<EmailAccountDto>> {
    return await ApiClient.request<EmailAccountDto>(
      "/api/email/accounts",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async updateEmailAccount(
    id: string,
    data: {
      id: string;
      email: string;
      provider?: string;
      imapHost?: string;
      imapPort?: number;
      smtpHost?: string;
      smtpPort?: number;
      password?: string;
      description?: string;
      isActive?: boolean;
    },
    tenantId?: string
  ): Promise<ApiResponse<EmailAccountDto>> {
    return await ApiClient.request<EmailAccountDto>(
      `/api/email/accounts/${id}`,
      {
        body: JSON.stringify(data),
        method: "PUT",
      },
      tenantId
    );
  }

  static async toggleEmailAccount(
    id: string,
    isActive?: boolean,
    tenantId?: string
  ): Promise<ApiResponse<EmailAccountDto>> {
    return await ApiClient.request<EmailAccountDto>(
      `/api/email/accounts/${id}/toggle`,
      {
        body: JSON.stringify({ id, isActive }),
        method: "PATCH",
      },
      tenantId
    );
  }

  static async deleteEmailAccount(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return await ApiClient.request<boolean>(
      `/api/email/accounts/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }

  static async testEmailAccountConnection(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<TestEmailAccountConnectionResultDto>> {
    return await ApiClient.request<TestEmailAccountConnectionResultDto>(
      `/api/email/accounts/${id}/test-connection`,
      { method: "POST" },
      tenantId
    );
  }

  static async getEmailMessages(
    params: {
      accountId?: string;
      direction?: string;
      status?: string;
      customerId?: string;
      isRead?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
    tenantId?: string
  ): Promise<ApiResponse<PagedResult<EmailMessageDto>>> {
    const q = new URLSearchParams();
    if (params.accountId) {
      q.set("accountId", params.accountId);
    }
    if (params.direction) {
      q.set("direction", params.direction);
    }
    if (params.status) {
      q.set("status", params.status);
    }
    if (params.customerId) {
      q.set("customerId", params.customerId);
    }
    if (typeof params.isRead === "boolean") {
      q.set("isRead", String(params.isRead));
    }
    if (params.search) {
      q.set("search", params.search);
    }
    if (params.page) {
      q.set("page", String(params.page));
    }
    if (params.pageSize) {
      q.set("pageSize", String(params.pageSize));
    }
    const qs = q.toString();
    return await ApiClient.request<PagedResult<EmailMessageDto>>(
      `/api/email/messages${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getEmailThread(
    threadId: string,
    tenantId?: string
  ): Promise<ApiResponse<EmailThreadDto>> {
    return await ApiClient.request<EmailThreadDto>(
      `/api/email/threads/${threadId}`,
      { method: "GET" },
      tenantId
    );
  }

  static async getEmailStats(
    tenantId?: string
  ): Promise<ApiResponse<EmailStatsDto>> {
    return await ApiClient.request<EmailStatsDto>(
      "/api/email/stats",
      { method: "GET" },
      tenantId
    );
  }

  static async sendEmailMessage(
    data: {
      accountId: string;
      to: string[];
      cc?: string[];
      subject: string;
      htmlBody: string;
      textBody?: string;
      templateId?: string;
      customerId?: string;
      quoteId?: string;
      ticketId?: string;
      attachments?: Array<{
        filename: string;
        mimeType?: string;
        sizeBytes: number;
        storagePath: string;
      }>;
      isSimulation?: boolean;
    },
    tenantId?: string
  ): Promise<ApiResponse<EmailMessageDto>> {
    return await ApiClient.request<EmailMessageDto>(
      "/api/email/messages/send",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async saveEmailDraft(
    data: {
      id?: string;
      accountId: string;
      to?: string[];
      cc?: string[];
      subject?: string;
      htmlBody?: string;
      textBody?: string;
      customerId?: string;
      quoteId?: string;
      ticketId?: string;
      attachments?: Array<{
        filename: string;
        mimeType?: string;
        sizeBytes: number;
        storagePath: string;
      }>;
    },
    tenantId?: string
  ): Promise<ApiResponse<EmailMessageDto>> {
    return await ApiClient.request<EmailMessageDto>(
      "/api/email/messages/draft",
      {
        body: JSON.stringify(data),
        method: "POST",
      },
      tenantId
    );
  }

  static async markEmailRead(
    id: string,
    isRead: boolean,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return await ApiClient.request<boolean>(
      `/api/email/messages/${id}/read`,
      {
        body: JSON.stringify({ isRead }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
      tenantId
    );
  }

  static async deleteEmailMessage(
    id: string,
    tenantId?: string
  ): Promise<ApiResponse<boolean>> {
    return await ApiClient.request<boolean>(
      `/api/email/messages/${id}`,
      { method: "DELETE" },
      tenantId
    );
  }
}

export interface CustomerListDto {
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  city?: string;
  contactsCount: number;
  country?: string;
  createdAt: string;
  currency: string;
  dealsCount: number;
  email?: string;
  id: string;
  industry?: string;
  name: string;
  notesCount: number;
  phone?: string;
  status: "Lead" | "Active" | "Passive" | "Churned" | string;
  tags?: string[];
  tenantId: string;
  tier: "VIP" | "Enterprise" | "SME" | "Standard" | string;
  totalRevenue: number;
  type: "Company" | "Individual" | string;
  updatedAt: string;
  website?: string;
}

export interface PagedCustomersResponse {
  items: CustomerListDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CustomerContactDto {
  createdAt: string;
  customerId: string;
  department?: string;
  email?: string;
  firstName: string;
  fullName: string;
  id: string;
  isPrimary: boolean;
  lastName: string;
  mobile?: string;
  notes?: string;
  phone?: string;
  title?: string;
}

export interface CustomerActivityDto {
  activityType:
    | "Call"
    | "Meeting"
    | "Email"
    | "Note"
    | "StatusChange"
    | "DealCreated"
    | string;
  createdAt: string;
  customerId: string;
  description?: string;
  id: string;
  performedAt: string;
  title: string;
  userId?: string;
}

export interface CustomerNoteDto {
  content: string;
  createdAt: string;
  customerId: string;
  id: string;
  isPinned: boolean;
  updatedAt: string;
  userId?: string;
}

export interface CustomerDetailDto {
  activities: CustomerActivityDto[];
  addressLine?: string;
  assignedEmployeeAvatar?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedUserId?: string;
  city?: string;
  contacts: CustomerContactDto[];
  country?: string;
  createdAt: string;
  currency: string;
  dealsCount: number;
  email?: string;
  id: string;
  industry?: string;
  name: string;
  notes: CustomerNoteDto[];
  notesCount: number;
  phone?: string;
  postalCode?: string;
  state?: string;
  status: "Lead" | "Active" | "Passive" | "Churned" | string;
  tags?: string[];
  taxNumber?: string;
  taxOffice?: string;
  tenantId: string;
  tier: "VIP" | "Enterprise" | "SME" | "Standard" | string;
  totalRevenue: number;
  type: "Company" | "Individual" | string;
  updatedAt: string;
  website?: string;
}

export interface CustomerStatsDto {
  activeCustomers: number;
  averageRevenuePerCustomer: number;
  churnedCustomers: number;
  companiesCount: number;
  currency: string;
  enterpriseCount: number;
  individualsCount: number;
  leadCustomers: number;
  totalCustomers: number;
  totalRevenue: number;
  vipCount: number;
}

export interface CreateCustomerRequest {
  addressLine?: string;
  assignedEmployeeId?: string;
  city?: string;
  country?: string;
  email?: string;
  industry?: string;
  initialContactEmail?: string;
  initialContactFirstName?: string;
  initialContactLastName?: string;
  initialContactPhone?: string;
  initialContactTitle?: string;
  name: string;
  phone?: string;
  postalCode?: string;
  state?: string;
  status: string;
  tags?: string[];
  taxNumber?: string;
  taxOffice?: string;
  tier: string;
  type: string;
  website?: string;
}

export interface UpdateCustomerRequest {
  addressLine?: string;
  assignedEmployeeId?: string;
  city?: string;
  country?: string;
  email?: string;
  industry?: string;
  name: string;
  phone?: string;
  postalCode?: string;
  state?: string;
  status: string;
  tags?: string[];
  taxNumber?: string;
  taxOffice?: string;
  tier: string;
  type: string;
  website?: string;
}

export interface AddCustomerContactRequest {
  department?: string;
  email?: string;
  firstName: string;
  isPrimary: boolean;
  lastName: string;
  mobile?: string;
  notes?: string;
  phone?: string;
  title?: string;
}

export interface AddCustomerNoteRequest {
  content: string;
  isPinned?: boolean;
}

export interface AddCustomerActivityRequest {
  activityType: string;
  description?: string;
  performedAt?: string;
  title: string;
}

// ==========================================
// Product DTOs
// ==========================================
export interface ProductCategoryDto {
  createdAt: string;
  description?: string;
  fullPath?: string;
  icon?: string;
  id: string;
  isActive: boolean;
  name: string;
  parentId?: string;
  parentName?: string;
  productsCount: number;
  slug: string;
  tenantId: string;
  updatedAt: string;
}

export interface ProductListDto {
  availableStock: number;
  barcode?: string;
  brand?: string;
  categoryId?: string;
  categoryName?: string;
  costPrice: number;
  createdAt: string;
  currency: string;
  currentStock: number;
  discountRate: number;
  id: string;
  images?: string[];
  isLowStock: boolean;
  minStockLevel: number;
  name: string;
  profitMargin: number;
  reservedStock: number;
  sellingPrice: number;
  sku?: string;
  status: "Active" | "Inactive" | "Draft" | "Discontinued" | string;
  tags?: string[];
  taxRate: number;
  tenantId: string;
  trackInventory: boolean;
  type: "Physical" | "Service" | "Digital" | "Subscription" | string;
  unit: string;
  updatedAt: string;
  variantsCount: number;
}

export interface PagedProductsResponse {
  items: ProductListDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ProductVariantDetailDto {
  additionalPrice: number;
  attributes?: string;
  barcode?: string;
  createdAt: string;
  id: string;
  isActive: boolean;
  name: string;
  productId: string;
  sku?: string;
  stockQuantity: number;
}

export interface ProductStockMovementDto {
  createdAt: string;
  id: string;
  movementType: "In" | "Out" | "Adjustment" | "Return" | string;
  newStock: number;
  notes?: string;
  performedByUserId?: string;
  previousStock: number;
  productId: string;
  quantity: number;
  reason?: string;
  referenceNumber?: string;
  unitCost?: number;
  variantId?: string;
  variantName?: string;
}

export interface ProductDetailDto {
  attributes?: string;
  availableStock: number;
  barcode?: string;
  brand?: string;
  categoryId?: string;
  categoryName?: string;
  costPrice: number;
  createdAt: string;
  currency: string;
  currentStock: number;
  description?: string;
  discountRate: number;
  id: string;
  images?: string[];
  isLowStock: boolean;
  minStockLevel: number;
  name: string;
  profitMargin: number;
  reservedStock: number;
  sellingPrice: number;
  sku?: string;
  status: "Active" | "Inactive" | "Draft" | "Discontinued" | string;
  stockMovements: ProductStockMovementDto[];
  tags?: string[];
  taxRate: number;
  tenantId: string;
  trackInventory: boolean;
  type: "Physical" | "Service" | "Digital" | "Subscription" | string;
  unit: string;
  updatedAt: string;
  variants: ProductVariantDetailDto[];
}

export interface ProductStatsDto {
  currency: string;
  digitalProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  physicalProductsCount: number;
  servicesCount: number;
  subscriptionsCount: number;
  totalInventoryValue: number;
  totalProducts: number;
  totalRetailValue: number;
}

export interface CreateProductRequest {
  attributes?: string;
  barcode?: string;
  brand?: string;
  categoryId?: string;
  costPrice: number;
  currency?: string;
  description?: string;
  discountRate?: number;
  images?: string[];
  initialStock?: number;
  minStockLevel?: number;
  name: string;
  sellingPrice: number;
  sku?: string;
  status?: string;
  tags?: string[];
  taxRate?: number;
  trackInventory?: boolean;
  type: string;
  unit: string;
}

export interface UpdateProductRequest {
  attributes?: string;
  barcode?: string;
  brand?: string;
  categoryId?: string;
  costPrice: number;
  currency?: string;
  description?: string;
  discountRate?: number;
  images?: string[];
  minStockLevel?: number;
  name: string;
  sellingPrice: number;
  sku?: string;
  status?: string;
  tags?: string[];
  taxRate?: number;
  trackInventory?: boolean;
  type: string;
  unit: string;
}

export interface CreateProductCategoryRequest {
  description?: string;
  icon?: string;
  name: string;
  parentId?: string;
}

export interface AdjustProductStockRequest {
  movementType: "In" | "Out" | "Adjustment" | "Return" | string;
  notes?: string;
  quantity: number;
  reason?: string;
  referenceNumber?: string;
  unitCost?: number;
  variantId?: string;
}

export interface AddProductVariantRequest {
  additionalPrice?: number;
  attributes?: string;
  barcode?: string;
  name: string;
  sku?: string;
  stockQuantity?: number;
}

// ==========================================
// Order DTOs
// ==========================================
export interface OrderListDto {
  carrier?: string;
  createdAt: string;
  currency: string;
  customerId?: string;
  customerName: string;
  discountAmount: number;
  dueDate?: string;
  id: string;
  invoiceNumber?: string;
  itemsCount: number;
  orderDate: string;
  orderNumber: string;
  paidAmount: number;
  paymentMethod:
    | "BankTransfer"
    | "CreditCard"
    | "Cash"
    | "Check"
    | "OpenAccount"
    | string;
  paymentStatus: "Unpaid" | "PartiallyPaid" | "Paid" | "Refunded" | string;
  remainingAmount: number;
  shippingFee: number;
  status:
    | "Draft"
    | "PendingApproval"
    | "Confirmed"
    | "Processing"
    | "Shipped"
    | "Delivered"
    | "Cancelled"
    | "Refunded"
    | string;
  subtotal: number;
  taxAmount: number;
  tenantId: string;
  totalAmount: number;
  trackingNumber?: string;
  updatedAt: string;
}

export interface PagedOrdersResponse {
  items: OrderListDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface OrderItemDetailDto {
  createdAt: string;
  discountAmount: number;
  discountRate: number;
  id: string;
  optionsOrNotes?: string;
  orderId: string;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  taxAmount: number;
  taxRate: number;
  totalPrice: number;
  unit: string;
  unitCost: number;
  unitPrice: number;
  variantId?: string;
}

export interface OrderPaymentDetailDto {
  amount: number;
  createdAt: string;
  id: string;
  notes?: string;
  orderId: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
}

export interface OrderActivityDetailDto {
  activityType: string;
  createdAt: string;
  description?: string;
  id: string;
  orderId: string;
  title: string;
}

export interface OrderDetailDto {
  activities: OrderActivityDetailDto[];
  billingAddress?: string;
  carrier?: string;
  createdAt: string;
  currency: string;
  customerId?: string;
  customerName: string;
  discountAmount: number;
  dueDate?: string;
  id: string;
  invoiceNumber?: string;
  items: OrderItemDetailDto[];
  notes?: string;
  orderDate: string;
  orderNumber: string;
  paidAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  payments: OrderPaymentDetailDto[];
  remainingAmount: number;
  shippingAddress?: string;
  shippingFee: number;
  status: string;
  subtotal: number;
  taxAmount: number;
  tenantId: string;
  totalAmount: number;
  trackingNumber?: string;
  updatedAt: string;
}

export interface OrderStatsDto {
  cancelledOrders: number;
  confirmedOrders: number;
  currency: string;
  deliveredOrders: number;
  paidRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  totalOrders: number;
  totalRevenue: number;
  unpaidRevenue: number;
}

export interface CreateOrderItemRequest {
  discountRate?: number;
  optionsOrNotes?: string;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  taxRate?: number;
  unit?: string;
  unitCost?: number;
  unitPrice: number;
  variantId?: string;
}

export interface CreateOrderRequest {
  billingAddress?: string;
  carrier?: string;
  currency?: string;
  customerId?: string;
  customerName: string;
  dueDate?: string;
  generalDiscountAmount?: number;
  invoiceNumber?: string;
  items: CreateOrderItemRequest[];
  notes?: string;
  orderDate?: string;
  paymentMethod?: string;
  shippingAddress?: string;
  shippingFee?: number;
  status?: string;
  trackingNumber?: string;
}

export interface UpdateOrderItemDto {
  discountRate?: number;
  id?: string;
  optionsOrNotes?: string;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  taxRate?: number;
  unit?: string;
  unitCost?: number;
  unitPrice: number;
  variantId?: string;
}

export interface UpdateOrderRequest {
  billingAddress?: string;
  carrier?: string;
  currency?: string;
  customerId?: string;
  customerName: string;
  dueDate?: string;
  generalDiscountAmount?: number;
  invoiceNumber?: string;
  items: UpdateOrderItemDto[];
  notes?: string;
  orderDate?: string;
  paymentMethod?: string;
  shippingAddress?: string;
  shippingFee?: number;
  trackingNumber?: string;
}

export interface ChangeOrderStatusRequest {
  newStatus: string;
  notes?: string;
}

export interface AddOrderPaymentRequest {
  amount: number;
  notes?: string;
  paymentDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
}

// ==========================================
// Leave DTOs
// ==========================================
export interface LeaveBalanceDto {
  employeeId: string;
  id: string;
  pendingDays: number;
  remainingDays: number;
  totalDays: number;
  usedDays: number;
  year: number;
}

export interface LeaveRequestDto {
  approvedAt?: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  createdAt: string;
  departmentId?: string;
  departmentName?: string;
  emergencyContact?: string;
  employeeId: string;
  employeeName: string;
  endDate: string;
  halfDayPeriod?: "Morning" | "Afternoon" | string;
  id: string;
  isHalfDay: boolean;
  leaveType:
    | "Annual"
    | "Casual"
    | "Sick"
    | "Unpaid"
    | "Marriage"
    | "Maternity"
    | "Paternity"
    | "Bereavement"
    | "Other"
    | string;
  reason?: string;
  rejectionReason?: string;
  startDate: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled" | string;
  tenantId: string;
  totalDays: number;
  updatedAt: string;
}

export interface PagedLeaveRequestsResponse {
  items: LeaveRequestDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface LeaveCalendarEventDto {
  departmentId?: string;
  departmentName?: string;
  employeeId: string;
  employeeName: string;
  endDate: string;
  halfDayPeriod?: string;
  id: string;
  isHalfDay: boolean;
  leaveType: string;
  reason?: string;
  startDate: string;
  status: string;
  totalDays: number;
}

export interface LeaveStatsDto {
  pendingRequestsCount: number;
  thisMonthUsedDays: number;
  todayOnLeaveCount: number;
  totalApprovedRequests: number;
}

export interface CreateLeaveRequestPayload {
  departmentId?: string;
  departmentName?: string;
  emergencyContact?: string;
  employeeId: string;
  employeeName: string;
  endDate: string;
  halfDayPeriod?: string;
  isHalfDay?: boolean;
  leaveType: string;
  reason?: string;
  startDate: string;
}

// ==========================================
// Payroll DTOs & Interfaces
// ==========================================
export interface PayrollParameterDto {
  besDefaultRate: number;
  id: string;
  isActive: boolean;
  mealExemptionDaily: number;
  minWageGross: number;
  minWageNet: number;
  minWageStampExemption: number;
  minWageTaxExemption: number;
  sgkCeiling: number;
  sgkEmployeeRate: number;
  sgkEmployerDiscount5510Rate: number;
  sgkEmployerRate: number;
  sgkFloor: number;
  stampTaxRate: number;
  taxBracket1Limit: number;
  taxBracket1Rate: number;
  taxBracket2Limit: number;
  taxBracket2Rate: number;
  taxBracket3Limit: number;
  taxBracket3Rate: number;
  taxBracket4Limit: number;
  taxBracket4Rate: number;
  taxBracket5Rate: number;
  title: string;
  travelExemptionDaily: number;
  unemploymentEmployeeRate: number;
  unemploymentEmployerRate: number;
  year: number;
}

export interface UpdatePayrollParametersRequest {
  besDefaultRate: number;
  isActive: boolean;
  mealExemptionDaily: number;
  minWageGross: number;
  minWageNet: number;
  minWageStampExemption: number;
  minWageTaxExemption: number;
  sgkCeiling: number;
  sgkEmployeeRate: number;
  sgkEmployerDiscount5510Rate: number;
  sgkEmployerRate: number;
  sgkFloor: number;
  stampTaxRate: number;
  taxBracket1Limit: number;
  taxBracket1Rate: number;
  taxBracket2Limit: number;
  taxBracket2Rate: number;
  taxBracket3Limit: number;
  taxBracket3Rate: number;
  taxBracket4Limit: number;
  taxBracket4Rate: number;
  taxBracket5Rate: number;
  title: string;
  travelExemptionDaily: number;
  unemploymentEmployeeRate: number;
  unemploymentEmployerRate: number;
  year: number;
}

export interface PayrollRunDto {
  approvedAt?: string;
  approvedByUserName?: string;
  calculatedAt?: string;
  createdAt: string;
  id: string;
  lockedAt?: string;
  month: number;
  notes?: string;
  status: "Draft" | "Calculated" | "Approved" | "Locked" | string;
  tenantId: string;
  title: string;
  totalEmployees: number;
  totalEmployerCost: number;
  totalGross: number;
  totalIncomeTax: number;
  totalNet: number;
  totalSgkEmployee: number;
  totalSgkEmployer: number;
  totalStampTax: number;
  updatedAt: string;
  year: number;
}

export interface PagedPayrollRunsResponse {
  items: PayrollRunDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface EmployeePayrollDetailDto {
  advanceDeduction: number;
  baseSalary: number;
  besDeduction: number;
  bonusGross: number;
  calculatedIncomeTax: number;
  calculatedStampTax: number;
  contractSalaryType: "Gross" | "Net" | string;
  createdAt: string;
  currentCumulativeIncomeTaxBase: number;
  currentIncomeTaxBase: number;
  departmentId?: string;
  departmentName?: string;
  employeeId: string;
  employeeName: string;
  employeeNumber?: string;
  holidayDays: number;
  iban?: string;
  icraDeduction: number;
  id: string;
  jobTitle?: string;
  mealAllowanceGross: number;
  minWageIncomeTaxExemption: number;
  minWageStampExemption: number;
  netSalary: number;
  normalGross: number;
  otherGross: number;
  overtimeGross: number;
  overtimeHours: number;
  paidLeaveDays: number;
  payableIncomeTax: number;
  payableNetSalary: number;
  payableStampTax: number;
  payrollRunId: string;
  priorCumulativeIncomeTaxBase: number;
  privateHealthInsuranceDeduction: number;
  sgkBase: number;
  sgkEmployeeDeduction: number;
  sgkEmployerDeduction: number;
  sgkEmployerDiscount5510: number;
  sickLeaveDays: number;
  status: string;
  tcIdentityNumber?: string;
  totalDeductions: number;
  totalEmployerCost: number;
  totalGross: number;
  totalPaidDays: number;
  travelAllowanceGross: number;
  unemploymentEmployeeDeduction: number;
  unemploymentEmployerDeduction: number;
  unpaidLeaveDays: number;
  updatedAt: string;
  weekendDays: number;
  workedDays: number;
}

export interface PayrollRunDetailResponse {
  employees: EmployeePayrollDetailDto[];
  run: PayrollRunDto;
}

export interface PayslipDto {
  advanceDeduction: number;
  approvedAt?: string;
  baseSalary: number;
  besDeduction: number;
  bonusGross: number;
  calculatedAt?: string;
  calculatedIncomeTax: number;
  calculatedStampTax: number;
  contractSalaryType: string;
  createdAt: string;
  currentCumulativeIncomeTaxBase: number;
  currentIncomeTaxBase: number;
  departmentId?: string;
  departmentName?: string;
  employeeId: string;
  employeeName: string;
  employeeNumber?: string;
  holidayDays: number;
  iban?: string;
  icraDeduction: number;
  id: string;
  jobTitle?: string;
  mealAllowanceGross: number;
  minWageIncomeTaxExemption: number;
  minWageStampExemption: number;
  month: number;
  netSalary: number;
  normalGross: number;
  otherGross: number;
  overtimeGross: number;
  overtimeHours: number;
  paidLeaveDays: number;
  payableIncomeTax: number;
  payableNetSalary: number;
  payableStampTax: number;
  payrollRunId: string;
  priorCumulativeIncomeTaxBase: number;
  privateHealthInsuranceDeduction: number;
  runStatus: string;
  runTitle: string;
  sgkBase: number;
  sgkEmployeeDeduction: number;
  sgkEmployerDeduction: number;
  sgkEmployerDiscount5510: number;
  sickLeaveDays: number;
  tcIdentityNumber?: string;
  totalDeductions: number;
  totalEmployerCost: number;
  totalGross: number;
  totalPaidDays: number;
  travelAllowanceGross: number;
  unemploymentEmployeeDeduction: number;
  unemploymentEmployerDeduction: number;
  unpaidLeaveDays: number;
  weekendDays: number;
  workedDays: number;
  year: number;
}

export interface PayrollCalculationResultDto {
  advanceDeduction: number;
  baseSalary: number;
  besDeduction: number;
  bonusGross: number;
  calculatedIncomeTax: number;
  calculatedStampTax: number;
  contractSalaryType: string;
  currentCumulativeIncomeTaxBase: number;
  currentIncomeTaxBase: number;
  holidayDays: number;
  icraDeduction: number;
  mealAllowanceGross: number;
  minWageIncomeTaxExemption: number;
  minWageStampExemption: number;
  netSalary: number;
  normalGross: number;
  otherGross: number;
  overtimeGross: number;
  overtimeHours: number;
  paidLeaveDays: number;
  payableIncomeTax: number;
  payableNetSalary: number;
  payableStampTax: number;
  priorCumulativeIncomeTaxBase: number;
  privateHealthInsuranceDeduction: number;
  sgkBase: number;
  sgkEmployeeDeduction: number;
  sgkEmployerDeduction: number;
  sgkEmployerDiscount5510: number;
  sickLeaveDays: number;
  totalDeductions: number;
  totalEmployerCost: number;
  totalGross: number;
  totalPaidDays: number;
  travelAllowanceGross: number;
  unemploymentEmployeeDeduction: number;
  unemploymentEmployerDeduction: number;
  unpaidLeaveDays: number;
  weekendDays: number;
  workedDays: number;
}

export interface CreatePayrollRunRequest {
  month: number;
  notes?: string;
  title?: string;
  year: number;
}

export interface UpdateEmployeePuantajRequest {
  advanceDeduction: number;
  baseSalary: number;
  besRate: number;
  bonusGross: number;
  contractSalaryType: string;
  hasBes: boolean;
  holidayDays: number;
  icraDeduction: number;
  mealAllowanceGross: number;
  otherGross: number;
  overtimeHours: number;
  paidLeaveDays: number;
  privateHealthInsurance: number;
  sickLeaveDays: number;
  travelAllowanceGross: number;
  unpaidLeaveDays: number;
  weekendDays: number;
  workedDays: number;
}

export interface SimulatePayrollRequest {
  advanceDeduction?: number;
  apply5510Incentive?: boolean;
  baseSalary: number;
  besRate?: number;
  bonusGross?: number;
  contractSalaryType?: string;
  hasBes?: boolean;
  holidayDays?: number;
  icraDeduction?: number;
  mealAllowance?: number;
  otherGross?: number;
  overtimeHours?: number;
  paidLeaveDays?: number;
  priorCumulativeIncomeTaxBase?: number;
  privateHealthInsurance?: number;
  sickLeaveDays?: number;
  travelAllowance?: number;
  unpaidLeaveDays?: number;
  weekendDays?: number;
  workedDays?: number;
  year?: number;
}

export interface PayrollIcmalRowDto {
  advanceDeduction: number;
  baseSalary: number;
  besDeduction: number;
  calculatedIncomeTax: number;
  calculatedStampTax: number;
  currentCumulativeIncomeTaxBase: number;
  currentIncomeTaxBase: number;
  departmentName: string;
  employeeName: string;
  employeeNumber: string;
  iban: string;
  icraDeduction: number;
  jobTitle: string;
  minWageIncomeTaxExemption: number;
  minWageStampExemption: number;
  overtimeHours: number;
  payableIncomeTax: number;
  payableNetSalary: number;
  payableStampTax: number;
  priorCumulativeIncomeTaxBase: number;
  sgkBase: number;
  sgkEmployeeDeduction: number;
  sgkEmployerDeduction: number;
  sgkEmployerDiscount5510: number;
  tcIdentityNumber: string;
  totalDeductions: number;
  totalEmployerCost: number;
  totalGross: number;
  totalPaidDays: number;
  unemploymentEmployeeDeduction: number;
  unemploymentEmployerDeduction: number;
  workedDays: number;
}

export interface PayrollIcmalResponse {
  month: number;
  rows: PayrollIcmalRowDto[];
  runId: string;
  status: string;
  title: string;
  totalEmployees: number;
  totalEmployerCost: number;
  totalGross: number;
  totalIncomeTax: number;
  totalNet: number;
  totalSgkEmployee: number;
  totalSgkEmployer: number;
  totalStampTax: number;
  year: number;
}

// Attendance & Shifts
export interface ShiftTemplateDto {
  breakDurationMinutes: number;
  code: string;
  colorHex: string;
  endTime: string;
  gracePeriodMinutes: number;
  id: string;
  isActive: boolean;
  isFlexible: boolean;
  isNightShift: boolean;
  minWorkingHours: number;
  name: string;
  startTime: string;
}

export interface CreateShiftTemplatePayload {
  breakDurationMinutes?: number;
  code: string;
  colorHex?: string;
  endTime: string;
  gracePeriodMinutes?: number;
  isFlexible?: boolean;
  isNightShift?: boolean;
  minWorkingHours?: number;
  name: string;
  startTime: string;
}

export interface ShiftScheduleDto {
  customEndTime?: string;
  customStartTime?: string;
  date: string;
  departmentId?: string;
  departmentName?: string;
  employeeId: string;
  employeeName: string;
  endTime: string;
  id: string;
  notes?: string;
  shiftCode: string;
  shiftColorHex: string;
  shiftName: string;
  shiftTemplateId: string;
  startTime: string;
  status: string;
}

export interface AssignShiftsPayload {
  departmentId?: string;
  departmentName?: string;
  employeeIds: string[];
  employeeNames: string[];
  endDate: string;
  notes?: string;
  repeatOnDays?: number[];
  shiftTemplateId: string;
  startDate: string;
}

export interface PunchAttendancePayload {
  breakType?: string;
  employeeId: string;
  employeeName: string;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  note?: string;
  punchType: "ClockIn" | "ClockOut" | "BreakStart" | "BreakEnd";
  source?: string;
}

export interface TodayStatusDto {
  clockInTime?: string;
  currentStatus: string;
  date: string;
  employeeId: string;
  employeeName: string;
  isClockedIn: boolean;
  isOnBreak: boolean;
  lastBreakStartTime?: string;
  shiftEndTime?: string;
  shiftName?: string;
  shiftStartTime?: string;
  totalBreakMinutesToday: number;
  totalWorkedMinutesToday: number;
}

export interface LiveEmployeeStatusDto {
  breakMinutesSoFar: number;
  clockInTime?: string;
  currentState: "Working" | "OnBreak" | "Late" | "Absent" | "Completed";
  departmentName?: string;
  employeeId: string;
  employeeName: string;
  shiftEndTime?: string;
  shiftName?: string;
  shiftStartTime?: string;
  workedMinutesSoFar: number;
}

export interface LiveMonitorResponse {
  absentCount: number;
  currentlyOnBreak: number;
  currentlyWorking: number;
  employees: LiveEmployeeStatusDto[];
  lateArrivals: number;
  totalEmployees: number;
}

export interface AttendanceRecordDto {
  adminNotes?: string;
  date: string;
  departmentId?: string;
  departmentName?: string;
  earlyLeaveMinutes: number;
  employeeId: string;
  employeeName: string;
  expectedWorkedMinutes: number;
  firstClockIn?: string;
  holidayOvertimeMinutes: number;
  id: string;
  isApproved: boolean;
  lastClockOut?: string;
  lateMinutes: number;
  overtimeMinutes: number;
  shiftName?: string;
  status: string;
  totalBreakMinutes: number;
  totalWorkedMinutes: number;
}

export interface AttendanceCorrectionRequestDto {
  createdAt: string;
  date: string;
  employeeId: string;
  employeeName: string;
  id: string;
  reason: string;
  rejectionReason?: string;
  requestedClockIn?: string;
  requestedClockOut?: string;
  status: string;
}

export interface SubmitCorrectionPayload {
  date: string;
  employeeId: string;
  employeeName: string;
  reason: string;
  requestedClockIn?: string;
  requestedClockOut?: string;
}

// --- Chat Interfaces ---

export interface ChatParticipantDto {
  id: string;
  isMuted: boolean;
  joinedAt: string;
  lastReadAt?: string;
  role: "Owner" | "Admin" | "Member" | "Agent" | "Customer" | string;
  userAvatarUrl?: string;
  userEmail?: string;
  userId: string;
  userName: string;
}

export interface CustomerSupportSessionDto {
  assignedUserId?: string;
  assignedUserName?: string;
  channelId: string;
  closedAt?: string;
  createdAt: string;
  customerEmail?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  departmentId?: string;
  departmentName?: string;
  id: string;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
  resolutionNotes?: string;
  status: "Open" | "Pending" | "Resolved" | "Closed" | string;
  subject?: string;
}

export interface ChatChannelDto {
  createdAt: string;
  customerId?: string;
  customerName?: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  id: string;
  isPrivate: boolean;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  participants: ChatParticipantDto[];
  supportSession?: CustomerSupportSessionDto | null;
  title: string;
  type: "Direct" | "Group" | "CustomerSupport" | string;
  unreadCount: number;
}

export interface ChatAttachmentDto {
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  fileUrl: string;
  id: string;
}

export interface ChatEntityEmbedDto {
  entityId: string;
  entityStatus?: string;
  entitySubtitle?: string;
  entityTitle: string;
  entityType:
    | "Customer"
    | "Order"
    | "Product"
    | "LeaveRequest"
    | "ShiftSchedule"
    | "AttendanceRecord"
    | string;
  id: string;
  metadataJson?: string;
}

export interface ChatMessageDto {
  attachments: ChatAttachmentDto[];
  channelId: string;
  content: string;
  createdAt: string;
  entityEmbeds: ChatEntityEmbedDto[];
  id: string;
  isDeleted: boolean;
  isEdited: boolean;
  messageType: "Text" | "InternalNote" | "SystemEvent" | "EntityEmbed" | string;
  replyToMessageId?: string;
  senderAvatarUrl?: string;
  senderName: string;
  senderType: "User" | "Customer" | "System" | string;
  senderUserId?: string;
}

export interface CannedResponseDto {
  category: string;
  content: string;
  createdAt: string;
  id: string;
  shortcut: string;
  title: string;
}

export interface RecentOrderSummaryDto {
  currency: string;
  id: string;
  orderDate: string;
  orderNumber: string;
  paymentStatus: string;
  status: string;
  totalAmount: number;
}

export interface Customer360ChatContextDto {
  balance: number;
  company?: string;
  customerId: string;
  customerName: string;
  customerType?: string;
  email?: string;
  openSupportSessionsCount: number;
  phone?: string;
  recentOrders: RecentOrderSummaryDto[];
  totalOrdersCount: number;
  totalRevenue: number;
}

export interface CreateChannelPayload {
  currentUserId?: string;
  currentUserName?: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  isPrivate?: boolean;
  participantUserIds?: string[];
  title: string;
  type: "Direct" | "Group" | "CustomerSupport" | string;
}

export interface GetOrCreateDirectChatPayload {
  currentUserAvatarUrl?: string;
  currentUserEmail?: string;
  currentUserId: string;
  currentUserName: string;
  targetUserAvatarUrl?: string;
  targetUserEmail?: string;
  targetUserId: string;
  targetUserName: string;
}

export interface SendMessagePayload {
  attachments?: {
    fileName: string;
    fileSizeBytes: number;
    fileType: string;
    fileUrl: string;
  }[];
  channelId: string;
  content: string;
  entityEmbeds?: {
    entityId: string;
    entityStatus?: string;
    entitySubtitle?: string;
    entityTitle: string;
    entityType: string;
    metadataJson?: string;
  }[];
  messageType?:
    | "Text"
    | "InternalNote"
    | "SystemEvent"
    | "EntityEmbed"
    | string;
  replyToMessageId?: string;
  senderAvatarUrl?: string;
  senderName: string;
  senderType?: "User" | "Customer" | "System" | string;
  senderUserId?: string;
}

export interface CreateCannedResponsePayload {
  category: string;
  content: string;
  currentUserId?: string;
  shortcut: string;
  title: string;
}

export interface CreateCustomerSupportSessionPayload {
  assignedUserId?: string;
  assignedUserName?: string;
  customerEmail?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  departmentId?: string;
  departmentName?: string;
  initialMessage: string;
  priority?: "Low" | "Medium" | "High" | "Urgent" | string;
  subject: string;
}

export interface UpdateSupportSessionStatusPayload {
  assignedUserId?: string;
  assignedUserName?: string;
  channelId: string;
  priority?: string;
  resolutionNotes?: string;
  status: "Open" | "Pending" | "Resolved" | "Closed" | string;
}

// --- Shipping Interfaces ---

export interface CarrierDto {
  activeShipmentsCount: number;
  branchCode?: string;
  code: string;
  customerAccountNumber?: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  trackingUrlTemplate?: string;
}

export interface ShipmentItemDto {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  unit: string;
}

export interface ShipmentStatusHistoryDto {
  changedByName?: string;
  changedByUserId?: string;
  createdAt: string;
  description?: string;
  id: string;
  location?: string;
  status:
    | "Preparing"
    | "Dispatched"
    | "InTransit"
    | "Delivered"
    | "FailedDelivery"
    | "Cancelled"
    | string;
}

export interface ShipmentDto {
  carrierId?: string;
  carrierName?: string;
  createdAt: string;
  customerId?: string;
  customerName: string;
  deliveredAt?: string;
  dispatchedAt?: string;
  id: string;
  items: ShipmentItemDto[];
  notes?: string;
  orderId?: string;
  orderNumber?: string;
  packageCount: number;
  preparedByName?: string;
  preparedByUserId?: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientDistrict?: string;
  recipientName: string;
  recipientPhone?: string;
  shipmentNumber: string;
  shippingCost: number;
  status:
    | "Preparing"
    | "Dispatched"
    | "InTransit"
    | "Delivered"
    | "FailedDelivery"
    | "Cancelled"
    | string;
  statusHistories: ShipmentStatusHistoryDto[];
  totalDesi: number;
  totalWeightKg: number;
  trackingNumber?: string;
  trackingUrl?: string;
  type: "Outbound" | "Return" | string;
  updatedAt: string;
}

export interface ShippingStatsDto {
  deliveredTodayCount: number;
  deliverySuccessRatePercentage: number;
  inTransitCount: number;
  pendingReturnsCount: number;
  preparingCount: number;
  totalShipments: number;
}

export interface ReturnShipmentDto {
  carrierId?: string;
  carrierName?: string;
  createdAt: string;
  customerId?: string;
  customerName: string;
  id: string;
  inspectedAt?: string;
  inspectedByName?: string;
  inspectedByUserId?: string;
  inspectionNotes?: string;
  orderId?: string;
  originalShipmentId?: string;
  reason: string;
  returnCode: string;
  status:
    | "Requested"
    | "InTransit"
    | "Received"
    | "Inspected"
    | "Rejected"
    | "Restocked"
    | string;
  trackingNumber?: string;
  updatedAt: string;
}

export interface CreateShipmentPayload {
  carrierId?: string;
  customerId?: string;
  customerName: string;
  items?: {
    productId?: string;
    productName: string;
    quantity: number;
    sku?: string;
    unit?: string;
  }[];
  notes?: string;
  orderId?: string;
  orderNumber?: string;
  packageCount?: number;
  preparedByName?: string;
  preparedByUserId?: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientDistrict?: string;
  recipientName: string;
  recipientPhone?: string;
  shippingCost?: number;
  totalDesi?: number;
  totalWeightKg?: number;
  trackingNumber?: string;
}

export interface UpdateShipmentStatusPayload {
  changedByName?: string;
  changedByUserId?: string;
  description?: string;
  location?: string;
  status:
    | "Preparing"
    | "Dispatched"
    | "InTransit"
    | "Delivered"
    | "FailedDelivery"
    | "Cancelled"
    | string;
}

export interface CreateCarrierPayload {
  branchCode?: string;
  code: string;
  customerAccountNumber?: string;
  isDefault?: boolean;
  name: string;
  trackingUrlTemplate?: string;
}

export interface CreateReturnShipmentPayload {
  carrierId?: string;
  customerId?: string;
  customerName: string;
  orderId?: string;
  originalShipmentId?: string;
  reason: string;
  trackingNumber?: string;
}

export interface UpdateReturnStatusPayload {
  inspectedByName?: string;
  inspectedByUserId?: string;
  inspectionNotes?: string;
  status:
    | "Requested"
    | "InTransit"
    | "Received"
    | "Inspected"
    | "Rejected"
    | "Restocked"
    | string;
}

// ==========================================
// Pipeline & Deal Interfaces
// ==========================================
export interface PipelineStageDto {
  color?: string;
  createdAt: string;
  dealsCount: number;
  dealsTotalValue: number;
  id: string;
  isLostStage: boolean;
  isWonStage: boolean;
  name: string;
  orderIndex: number;
  pipelineId: string;
  probability: number;
  routingRuleOverride?: string;
  slaHours?: number;
  updatedAt: string;
}

export interface PipelineDto {
  code: string;
  color?: string;
  createdAt: string;
  description?: string;
  icon?: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  routingStrategy:
    | "RoundRobin"
    | "LeastLoaded"
    | "OnlineOnly"
    | "Manual"
    | string;
  stages: PipelineStageDto[];
  targetDepartmentId?: string;
  tenantId: string;
  totalDealsCount: number;
  totalDealsValue: number;
  updatedAt: string;
}

export interface CreatePipelineStagePayload {
  color?: string;
  isLostStage: boolean;
  isWonStage: boolean;
  name: string;
  orderIndex: number;
  probability: number;
  routingRuleOverride?: string;
  slaHours?: number;
}

export interface CreatePipelinePayload {
  code: string;
  color?: string;
  description?: string;
  icon?: string;
  isDefault: boolean;
  name: string;
  routingStrategy: string;
  stages?: CreatePipelineStagePayload[];
  targetDepartmentId?: string;
}

export interface UpdatePipelineStagePayload {
  color?: string;
  id?: string;
  isLostStage: boolean;
  isWonStage: boolean;
  name: string;
  orderIndex: number;
  probability: number;
  routingRuleOverride?: string;
  slaHours?: number;
}

export interface UpdatePipelinePayload {
  color?: string;
  description?: string;
  icon?: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  routingStrategy: string;
  stages?: UpdatePipelineStagePayload[];
  targetDepartmentId?: string;
}

export interface DealSummaryDto {
  activitiesCount: number;
  assignedUserId?: string;
  assignedUserName?: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
  currency: string;
  customerId?: string;
  customerName?: string;
  customerType?: string;
  id: string;
  isSlaBreached: boolean;
  lastActivityAt: string;
  lostReason?: string;
  notesCount: number;
  pipelineId: string;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
  slaDueDate?: string;
  slaHours?: number;
  source:
    | "LiveChat"
    | "WebForm"
    | "Campaign"
    | "InboundEmail"
    | "Manual"
    | "Api"
    | string;
  sourceReferenceId?: string;
  stageColor?: string;
  stageId: string;
  stageName: string;
  stageOrderIndex: number;
  status: "Open" | "Won" | "Lost" | "Abandoned" | string;
  tags?: string[];
  tenantId: string;
  title: string;
  updatedAt: string;
  value: number;
  wonReason?: string;
}

export interface PagedDealsResponse {
  items: DealSummaryDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalValue: number;
}

export interface GetDealsParams {
  assignedUserId?: string;
  customerId?: string;
  onlyMyDeals?: boolean;
  onlySlaBreached?: boolean;
  onlyUnassigned?: boolean;
  page?: number;
  pageSize?: number;
  pipelineId?: string;
  priority?: string;
  search?: string;
  source?: string;
  stageId?: string;
  status?: string;
}

export interface DealActivityDto {
  activityType: string;
  createdAt: string;
  description?: string;
  id: string;
  newValue?: string;
  oldValue?: string;
  title: string;
  userId?: string;
  userName?: string;
}

export interface DealNoteDto {
  content: string;
  createdAt: string;
  id: string;
  isPinned: boolean;
  updatedAt: string;
  userId?: string;
  userName?: string;
}

export interface DealDetailDto {
  activities: DealActivityDto[];
  assignedUserId?: string;
  assignedUserName?: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
  currency: string;
  customerEmail?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerType?: string;
  id: string;
  isSlaBreached: boolean;
  lastActivityAt: string;
  lostReason?: string;
  metadataJson?: string;
  notes: DealNoteDto[];
  pipelineId: string;
  pipelineName: string;
  priority: string;
  slaDueDate?: string;
  slaHours?: number;
  source: string;
  sourceReferenceId?: string;
  stageColor?: string;
  stageId: string;
  stageName: string;
  stageOrderIndex: number;
  status: string;
  tags?: string[];
  tenantId: string;
  title: string;
  updatedAt: string;
  value: number;
  wonReason?: string;
}

export interface CreateDealPayload {
  assignedUserId?: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  currency?: string;
  customerId?: string;
  initialNote?: string;
  pipelineId: string;
  priority?: string;
  source?: string;
  sourceReferenceId?: string;
  stageId?: string;
  tags?: string[];
  title: string;
  value?: number;
}

export interface UpdateDealPayload {
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  currency: string;
  id: string;
  priority: string;
  tags?: string[];
  title: string;
  value: number;
}

export interface MoveDealStagePayload {
  dealId: string;
  lostReason?: string;
  targetStageId: string;
  wonReason?: string;
}

export interface AssignDealPayload {
  assignedUserId?: string;
  dealId: string;
}

export interface AddDealNotePayload {
  content: string;
  dealId: string;
  isPinned?: boolean;
}

export interface SourceStatDto {
  count: number;
  source: string;
  totalValue: number;
}

export interface PriorityStatDto {
  count: number;
  priority: string;
}

export interface DealStatsResponse {
  byPriority: PriorityStatDto[];
  bySource: SourceStatDto[];
  currency: string;
  lostDealsCount: number;
  openDealsCount: number;
  slaBreachedCount: number;
  totalDealsCount: number;
  totalLostValue: number;
  totalOpenValue: number;
  totalWonValue: number;
  unassignedCount: number;
  winRatePercentage: number;
  wonDealsCount: number;
}

// ==========================================
// Quote Interfaces
// ==========================================
export interface QuoteSummaryDto {
  acceptedAt?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  convertedOrderId?: string;
  createdAt: string;
  currency: string;
  customerId?: string;
  customerName: string;
  dealId?: string;
  discountAmount: number;
  discountRate: number;
  discountType: string;
  exchangeRate: number;
  id: string;
  itemCount: number;
  parentQuoteId?: string;
  paymentDueDate?: string;
  paymentDueDays?: number;
  paymentMethod?: string;
  publicViewToken: string;
  quoteNumber: string;
  rejectedAt?: string;
  revisionNumber: number;
  sentAt?: string;
  status:
    | "Draft"
    | "PendingApproval"
    | "Approved"
    | "Sent"
    | "Viewed"
    | "Accepted"
    | "Rejected"
    | "Expired"
    | "Revised"
    | string;
  subtotal: number;
  taxAmount: number;
  tenantId: string;
  title: string;
  totalAmount: number;
  updatedAt: string;
  validUntil?: string;
}

export interface QuoteItemDto {
  description?: string;
  discountAmount: number;
  discountRate: number;
  id: string;
  isOptional: boolean;
  isSelected: boolean;
  orderIndex: number;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  taxAmount: number;
  taxRate: number;
  totalPrice: number;
  unit: string;
  unitCost: number;
  unitPrice: number;
  variantId?: string;
}

export interface QuoteActivityDto {
  activityType: string;
  createdAt: string;
  description?: string;
  id: string;
  newValue?: string;
  oldValue?: string;
  title: string;
  userId?: string;
  userName?: string;
}

export interface QuoteRevisionSummaryDto {
  createdAt: string;
  currency: string;
  id: string;
  quoteNumber: string;
  revisionNumber: number;
  status: string;
  totalAmount: number;
}

export interface QuoteDetailDto {
  acceptedAt?: string;
  activities: QuoteActivityDto[];
  approvalNotes?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  bankDetails?: string;
  convertedOrderId?: string;
  convertedOrderNumber?: string;
  createdAt: string;
  currency: string;
  customerId?: string;
  customerName: string;
  dealId?: string;
  dealTitle?: string;
  deliveryTerms?: string;
  discountAmount: number;
  discountRate: number;
  discountType: string;
  exchangeRate: number;
  id: string;
  items: QuoteItemDto[];
  notes?: string;
  parentQuoteId?: string;
  parentQuoteNumber?: string;
  paymentDueDate?: string;
  paymentDueDays?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  publicViewToken: string;
  quoteNumber: string;
  rejectedAt?: string;
  rejectionReason?: string;
  revisionNumber: number;
  revisions: QuoteRevisionSummaryDto[];
  sentAt?: string;
  status:
    | "Draft"
    | "PendingApproval"
    | "Approved"
    | "Sent"
    | "Viewed"
    | "Accepted"
    | "Rejected"
    | "Expired"
    | "Revised"
    | string;
  subtotal: number;
  taxAmount: number;
  tenantId: string;
  termsAndConditions?: string;
  title: string;
  totalAmount: number;
  updatedAt: string;
  validUntil?: string;
}

export interface PagedQuotesResponse {
  items: QuoteSummaryDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface GetQuotesParams {
  assignedUserId?: string;
  customerId?: string;
  dealId?: string;
  fromDate?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  toDate?: string;
}

export interface CreateQuoteItemPayload {
  description?: string;
  discountAmount?: number;
  discountRate?: number;
  isOptional?: boolean;
  isSelected?: boolean;
  orderIndex?: number;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  taxRate?: number;
  unit?: string;
  unitCost?: number;
  unitPrice: number;
  variantId?: string;
}

export interface CreateQuotePayload {
  assignedUserId?: string;
  assignedUserName?: string;
  bankDetails?: string;
  currency?: string;
  customerId?: string;
  customerName: string;
  dealId?: string;
  deliveryTerms?: string;
  discountAmount?: number;
  discountRate?: number;
  discountType?: string;
  exchangeRate?: number;
  items: CreateQuoteItemPayload[];
  notes?: string;
  paymentDueDate?: string;
  paymentDueDays?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  termsAndConditions?: string;
  title: string;
  validUntil?: string;
}

export interface UpdateQuotePayload extends CreateQuotePayload {
  id?: string;
}

export interface RevisionItemOverridePayload {
  description?: string;
  discountRate?: number;
  id?: string;
  isOptional?: boolean;
  isSelected?: boolean;
  orderIndex?: number;
  productId?: string;
  productName?: string;
  quantity?: number;
  sku?: string;
  taxRate?: number;
  unit?: string;
  unitCost?: number;
  unitPrice?: number;
  variantId?: string;
}

export interface CreateQuoteRevisionPayload {
  bankDetails?: string;
  currency?: string;
  deliveryTerms?: string;
  discountAmount?: number;
  discountRate?: number;
  discountType?: string;
  exchangeRate?: number;
  items?: RevisionItemOverridePayload[];
  notes?: string;
  paymentDueDate?: string;
  paymentDueDays?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  revisionNotes?: string;
  termsAndConditions?: string;
  title?: string;
  validUntil?: string;
}

export interface ConvertOrderItemOverridePayload {
  description?: string;
  isSelected?: boolean;
  productId?: string;
  productName?: string;
  quantity?: number;
  quoteItemId?: string;
  unitPrice?: number;
}

export interface ConvertToOrderPayload {
  dueDate?: string;
  items?: ConvertOrderItemOverridePayload[];
  notes?: string;
  paymentMethod?: string;
  shippingFee?: number;
}

export interface QuoteStatsResponse {
  acceptedCount: number;
  activeProposalsVolume: number;
  conversionRate: number;
  expiredCount: number;
  pendingApprovalCount: number;
  rejectedCount: number;
  sentCount: number;
  totalQuotes: number;
}

export interface QuoteTemplateDto {
  bankDetails?: string;
  createdAt: string;
  deliveryTerms?: string;
  /** Handlebars HTML gövdesi — {{variables}} içerebilir, itemsTable raw HTML içerir. */
  htmlBody?: string;
  id: string;
  isDefault: boolean;
  name: string;
  paymentTerms?: string;
  /** Önizleme sırasında döndürülen işlenmiş HTML — sadece preview/test-send yanıtlarında dolu. */
  previewHtml?: string;
  /** E-posta konu şablonu — örn. "Teklif {{quoteNumber}} - {{customerName}}", max 200 karakter. */
  subject?: string;
  termsAndConditions?: string;
  updatedAt: string;
  /** Şablonun kullandığı Handlebars değişken anahtarları — örn. ["customerName","quoteNumber"] */
  variables?: string[];
}

/**
 * Preview response from POST /api/quotes/templates/{id}/preview
 * Backend returns { html, subject } (camelCase via JSON naming policy).
 */
export interface PreviewQuoteTemplateResponse {
  html: string;
  subject: string;
}

/**
 * Test-send response from POST /api/quotes/templates/{id}/test-send
 * Backend returns { previewHtml, subject, sent, message, toEmail } (camelCase).
 * message/subject/toEmail optional for backward compat; previewHtml + sent are required.
 */
export interface TestSendQuoteTemplateResponse {
  message?: string;
  previewHtml: string;
  sent: boolean;
  subject?: string;
  toEmail?: string;
}

export interface PublicQuoteViewDto {
  acceptedAt?: string;
  bankDetails?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyLogoUrl?: string;
  companyName: string;
  companyPhone?: string;
  currency: string;
  customerName: string;
  deliveryTerms?: string;
  discountAmount: number;
  discountRate: number;
  discountType: string;
  id: string;
  items: QuoteItemDto[];
  notes?: string;
  paymentTerms?: string;
  quoteNumber: string;
  revisionNumber: number;
  sentAt?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  termsAndConditions?: string;
  title: string;
  totalAmount: number;
  validUntil?: string;
}

export type PortalViewDto = PublicQuoteViewDto;

// --- HelpDesk & Ticket DTOs ---
export interface TicketListDto {
  assignedUserId?: string;
  assignedUserName?: string;
  category: string;
  channelId?: string;
  closedAt?: string;
  createdAt: string;
  customerEmail?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  firstResponseAt?: string;
  id: string;
  isSlaBreached: boolean;
  lastMessageAt?: string;
  linkedEntityId?: string;
  linkedEntityTitle?: string;
  linkedEntityType?: string;
  messageCount: number;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
  resolutionNotes?: string;
  resolvedAt?: string;
  satisfactionRating?: number;
  slaFirstResponseDueAt?: string;
  slaResolutionDueAt?: string;
  source: string;
  status:
    | "New"
    | "InProgress"
    | "PendingCustomer"
    | "OnHold"
    | "Resolved"
    | "Closed"
    | string;
  subject: string;
  tags: string[];
  ticketNumber: string;
  updatedAt: string;
}

export interface TicketStatsDto {
  inProgressTickets: number;
  newTickets: number;
  pendingCustomerTickets: number;
  resolvedTodayCount: number;
  slaBreachedTickets: number;
  slaComplianceRate: number;
  totalOpenTickets: number;
  totalTickets: number;
  urgentTickets: number;
}

export interface TicketActivityDto {
  actionType: string;
  createdAt: string;
  description: string;
  id: string;
  newValue?: string;
  oldValue?: string;
  userId?: string;
  userName: string;
}

export interface PreviousTicketBriefDto {
  createdAt: string;
  id: string;
  priority: string;
  status: string;
  subject: string;
  ticketNumber: string;
}

export interface Customer360OrderItemDto {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  sku?: string;
  totalPrice: number;
  unitPrice: number;
}

export interface Customer360OrderBriefDto {
  currency: string;
  id: string;
  items: Customer360OrderItemDto[];
  orderDate: string;
  orderNumber: string;
  paymentStatus: string;
  status: string;
  totalAmount: number;
}

export interface Customer360ShipmentBriefDto {
  carrierName?: string;
  createdAt: string;
  id: string;
  shipmentNumber: string;
  status: string;
  trackingNumber?: string;
}

export interface Customer360BriefDto {
  customerId: string;
  customerName: string;
  email?: string;
  openTicketsCount: number;
  phone?: string;
  recentOrders: Customer360OrderBriefDto[];
  recentShipments: Customer360ShipmentBriefDto[];
  recentTickets: PreviousTicketBriefDto[];
  totalTicketsCount: number;
}

export interface TicketDetailDto extends TicketListDto {
  activities: TicketActivityDto[];
  customer360: Customer360BriefDto;
  messages: ChatMessageDto[];
  satisfactionFeedback?: string;
}

export interface CreateTicketPayload {
  assignedUserId?: string;
  assignedUserName?: string;
  category: string;
  customerEmail?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  linkedEntityId?: string;
  linkedEntityTitle?: string;
  linkedEntityType?: string;
  priority: string;
  source?: string;
  subject: string;
  tags?: string[];
}

export interface CreateTicketResultDto {
  channelId?: string;
  id: string;
  ticketNumber: string;
}

export interface UpdateTicketPayload {
  assignedUserId?: string;
  assignedUserName?: string;
  departmentId?: string;
  departmentName?: string;
  priority?: string;
  resolutionNotes?: string;
  satisfactionFeedback?: string;
  satisfactionRating?: number;
  status?: string;
  tags?: string[];
}

export interface AddTicketMessagePayload {
  attachments?: {
    fileName: string;
    fileSizeBytes: number;
    fileType: string;
    fileUrl: string;
  }[];
  content: string;
  entityEmbeds?: {
    entityId: string;
    entityStatus?: string;
    entitySubtitle?: string;
    entityTitle: string;
    entityType: string;
    metadataJson?: string;
  }[];
  isInternalNote?: boolean;
  replyToMessageId?: string;
}

export interface ConvertChatToTicketPayload {
  assignedUserId?: string;
  assignedUserName?: string;
  category: string;
  departmentId?: string;
  departmentName?: string;
  linkedEntityId?: string;
  linkedEntityTitle?: string;
  linkedEntityType?: string;
  priority: string;
  subject: string;
}

export const apiClient = {
  delete: <T>(endpoint: string, tenantId?: string) =>
    ApiClient.request<T>(endpoint, { method: "DELETE" }, tenantId),
  get: <T>(endpoint: string, tenantId?: string) =>
    ApiClient.request<T>(endpoint, { method: "GET" }, tenantId),
  post: <T>(endpoint: string, body?: unknown, tenantId?: string) =>
    ApiClient.request<T>(
      endpoint,
      {
        body: body === undefined ? undefined : JSON.stringify(body),
        method: "POST",
      },
      tenantId
    ),
  put: <T>(endpoint: string, body?: unknown, tenantId?: string) =>
    ApiClient.request<T>(
      endpoint,
      {
        body: body === undefined ? undefined : JSON.stringify(body),
        method: "PUT",
      },
      tenantId
    ),
};

// ==========================================
// Automations Module DTOs
// ==========================================
export interface WorkflowSummaryDto {
  actionsCount: number;
  category: string;
  color: string;
  conditionsCount: number;
  createdAt: string;
  description?: string;
  executionCount: number;
  icon: string;
  id: string;
  isActive: boolean;
  lastExecutedAt?: string;
  name: string;
  triggerType: string;
  updatedAt: string;
}

export interface WorkflowStatsDto {
  activeWorkflows: number;
  estimatedHoursSaved: number;
  executionsToday: number;
  inactiveWorkflows: number;
  successRate: number;
  totalExecutionsAllTime: number;
  totalWorkflows: number;
}

export interface WorkflowTriggerConfigDto {
  additionalSettings?: Record<string, string>;
  entityFilter?: string;
  targetCategory?: string;
  targetPriority?: string;
  targetStatus?: string;
}

export interface WorkflowConditionRuleDto {
  field: string;
  fieldType?: string;
  operator: string;
  value: string;
}

export interface WorkflowConditionGroupDto {
  logicalOperator: "AND" | "OR" | string;
  rules: WorkflowConditionRuleDto[];
}

export interface WorkflowActionStepDto {
  config: Record<string, unknown>;
  delayMinutes?: number;
  id: string;
  order: number;
  title: string;
  type:
    | "notification"
    | "updateRecord"
    | "createRecord"
    | "webhook"
    | "delay"
    | string;
}

export interface ExecutionStepLogDto {
  executionDurationMs: number;
  message: string;
  outputData?: Record<string, unknown>;
  status: "Success" | "Failed" | "Skipped" | string;
  stepId: string;
  stepTitle: string;
  stepType: string;
  timestamp: string;
}

export interface ExecutionSummaryDto {
  actionsExecutedCount: number;
  createdAt: string;
  entityId?: string;
  entityType?: string;
  errorMessage?: string;
  evaluatedConditionsSummary?: string;
  executionDurationMs: number;
  id: string;
  status: "Success" | "Failed" | "Skipped" | string;
  stepLogs: ExecutionStepLogDto[];
  triggerSource: string;
}

export interface WorkflowDetailDto {
  actions: WorkflowActionStepDto[];
  category: string;
  color: string;
  conditions: WorkflowConditionGroupDto[];
  createdAt: string;
  description?: string;
  executionCount: number;
  icon: string;
  id: string;
  isActive: boolean;
  lastExecutedAt?: string;
  name: string;
  recentExecutions: ExecutionSummaryDto[];
  triggerConfig: WorkflowTriggerConfigDto;
  triggerType: string;
  updatedAt: string;
}

export interface WorkflowTemplateDto {
  actions: WorkflowActionStepDto[];
  category: string;
  color: string;
  conditions: WorkflowConditionGroupDto[];
  description: string;
  icon: string;
  id: string;
  name: string;
  triggerConfig: WorkflowTriggerConfigDto;
  triggerType: string;
}

export interface CreateWorkflowPayload {
  actions?: WorkflowActionStepDto[];
  category: string;
  color?: string;
  conditions?: WorkflowConditionGroupDto[];
  description?: string;
  icon?: string;
  isActive: boolean;
  name: string;
  triggerConfig?: WorkflowTriggerConfigDto;
  triggerType: string;
}

export interface UpdateWorkflowPayload {
  actions?: WorkflowActionStepDto[];
  category: string;
  color?: string;
  conditions?: WorkflowConditionGroupDto[];
  description?: string;
  icon?: string;
  id: string;
  isActive: boolean;
  name: string;
  triggerConfig?: WorkflowTriggerConfigDto;
  triggerType: string;
}

export interface TestWorkflowPayload {
  entityId?: string;
  entityType?: string;
  id: string;
  mockContext?: Record<string, unknown>;
}

export interface AutomationExecutionResultDto {
  actionsExecutedCount: number;
  conditionsSummary: string;
  errorMessage?: string;
  executionDurationMs: number;
  status: "Success" | "Failed" | "Skipped" | string;
  stepLogs: ExecutionStepLogDto[];
  workflowId: string;
  workflowName: string;
}

export interface ExecutionItemDto {
  actionsExecutedCount: number;
  createdAt: string;
  entityId?: string;
  entityType?: string;
  errorMessage?: string;
  evaluatedConditionsSummary?: string;
  executionDurationMs: number;
  id: string;
  status: "Success" | "Failed" | "Skipped" | string;
  triggerSource: string;
  workflowId: string;
  workflowName: string;
}

// ==========================================
// Webhooks Module DTOs
// ==========================================
export interface WebhookEndpointDto {
  createdAt: string;
  deliveriesCount?: number;
  description: string | null;
  events: string[];
  id: string;
  isActive: boolean;
  name: string;
  secret?: string;
  secretMasked?: string;
  tenantId: string;
  updatedAt: string;
  url: string;
}

export interface WebhookEndpointDetailDto extends WebhookEndpointDto {
  deliveriesCount: number;
}

export interface WebhookDeliveryDto {
  attemptCount: number;
  createdAt: string;
  durationMs: number | null;
  endpointId: string;
  endpointName?: string;
  eventType: string;
  headers: Record<string, string> | null;
  hmacSignature: string | null;
  id: string;
  nextRetryAt: string | null;
  payload: unknown;
  payloadJson?: string;
  responseBody: string | null;
  responseCode: number | null;
  status: "Success" | "Failed" | "Retrying" | string;
  tenantId: string;
}

export interface CreateWebhookPayload {
  description?: string;
  events: string[];
  isActive?: boolean;
  name: string;
  secret?: string;
  url: string;
}

export interface UpdateWebhookPayload {
  description?: string;
  events?: string[];
  isActive?: boolean;
  name?: string;
  url?: string;
}

export type PagedWebhooksResponse = PagedResult<WebhookEndpointDto>;

export type PagedDeliveriesResponse = PagedResult<WebhookDeliveryDto>;

// ==========================================
// Compliance & Labor Law DTOs
// ==========================================
export interface ComplianceCategorySummaryDto {
  activeViolations: number;
  category: string;
  categoryTitle: string;
  rulesCount: number;
  score: number;
  status: "Excellent" | "Good" | "Risk" | string;
}

export interface ComplianceScoreResultDto {
  activeViolationsCount: number;
  categorySummaries: ComplianceCategorySummaryDto[];
  estimatedPenaltyExposureTl: number;
  hardBlockedAttemptsCount: number;
  healthScore: number;
  overriddenViolationsCount: number;
  totalRulesCount: number;
}

export interface ComplianceRuleDto {
  category: string;
  code: string;
  description?: string;
  enforcementLevel: "HardBlock" | "SoftWarning" | "Disabled" | string;
  id: string;
  isActive: boolean;
  isSystemRule: boolean;
  lawReference: string;
  name: string;
  penaltyDescription?: string;
  penaltyRiskLevel: "Low" | "Medium" | "High" | "Critical" | string;
  thresholdConfigJson: string;
  updatedAt: string;
  violationCount: number;
}

export interface ComplianceViolationDto {
  createdAt: string;
  details: string;
  employeeId?: string;
  employeeName: string;
  entityId?: string;
  id: string;
  isOverridden: boolean;
  lawReference: string;
  moduleSource: string;
  overriddenAt?: string;
  overriddenByUserId?: string;
  overrideReason?: string;
  ruleCode: string;
  ruleId?: string;
  severity: "Warning" | "Violation" | "CriticalRisk" | string;
  status: "Active" | "Resolved" | "Overridden" | string;
  violationDataJson: string;
}

export interface ComplianceViolationDetailDto {
  category: string;
  contextData: Record<string, unknown>;
  details: string;
  enforcementLevel: string;
  lawReference: string;
  penaltyRisk?: string;
  ruleCode: string;
  ruleName: string;
  severity: string;
}

export interface ComplianceValidationResultDto {
  hasHardBlock: boolean;
  isCompliant: boolean;
  violations: ComplianceViolationDetailDto[];
}

export interface UpdateComplianceRulePayload {
  enforcementLevel: "HardBlock" | "SoftWarning" | "Disabled" | string;
  id: string;
  isActive: boolean;
  thresholdConfigJson?: string;
}

export interface ValidateShiftPayload {
  breakMinutes: number;
  currentWeekTotalHours?: number;
  employeeId: string;
  employeeName: string;
  isPregnant?: boolean;
  previousShiftEnd?: string;
  shiftEnd: string;
  shiftStart: string;
}

export interface ValidateShiftTemplatePayload {
  breakMinutes: number;
  endTime: string;
  isNightShift?: boolean;
  startTime: string;
}

export interface ValidateLeavePayload {
  age: number;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  requestedDays: number;
  seniorityYears: number;
}

// ==========================================
// Recruitment Module DTOs
// ==========================================
export interface RequisitionDto {
  applicationCount: number;
  closingDate?: string;
  createdAt: string;
  currency: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  employmentType?: string;
  headcount: number;
  headcountWarning?: string;
  hiredCount: number;
  hiringManagerId?: string;
  hiringManagerName?: string;
  id: string;
  isPublished: boolean;
  jobPositionId?: string;
  jobPositionTitle?: string;
  location?: string;
  maxSalary?: number;
  minSalary?: number;
  priority: string;
  publishedAt?: string;
  requirements?: string;
  status: string;
  tenantId: string;
  title: string;
  updatedAt: string;
  workModel?: string;
}

export interface PagedRequisitionsResponse {
  items: RequisitionDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateRequisitionPayload {
  closingDate?: string;
  currency: string;
  departmentId?: string;
  description?: string;
  employmentType?: string;
  headcount: number;
  hiringManagerId?: string;
  jobPositionId?: string;
  location?: string;
  maxSalary?: number;
  minSalary?: number;
  priority: string;
  requirements?: string;
  title: string;
  workModel?: string;
}

export interface UpdateRequisitionPayload extends CreateRequisitionPayload {
  id?: string;
}

export interface CandidateDto {
  address?: string;
  applicationCount: number;
  birthDate?: string;
  consentGiven: boolean;
  consentGivenAt?: string;
  createdAt: string;
  createdBy?: string;
  cvFileName?: string;
  cvFileUrl?: string;
  deletedAt?: string;
  email: string;
  firstName: string;
  fullName: string;
  id: string;
  lastName: string;
  notes?: string;
  phone?: string;
  source: string;
  tags?: string[];
  tenantId: string;
  updatedAt: string;
}

export interface PagedCandidatesResponse {
  items: CandidateDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateCandidatePayload {
  address?: string;
  birthDate?: string;
  consentGiven: boolean;
  cvFileName?: string;
  cvFileUrl?: string;
  email: string;
  firstName: string;
  lastName: string;
  notes?: string;
  phone?: string;
  source: string;
  tags?: string[];
}

export interface UpdateCandidatePayload extends CreateCandidatePayload {
  id?: string;
}

export interface CvUploadResponse {
  candidateId: string;
  cvFileName: string;
  cvFileUrl: string;
  message: string;
  sizeBytes: number;
}

export interface CsvImportRowPayload {
  consentGiven?: boolean;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  source?: string;
  tagsRaw?: string;
}

export interface CsvImportResponse {
  errors: { row: number; email: string; error: string }[];
  imported: number;
  skippedDuplicates: number;
  skippedEmails: string[];
}

export interface ApplicationDto {
  candidateEmail: string;
  candidateId: string;
  candidateName: string;
  createdAt: string;
  headcountWarning?: string;
  id: string;
  notes?: string;
  requisitionId: string;
  requisitionTitle: string;
  score?: number;
  stageColorHex?: string;
  stageId?: string;
  stageName?: string;
  status: string;
  tenantId: string;
  updatedAt: string;
}

export interface PagedApplicationsResponse {
  items: ApplicationDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateApplicationPayload {
  candidateId: string;
  notes?: string;
  requisitionId: string;
  score?: number;
  stageId?: string;
}

export interface UpdateApplicationPayload {
  notes?: string;
  score?: number;
}

export interface StageDto {
  applicationCount: number;
  colorHex: string;
  createdAt: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  slug: string;
  sortOrder: number;
  stageType: string;
  tenantId: string;
  updatedAt: string;
}

export interface CreateStagePayload {
  colorHex: string;
  isActive: boolean;
  name: string;
  slug?: string;
  stageType: string;
}

export interface UpdateStagePayload extends CreateStagePayload {
  id?: string;
}

export interface PublicApplyPayload {
  consentGiven: boolean;
  cvBase64?: string;
  cvFileName?: string;
  email: string;
  firstName: string;
  honeypot?: string;
  lastName: string;
  phone?: string;
  requisitionId?: string;
  requisitionSlug?: string;
  tenantSlug?: string;
  website?: string;
}

export interface PublicApplyResponse {
  applicationId: string;
  candidateEmail: string;
  candidateId: string;
  cvFileUrl?: string;
  message: string;
  requisitionId: string;
  requisitionTitle: string;
  stageId?: string;
  status: string;
}

// ==========================================
// Promotions & Campaigns DTOs
// ==========================================
export interface CampaignListItemDto {
  code?: string;
  couponsCount: number;
  createdAt: string;
  currentUsageCount: number;
  description?: string;
  discountValue: number;
  endDate?: string;
  id: string;
  isActive: boolean;
  isStackable: boolean;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  name: string;
  perCustomerUsageLimit?: number;
  priority: number;
  startDate: string;
  targetsCount: number;
  totalUsageLimit?: number;
  triggerType: "Automatic" | "CouponCode" | string;
  type:
    | "Percentage"
    | "FixedAmount"
    | "CartThreshold"
    | "BuyXGetY"
    | "FreeShipping"
    | string;
}

export interface CampaignTargetDto {
  id: string;
  ruleCondition: "Include" | "Exclude" | string;
  targetId: string;
  targetName?: string;
  targetType:
    | "Product"
    | "Category"
    | "Brand"
    | "Customer"
    | "CustomerGroup"
    | string;
}

export interface CampaignDetailDto {
  buyQuantity: number;
  code?: string;
  couponsCount: number;
  createdAt: string;
  currentUsageCount: number;
  description?: string;
  discountValue: number;
  endDate?: string;
  getDiscountRate: number;
  getQuantity: number;
  id: string;
  isActive: boolean;
  isStackable: boolean;
  maxDiscountAmount?: number;
  metadata: string;
  minOrderAmount: number;
  minQuantity: number;
  name: string;
  perCustomerUsageLimit?: number;
  priority: number;
  startDate: string;
  targets: CampaignTargetDto[];
  totalUsageLimit?: number;
  triggerType: string;
  type: string;
  updatedAt: string;
}

export interface CreateCampaignTargetPayload {
  ruleCondition: string;
  targetId: string;
  targetName?: string;
  targetType: string;
}

export interface CreateCampaignPayload {
  buyQuantity?: number;
  code?: string;
  description?: string;
  discountValue: number;
  endDate?: string;
  getDiscountRate?: number;
  getQuantity?: number;
  initialCouponCode?: string;
  isActive: boolean;
  isStackable: boolean;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  minQuantity: number;
  name: string;
  perCustomerUsageLimit?: number;
  priority: number;
  startDate: string;
  targets?: CreateCampaignTargetPayload[];
  totalUsageLimit?: number;
  triggerType: string;
  type: string;
}

export interface UpdateCampaignPayload
  extends Omit<CreateCampaignPayload, "initialCouponCode"> {}

export interface CouponListItemDto {
  assignedCustomerId?: string;
  assignedCustomerName?: string;
  batchId?: string;
  campaignId: string;
  campaignName: string;
  code: string;
  createdAt: string;
  expiresAt?: string;
  id: string;
  isActive: boolean;
  maxUses: number;
  type: "Standard" | "SingleUse" | "Dynamic" | string;
  usedCount: number;
}

export interface GenerateCouponsPayload {
  campaignId: string;
  codeLength?: number;
  customCode?: string;
  expiresAt?: string;
  maxUses?: number;
  prefix?: string;
  quantity: number;
}

export interface PromotionsStatsDto {
  activeCampaigns: number;
  totalCampaigns: number;
  totalCoupons: number;
  totalDiscountDistributed: number;
  totalRevenueInfluenced: number;
  totalUsages: number;
}

export interface CartItemPayload {
  brand?: string;
  categoryId?: string;
  discountAmount?: number;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  variantId?: string;
}

export interface CartPromotionEvaluationPayload {
  couponCode?: string;
  customerGroup?: string;
  customerId?: string;
  items: CartItemPayload[];
  shippingFee?: number;
}

export interface AppliedPromotionDto {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  couponCode?: string;
  description: string;
  discountAmount: number;
}

export interface CartPromotionEvaluationResultDto {
  appliedPromotions: AppliedPromotionDto[];
  couponValidationMessage?: string;
  isCouponValid: boolean;
  isFreeShipping: boolean;
  items: CartItemPayload[];
  netTotal: number;
  shippingFee: number;
  subtotal: number;
  totalDiscountAmount: number;
}

// ==========================================
// Tasks & To-Do DTOs
// ==========================================
export interface CrmTaskDto {
  assignedUserId?: string;
  assignedUserName?: string;
  category: string;
  completedAt?: string;
  createdAt: string;
  customerId?: string;
  customerName?: string;
  dealId?: string;
  description?: string;
  dueDate?: string;
  id: string;
  isCompleted: boolean;
  priority: "low" | "medium" | "high" | "urgent" | string;
  status: "Pending" | "InProgress" | "Completed" | "Cancelled" | string;
  tenantId: string;
  title: string;
  updatedAt: string;
}

export interface PagedTasksResponse {
  completedCount: number;
  items: CrmTaskDto[];
  page: number;
  pageSize: number;
  pendingCount: number;
  totalCount: number;
}

export interface GetTasksParams {
  assignedUserId?: string;
  category?: string;
  customerId?: string;
  dealId?: string;
  isCompleted?: boolean;
  page?: number;
  pageSize?: number;
  priority?: string;
  search?: string;
  status?: string;
}

export interface CreateTaskPayload {
  assignedUserId?: string;
  assignedUserName?: string;
  category?: string;
  customerId?: string;
  customerName?: string;
  dealId?: string;
  description?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high" | "urgent" | string;
  title: string;
}

export interface UpdateTaskPayload {
  assignedUserId?: string;
  assignedUserName?: string;
  category?: string;
  customerId?: string;
  customerName?: string;
  dealId?: string;
  description?: string;
  dueDate?: string;
  isCompleted?: boolean;
  priority?: "low" | "medium" | "high" | "urgent" | string;
  status?: "Pending" | "InProgress" | "Completed" | "Cancelled" | string;
  title: string;
}

// ==========================================
// Projects & Agile Backlog DTOs
// ==========================================
export interface ProjectSummaryDto {
  activeItemsCount: number;
  budget: number;
  completedItemsCount: number;
  createdAt: string;
  currency: string;
  customerId?: string;
  customerName?: string;
  description?: string;
  id: string;
  key: string;
  leadUserId?: string;
  leadUserName?: string;
  name: string;
  sprintsCount: number;
  startDate?: string;
  status: "Active" | "Planning" | "OnHold" | "Completed" | "Archived" | string;
  targetEndDate?: string;
  tenantId: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  budget?: number;
  currency?: string;
  customerId?: string;
  customerName?: string;
  description?: string;
  key: string;
  leadUserId?: string;
  leadUserName?: string;
  name: string;
  startDate?: string;
  status?: string;
  targetEndDate?: string;
}

export interface UpdateProjectPayload {
  budget?: number;
  currency?: string;
  customerId?: string;
  customerName?: string;
  description?: string;
  leadUserId?: string;
  leadUserName?: string;
  name: string;
  startDate?: string;
  status?: string;
  targetEndDate?: string;
}

export interface EpicDto {
  color: string;
  completedItemsCount: number;
  createdAt: string;
  description?: string;
  dueDate?: string;
  id: string;
  itemsCount: number;
  name: string;
  projectId: string;
  startDate?: string;
  status: string;
  tenantId: string;
  updatedAt: string;
}

export interface CreateEpicPayload {
  color?: string;
  description?: string;
  dueDate?: string;
  name: string;
  startDate?: string;
  status?: string;
}

export interface UpdateEpicPayload {
  color?: string;
  description?: string;
  dueDate?: string;
  name: string;
  startDate?: string;
  status?: string;
}

export interface SprintDto {
  completedItemsCount: number;
  completedPoints: number;
  createdAt: string;
  endDate?: string;
  goal?: string;
  id: string;
  name: string;
  projectId: string;
  startDate?: string;
  status: "Planning" | "Active" | "Completed" | "Cancelled" | string;
  tenantId: string;
  totalItemsCount: number;
  updatedAt: string;
  velocityPoints: number;
}

export interface CreateSprintPayload {
  endDate?: string;
  goal?: string;
  name: string;
  startDate?: string;
}

export interface BacklogSubtaskDto {
  backlogItemId: string;
  createdAt: string;
  id: string;
  isCompleted: boolean;
  orderIndex: number;
  title: string;
}

export interface BacklogCommentDto {
  backlogItemId: string;
  content: string;
  createdAt: string;
  id: string;
  userAvatar?: string;
  userId?: string;
  userName: string;
}

export interface BacklogItemDto {
  acceptanceCriteria?: string;
  assignedUserAvatar?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  comments: BacklogCommentDto[];
  completedAt?: string;
  createdAt: string;
  customerId?: string;
  customerName?: string;
  dealId?: string;
  description?: string;
  dueDate?: string;
  epicColor?: string;
  epicId?: string;
  epicName?: string;
  estimatedHours: number;
  id: string;
  itemKey: string;
  loggedHours: number;
  orderIndex: number;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
  projectId: string;
  projectKey: string;
  reporterUserId?: string;
  reporterUserName?: string;
  sprintId?: string;
  sprintName?: string;
  status:
    | "Backlog"
    | "Todo"
    | "InProgress"
    | "InReview"
    | "Done"
    | "Cancelled"
    | string;
  storyPoints: number;
  subtasks: BacklogSubtaskDto[];
  tenantId: string;
  ticketId?: string;
  title: string;
  type: "Story" | "Task" | "Bug" | "Feature" | "Improvement" | string;
  updatedAt: string;
}

export interface PagedBacklogResponse {
  items: BacklogItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalStoryPoints: number;
}

export interface GetBacklogItemsParams {
  assignedUserId?: string;
  customerId?: string;
  dealId?: string;
  epicId?: string;
  page?: number;
  pageSize?: number;
  priority?: string;
  projectId?: string;
  search?: string;
  sprintId?: string;
  status?: string;
  type?: string;
  unassignedSprint?: boolean;
}

export interface CreateBacklogItemPayload {
  acceptanceCriteria?: string;
  assignedUserAvatar?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  customerId?: string;
  customerName?: string;
  dealId?: string;
  description?: string;
  dueDate?: string;
  epicId?: string;
  estimatedHours?: number;
  priority?: "Low" | "Medium" | "High" | "Urgent" | string;
  sprintId?: string;
  status?: string;
  storyPoints?: number;
  ticketId?: string;
  title: string;
  type?: "Story" | "Task" | "Bug" | "Feature" | "Improvement" | string;
}

export interface UpdateBacklogItemPayload {
  acceptanceCriteria?: string;
  assignedUserAvatar?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  customerId?: string;
  customerName?: string;
  dealId?: string;
  description?: string;
  dueDate?: string;
  epicId?: string;
  estimatedHours?: number;
  loggedHours?: number;
  priority?: "Low" | "Medium" | "High" | "Urgent" | string;
  sprintId?: string;
  status?: string;
  storyPoints?: number;
  ticketId?: string;
  title: string;
  type?: "Story" | "Task" | "Bug" | "Feature" | "Improvement" | string;
}

// ==========================================
// Vehicles & Automotive Platform Interfaces
// ==========================================

export interface VehicleDimensions {
  cargoVolume?: number;
  fuelTank?: number;
  groundClearance?: number;
  height?: number;
  length?: number;
  wheelbase?: number;
  width?: number;
}

export interface VehicleWeights {
  curb?: number;
  gvw?: number;
  payload?: number;
}

export interface VehicleEngineSpec {
  aspiration?: string;
  cylinders?: string;
  displacement?: string;
  power?: string;
  torque?: string;
}

export interface VehiclePerformance {
  accel?: string;
  topSpeed?: string;
}

export interface VehicleFuelEco {
  combined?: string;
  urban?: string;
  wltp?: string;
}

export interface VehicleSuspension {
  front?: string;
  rear?: string;
}

export interface VehicleBrakes {
  front?: string;
  rear?: string;
}

export interface VehicleSafety {
  adas?: string[];
  airbags?: number;
}

export interface VehicleComfort {
  climate?: string;
  seats?: string;
}

export interface VehicleInfotainment {
  features?: string[];
  screen?: string;
}

export interface VehicleWarranty {
  corrosion?: string;
  powertrain?: string;
  vehicle?: string;
}

export interface VehicleSummaryDto {
  bodyType?: string;
  brakesJson: string;
  brand: string;
  comfortJson: string;
  country?: string;
  createdAt: string;
  dimensionsJson: string;
  doors?: number;
  driveType?: string;
  emission?: string;
  engine?: string;
  engineSpecJson: string;
  equipmentJson: string;
  fuel?: string;
  fuelEcoJson: string;
  generation?: string;
  icon: string;
  id: string;
  infotainmentJson: string;
  internalCode?: string;
  market?: string;
  model: string;
  modelYear?: number;
  notes?: string;
  performanceJson: string;
  plant?: string;
  platform?: string;
  priceTry?: number;
  priceUsd?: number;
  projectCode?: string;
  safetyJson: string;
  seats?: number;
  segment?: string;
  series?: string;
  status: "Active" | "Development" | "Discontinued" | string;
  suspensionJson: string;
  transmission?: string;
  trim?: string;
  tyres?: string;
  updatedAt: string;
  variant?: string;
  vinPrefix?: string;
  warrantyJson: string;
  weightsJson: string;
}

export interface VehicleListResponse {
  items: VehicleSummaryDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateVehiclePayload {
  bodyType?: string;
  brakesJson?: string;
  brand: string;
  comfortJson?: string;
  country?: string;
  dimensionsJson?: string;
  doors?: number;
  driveType?: string;
  emission?: string;
  engine?: string;
  engineSpecJson?: string;
  equipmentJson?: string;
  fuel?: string;
  fuelEcoJson?: string;
  generation?: string;
  icon?: string;
  infotainmentJson?: string;
  internalCode?: string;
  market?: string;
  model: string;
  modelYear?: number;
  notes?: string;
  performanceJson?: string;
  plant?: string;
  platform?: string;
  priceTry?: number;
  priceUsd?: number;
  projectCode?: string;
  safetyJson?: string;
  seats?: number;
  segment?: string;
  series?: string;
  status?: string;
  suspensionJson?: string;
  transmission?: string;
  trim?: string;
  tyres?: string;
  variant?: string;
  vinPrefix?: string;
  warrantyJson?: string;
  weightsJson?: string;
}

export interface UpdateVehiclePayload {
  bodyType?: string;
  brakesJson?: string;
  brand?: string;
  comfortJson?: string;
  country?: string;
  dimensionsJson?: string;
  doors?: number;
  driveType?: string;
  emission?: string;
  engine?: string;
  engineSpecJson?: string;
  equipmentJson?: string;
  fuel?: string;
  fuelEcoJson?: string;
  generation?: string;
  icon?: string;
  infotainmentJson?: string;
  internalCode?: string;
  market?: string;
  model?: string;
  modelYear?: number;
  notes?: string;
  performanceJson?: string;
  plant?: string;
  platform?: string;
  priceTry?: number;
  priceUsd?: number;
  projectCode?: string;
  safetyJson?: string;
  seats?: number;
  segment?: string;
  series?: string;
  status?: string;
  suspensionJson?: string;
  transmission?: string;
  trim?: string;
  tyres?: string;
  variant?: string;
  vinPrefix?: string;
  warrantyJson?: string;
  weightsJson?: string;
}

export interface EpcSubsystemDto {
  code: string;
  displayOrder: number;
  id: string;
  name: string;
  partsCount: number;
  systemId: string;
}

export interface EpcSystemDto {
  code: string;
  displayOrder: number;
  icon: string;
  id: string;
  name: string;
  subsystems: EpcSubsystemDto[];
  totalPartsCount: number;
}

export interface VehiclePartDto {
  compatibleModelsJson: string;
  createdAt: string;
  hotspotCoordX?: number;
  hotspotCoordY?: number;
  id: string;
  location?: string;
  nameCn?: string;
  nameEn: string;
  nameTr: string;
  notes?: string;
  oemNumber?: string;
  partNumber: string;
  qtyPerAssembly: number;
  stockQuantity: number;
  subsystemId?: string;
  subsystemName?: string;
  supersession?: string;
  systemId?: string;
  systemName?: string;
  unitPrice: number;
  updatedAt: string;
}

export interface CreatePartPayload {
  compatibleModelsJson?: string;
  hotspotCoordX?: number;
  hotspotCoordY?: number;
  location?: string;
  nameCn?: string;
  nameEn: string;
  nameTr: string;
  notes?: string;
  oemNumber?: string;
  partNumber: string;
  qtyPerAssembly?: number;
  stockQuantity?: number;
  subsystemId?: string;
  supersession?: string;
  systemId?: string;
  unitPrice?: number;
}

export interface UpdatePartPayload {
  compatibleModelsJson?: string;
  hotspotCoordX?: number;
  hotspotCoordY?: number;
  location?: string;
  nameCn?: string;
  nameEn: string;
  nameTr: string;
  notes?: string;
  oemNumber?: string;
  partNumber: string;
  qtyPerAssembly?: number;
  stockQuantity?: number;
  subsystemId?: string;
  supersession?: string;
  systemId?: string;
  unitPrice?: number;
}

export interface VehicleDocumentDto {
  category: string;
  createdAt: string;
  documentType: string;
  fileSize: string;
  fileUrl?: string;
  id: string;
  name: string;
  partId?: string;
  partName?: string;
  tagsJson: string;
  vehicleId?: string;
  vehicleName?: string;
}

export interface CreateVehicleDocumentPayload {
  category: string;
  documentType: string;
  fileSize: string;
  fileUrl?: string;
  name: string;
  partId?: string;
  tagsJson?: string;
  vehicleId?: string;
}

// ==========================================
// Email Module Interfaces
// ==========================================
export interface EmailAccountDto {
  createdAt: string;
  description?: string;
  email: string;
  id: string;
  imapHost?: string;
  imapPort: number;
  isActive: boolean;
  provider: "generic_imap" | "resend" | string;
  secretMasked?: string;
  smtpHost?: string;
  smtpPort: number;
  tenantId: string;
  updatedAt: string;
}

export interface EmailAccountDetailDto extends EmailAccountDto {
  totalMessagesCount: number;
  unreadMessagesCount: number;
}

export interface TestEmailAccountConnectionResultDto {
  imapMessage?: string;
  imapSuccess: boolean;
  message?: string;
  smtpMessage?: string;
  smtpSuccess: boolean;
  success: boolean;
}

export interface EmailAttachmentDto {
  createdAt: string;
  filename: string;
  id: string;
  messageId: string;
  mimeType?: string;
  sizeBytes: number;
  storagePath: string;
}

export interface EmailMessageDto {
  accountId: string;
  attachments: EmailAttachmentDto[];
  ccAddresses?: string[];
  createdAt: string;
  customerId?: string;
  direction: "Inbound" | "Outbound" | string;
  externalId?: string;
  fromAddress: string;
  hasAttachments: boolean;
  htmlBody?: string;
  id: string;
  isRead: boolean;
  quoteId?: string;
  status: "Received" | "Sent" | "Draft" | "Failed" | "Sending" | string;
  subject?: string;
  tenantId: string;
  textBody?: string;
  threadId?: string;
  ticketId?: string;
  toAddresses: string[];
}

export interface EmailThreadDto {
  messages: EmailMessageDto[];
  subject?: string;
  threadId: string;
}

export interface EmailStatsDto {
  inboxTotal: number;
  sentToday: number;
  unreadCount: number;
}

export type PagedEmailMessages = PagedResult<EmailMessageDto>;
