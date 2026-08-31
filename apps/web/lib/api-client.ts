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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
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
      roleId && roleId.trim() !== "" && roleId !== "none" ? roleId.trim() : null;
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
    if (params.status) q.set("status", params.status);
    if (params.priority) q.set("priority", params.priority);
    if (params.category) q.set("category", params.category);
    if (params.departmentId) q.set("departmentId", params.departmentId);
    if (params.assignedUserId) q.set("assignedUserId", params.assignedUserId);
    if (params.queue) q.set("queue", params.queue);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", params.page.toString());
    if (params.pageSize) q.set("pageSize", params.pageSize.toString());

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

  // Public quote views (unauthenticated)
  static async getPublicQuote(
    token: string
  ): Promise<ApiResponse<PublicQuoteViewDto>> {
    return ApiClient.request<PublicQuoteViewDto>(
      `/api/public/quotes/${token}`,
      { method: "GET" }
    );
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
    if (params.category && params.category !== "all") q.set("category", params.category);
    if (params.isActive !== undefined) q.set("isActive", String(params.isActive));
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.pageSize) q.set("pageSize", String(params.pageSize));

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
    if (params.workflowId) q.set("workflowId", params.workflowId);
    if (params.status && params.status !== "all") q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    if (params.pageSize) q.set("pageSize", String(params.pageSize));

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
    if (params.status && params.status !== "all") q.set("status", params.status);
    if (params.moduleSource && params.moduleSource !== "all") q.set("moduleSource", params.moduleSource);
    if (params.severity && params.severity !== "all") q.set("severity", params.severity);
    if (params.page) q.set("page", String(params.page));
    if (params.pageSize) q.set("pageSize", String(params.pageSize));

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
    const res = await fetch(`${API_BASE_URL}/api/recruitment/candidates/import`, {
      body: formData,
      headers,
      method: "POST",
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
    const qs = isActive !== undefined ? `?isActive=${isActive}` : "";
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
    return ApiClient.request<PublicApplyResponse>("/api/recruitment/public/apply", {
      body: JSON.stringify(data),
      method: "POST",
    });
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
    if (params.search) query.set("search", params.search);
    if (params.type) query.set("type", params.type);
    if (params.triggerType) query.set("triggerType", params.triggerType);
    if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
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
    if (params.campaignId) query.set("campaignId", params.campaignId);
    if (params.search) query.set("search", params.search);
    if (params.batchId) query.set("batchId", params.batchId);
    if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
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
  ): Promise<ApiResponse<{ batchId: string; generatedCount: number; codes: string[]; message: string }>> {
    return ApiClient.request<{ batchId: string; generatedCount: number; codes: string[]; message: string }>(
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
  id?: string;
  productId?: string;
  variantId?: string;
  productName?: string;
  sku?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  unitCost?: number;
  discountRate?: number;
  taxRate?: number;
  isOptional?: boolean;
  isSelected?: boolean;
  orderIndex?: number;
}

export interface CreateQuoteRevisionPayload {
  revisionNotes?: string;
  title?: string;
  currency?: string;
  exchangeRate?: number;
  discountType?: string;
  discountRate?: number;
  discountAmount?: number;
  validUntil?: string;
  termsAndConditions?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  bankDetails?: string;
  notes?: string;
  paymentMethod?: string;
  paymentDueDays?: number;
  paymentDueDate?: string;
  items?: RevisionItemOverridePayload[];
}

export interface ConvertOrderItemOverridePayload {
  quoteItemId?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  isSelected?: boolean;
  description?: string;
}

export interface ConvertToOrderPayload {
  shippingFee?: number;
  notes?: string;
  dueDate?: string;
  paymentMethod?: string;
  items?: ConvertOrderItemOverridePayload[];
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
  id: string;
  isDefault: boolean;
  name: string;
  paymentTerms?: string;
  termsAndConditions?: string;
  updatedAt: string;
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

// --- HelpDesk & Ticket DTOs ---
export interface TicketListDto {
  assignedUserId?: string;
  assignedUserName?: string;
  category: string;
  channelId?: string;
  closedAt?: string;
  createdAt: string;
  customerId: string;
  customerEmail?: string;
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
  slaComplianceRate: number;
  slaBreachedTickets: number;
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
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Customer360OrderBriefDto {
  id: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items: Customer360OrderItemDto[];
}

export interface Customer360ShipmentBriefDto {
  id: string;
  shipmentNumber: string;
  status: string;
  carrierName?: string;
  trackingNumber?: string;
  createdAt: string;
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
  customerId: string;
  customerEmail?: string;
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
  get: <T>(endpoint: string, tenantId?: string) =>
    ApiClient.request<T>(endpoint, { method: "GET" }, tenantId),
  post: <T>(endpoint: string, body?: unknown, tenantId?: string) =>
    ApiClient.request<T>(
      endpoint,
      { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined },
      tenantId
    ),
  put: <T>(endpoint: string, body?: unknown, tenantId?: string) =>
    ApiClient.request<T>(
      endpoint,
      { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined },
      tenantId
    ),
  delete: <T>(endpoint: string, tenantId?: string) =>
    ApiClient.request<T>(endpoint, { method: "DELETE" }, tenantId),
};

// ==========================================
// Automations Module DTOs
// ==========================================
export interface WorkflowSummaryDto {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon: string;
  color: string;
  isActive: boolean;
  triggerType: string;
  conditionsCount: number;
  actionsCount: number;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStatsDto {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  executionsToday: number;
  totalExecutionsAllTime: number;
  successRate: number;
  estimatedHoursSaved: number;
}

export interface WorkflowTriggerConfigDto {
  targetStatus?: string;
  targetPriority?: string;
  targetCategory?: string;
  entityFilter?: string;
  additionalSettings?: Record<string, string>;
}

export interface WorkflowConditionRuleDto {
  field: string;
  operator: string;
  value: string;
  fieldType?: string;
}

export interface WorkflowConditionGroupDto {
  logicalOperator: "AND" | "OR" | string;
  rules: WorkflowConditionRuleDto[];
}

export interface WorkflowActionStepDto {
  id: string;
  type: "notification" | "updateRecord" | "createRecord" | "webhook" | "delay" | string;
  title: string;
  order: number;
  delayMinutes?: number;
  config: Record<string, unknown>;
}

export interface ExecutionStepLogDto {
  stepId: string;
  stepType: string;
  stepTitle: string;
  status: "Success" | "Failed" | "Skipped" | string;
  message: string;
  timestamp: string;
  executionDurationMs: number;
  outputData?: Record<string, unknown>;
}

export interface ExecutionSummaryDto {
  id: string;
  triggerSource: string;
  entityType?: string;
  entityId?: string;
  status: "Success" | "Failed" | "Skipped" | string;
  evaluatedConditionsSummary?: string;
  actionsExecutedCount: number;
  executionDurationMs: number;
  stepLogs: ExecutionStepLogDto[];
  errorMessage?: string;
  createdAt: string;
}

export interface WorkflowDetailDto {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon: string;
  color: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: WorkflowTriggerConfigDto;
  conditions: WorkflowConditionGroupDto[];
  actions: WorkflowActionStepDto[];
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
  recentExecutions: ExecutionSummaryDto[];
}

export interface WorkflowTemplateDto {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  triggerType: string;
  triggerConfig: WorkflowTriggerConfigDto;
  conditions: WorkflowConditionGroupDto[];
  actions: WorkflowActionStepDto[];
}

export interface CreateWorkflowPayload {
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig?: WorkflowTriggerConfigDto;
  conditions?: WorkflowConditionGroupDto[];
  actions?: WorkflowActionStepDto[];
}

export interface UpdateWorkflowPayload {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig?: WorkflowTriggerConfigDto;
  conditions?: WorkflowConditionGroupDto[];
  actions?: WorkflowActionStepDto[];
}

export interface TestWorkflowPayload {
  id: string;
  entityType?: string;
  entityId?: string;
  mockContext?: Record<string, unknown>;
}

export interface AutomationExecutionResultDto {
  workflowId: string;
  workflowName: string;
  status: "Success" | "Failed" | "Skipped" | string;
  conditionsSummary: string;
  actionsExecutedCount: number;
  executionDurationMs: number;
  stepLogs: ExecutionStepLogDto[];
  errorMessage?: string;
}

export interface ExecutionItemDto {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerSource: string;
  entityType?: string;
  entityId?: string;
  status: "Success" | "Failed" | "Skipped" | string;
  evaluatedConditionsSummary?: string;
  actionsExecutedCount: number;
  executionDurationMs: number;
  errorMessage?: string;
  createdAt: string;
}

// ==========================================
// Compliance & Labor Law DTOs
// ==========================================
export interface ComplianceCategorySummaryDto {
  category: string;
  categoryTitle: string;
  rulesCount: number;
  activeViolations: number;
  score: number;
  status: "Excellent" | "Good" | "Risk" | string;
}

export interface ComplianceScoreResultDto {
  healthScore: number;
  activeViolationsCount: number;
  hardBlockedAttemptsCount: number;
  overriddenViolationsCount: number;
  totalRulesCount: number;
  estimatedPenaltyExposureTl: number;
  categorySummaries: ComplianceCategorySummaryDto[];
}

export interface ComplianceRuleDto {
  id: string;
  code: string;
  lawReference: string;
  category: string;
  name: string;
  description?: string;
  penaltyRiskLevel: "Low" | "Medium" | "High" | "Critical" | string;
  penaltyDescription?: string;
  enforcementLevel: "HardBlock" | "SoftWarning" | "Disabled" | string;
  thresholdConfigJson: string;
  isSystemRule: boolean;
  isActive: boolean;
  violationCount: number;
  updatedAt: string;
}

export interface ComplianceViolationDto {
  id: string;
  ruleId?: string;
  ruleCode: string;
  lawReference: string;
  employeeId?: string;
  employeeName: string;
  moduleSource: string;
  entityId?: string;
  severity: "Warning" | "Violation" | "CriticalRisk" | string;
  details: string;
  violationDataJson: string;
  isOverridden: boolean;
  overriddenByUserId?: string;
  overrideReason?: string;
  overriddenAt?: string;
  status: "Active" | "Resolved" | "Overridden" | string;
  createdAt: string;
}

export interface ComplianceViolationDetailDto {
  ruleCode: string;
  lawReference: string;
  ruleName: string;
  category: string;
  severity: string;
  enforcementLevel: string;
  details: string;
  penaltyRisk?: string;
  contextData: Record<string, unknown>;
}

export interface ComplianceValidationResultDto {
  isCompliant: boolean;
  hasHardBlock: boolean;
  violations: ComplianceViolationDetailDto[];
}

export interface UpdateComplianceRulePayload {
  id: string;
  enforcementLevel: "HardBlock" | "SoftWarning" | "Disabled" | string;
  isActive: boolean;
  thresholdConfigJson?: string;
}

export interface ValidateShiftPayload {
  employeeId: string;
  employeeName: string;
  shiftStart: string;
  shiftEnd: string;
  breakMinutes: number;
  currentWeekTotalHours?: number;
  previousShiftEnd?: string;
  isPregnant?: boolean;
}

export interface ValidateShiftTemplatePayload {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift?: boolean;
}

export interface ValidateLeavePayload {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  requestedDays: number;
  seniorityYears: number;
  age: number;
}

// ==========================================
// Recruitment Module DTOs
// ==========================================
export interface RequisitionDto {
  id: string;
  tenantId: string;
  title: string;
  departmentId?: string;
  departmentName?: string;
  jobPositionId?: string;
  jobPositionTitle?: string;
  headcount: number;
  employmentType?: string;
  workModel?: string;
  location?: string;
  minSalary?: number;
  maxSalary?: number;
  currency: string;
  description?: string;
  requirements?: string;
  status: string;
  isPublished: boolean;
  publishedAt?: string;
  closingDate?: string;
  hiringManagerId?: string;
  hiringManagerName?: string;
  priority: string;
  applicationCount: number;
  hiredCount: number;
  headcountWarning?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagedRequisitionsResponse {
  items: RequisitionDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateRequisitionPayload {
  title: string;
  departmentId?: string;
  jobPositionId?: string;
  headcount: number;
  employmentType?: string;
  workModel?: string;
  location?: string;
  minSalary?: number;
  maxSalary?: number;
  currency: string;
  description?: string;
  requirements?: string;
  closingDate?: string;
  hiringManagerId?: string;
  priority: string;
}

export interface UpdateRequisitionPayload extends CreateRequisitionPayload {
  id?: string;
}

export interface CandidateDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  source: string;
  tags?: string[];
  cvFileUrl?: string;
  cvFileName?: string;
  consentGiven: boolean;
  consentGivenAt?: string;
  notes?: string;
  deletedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  applicationCount: number;
}

export interface PagedCandidatesResponse {
  items: CandidateDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateCandidatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  source: string;
  tags?: string[];
  cvFileUrl?: string;
  cvFileName?: string;
  consentGiven: boolean;
  notes?: string;
}

export interface UpdateCandidatePayload extends CreateCandidatePayload {
  id?: string;
}

export interface CvUploadResponse {
  candidateId: string;
  cvFileUrl: string;
  cvFileName: string;
  sizeBytes: number;
  message: string;
}

export interface CsvImportRowPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
  tagsRaw?: string;
  consentGiven?: boolean;
}

export interface CsvImportResponse {
  imported: number;
  skippedDuplicates: number;
  skippedEmails: string[];
  errors: { row: number; email: string; error: string }[];
}

export interface ApplicationDto {
  id: string;
  tenantId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  requisitionId: string;
  requisitionTitle: string;
  stageId?: string;
  stageName?: string;
  stageColorHex?: string;
  status: string;
  score?: number;
  notes?: string;
  headcountWarning?: string;
  createdAt: string;
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
  requisitionId: string;
  stageId?: string;
  score?: number;
  notes?: string;
}

export interface UpdateApplicationPayload {
  score?: number;
  notes?: string;
}

export interface StageDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  sortOrder: number;
  colorHex: string;
  isDefault: boolean;
  stageType: string;
  isActive: boolean;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStagePayload {
  name: string;
  slug?: string;
  colorHex: string;
  stageType: string;
  isActive: boolean;
}

export interface UpdateStagePayload extends CreateStagePayload {
  id?: string;
}

export interface PublicApplyPayload {
  requisitionId?: string;
  requisitionSlug?: string;
  tenantSlug?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cvBase64?: string;
  cvFileName?: string;
  consentGiven: boolean;
  honeypot?: string;
  website?: string;
}

export interface PublicApplyResponse {
  candidateId: string;
  applicationId: string;
  candidateEmail: string;
  requisitionId: string;
  requisitionTitle: string;
  stageId?: string;
  status: string;
  cvFileUrl?: string;
  message: string;
}

// ==========================================
// Promotions & Campaigns DTOs
// ==========================================
export interface CampaignListItemDto {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type: "Percentage" | "FixedAmount" | "CartThreshold" | "BuyXGetY" | "FreeShipping" | string;
  triggerType: "Automatic" | "CouponCode" | string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  priority: number;
  isStackable: boolean;
  totalUsageLimit?: number;
  perCustomerUsageLimit?: number;
  currentUsageCount: number;
  targetsCount: number;
  couponsCount: number;
  createdAt: string;
}

export interface CampaignTargetDto {
  id: string;
  targetType: "Product" | "Category" | "Brand" | "Customer" | "CustomerGroup" | string;
  targetId: string;
  targetName?: string;
  ruleCondition: "Include" | "Exclude" | string;
}

export interface CampaignDetailDto {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type: string;
  triggerType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  minQuantity: number;
  buyQuantity: number;
  getQuantity: number;
  getDiscountRate: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  priority: number;
  isStackable: boolean;
  totalUsageLimit?: number;
  perCustomerUsageLimit?: number;
  currentUsageCount: number;
  metadata: string;
  targets: CampaignTargetDto[];
  couponsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignTargetPayload {
  targetType: string;
  targetId: string;
  targetName?: string;
  ruleCondition: string;
}

export interface CreateCampaignPayload {
  name: string;
  code?: string;
  description?: string;
  type: string;
  triggerType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  minQuantity: number;
  buyQuantity?: number;
  getQuantity?: number;
  getDiscountRate?: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  priority: number;
  isStackable: boolean;
  totalUsageLimit?: number;
  perCustomerUsageLimit?: number;
  targets?: CreateCampaignTargetPayload[];
  initialCouponCode?: string;
}

export interface UpdateCampaignPayload extends Omit<CreateCampaignPayload, "initialCouponCode"> {}

export interface CouponListItemDto {
  id: string;
  campaignId: string;
  campaignName: string;
  code: string;
  type: "Standard" | "SingleUse" | "Dynamic" | string;
  maxUses: number;
  usedCount: number;
  assignedCustomerId?: string;
  assignedCustomerName?: string;
  expiresAt?: string;
  isActive: boolean;
  batchId?: string;
  createdAt: string;
}

export interface GenerateCouponsPayload {
  campaignId: string;
  quantity: number;
  prefix?: string;
  codeLength?: number;
  maxUses?: number;
  expiresAt?: string;
  customCode?: string;
}

export interface PromotionsStatsDto {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCoupons: number;
  totalUsages: number;
  totalDiscountDistributed: number;
  totalRevenueInfluenced: number;
}

export interface CartItemPayload {
  productId?: string;
  variantId?: string;
  categoryId?: string;
  brand?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
}

export interface CartPromotionEvaluationPayload {
  items: CartItemPayload[];
  customerId?: string;
  customerGroup?: string;
  couponCode?: string;
  shippingFee?: number;
}

export interface AppliedPromotionDto {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  couponCode?: string;
  discountAmount: number;
  description: string;
}

export interface CartPromotionEvaluationResultDto {
  subtotal: number;
  totalDiscountAmount: number;
  netTotal: number;
  shippingFee: number;
  isFreeShipping: boolean;
  appliedPromotions: AppliedPromotionDto[];
  items: CartItemPayload[];
  couponValidationMessage?: string;
  isCouponValid: boolean;
}




