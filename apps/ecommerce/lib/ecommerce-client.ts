/**
 * EcommerceClient — HTTP-only gateway to CRM public API.
 *
 * Rules (Q7/Q12):
 * - Zero import from CRM.Modules.BuildingBlocks — only HTTP.
 * - Same Supabase project, but no service_role write from browser.
 * - Sends X-Tenant-Slug + apikey/anon on every request, optional HMAC.
 * - Handles 429 rate-limit with Retry-After parsing.
 * - Follows apps/web/lib/api-client.ts pattern, stripped for public surface.
 */

// ---------------------------------------------------------------------------
// Config — resolved lazily so both server and client can read env
// ---------------------------------------------------------------------------

function getCrmBaseUrl(): string {
  if (typeof window !== "undefined") {
    // In browser, use proxy via /api which rewrites to CRM
    return "";
  }

  return (
    process.env.CRM_API_URL ||
    process.env.NEXT_PUBLIC_CRM_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000"
  );
}

function getAnonKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    null
  );
}

// Optional HMAC secret — only available server-side. If absent, HMAC header is omitted.
function getHmacSecret(): string | null {
  if (typeof window !== "undefined") {
    return null;
  }
  return (
    process.env.ECOMMERCE_HMAC_SECRET || process.env.CRM_HMAC_SECRET || null
  );
}

// ---------------------------------------------------------------------------
// Types — public surface (subset of CRM domain, VARCHAR enums only)
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data?: T;
  errorCode?: string;
  message?: string;
  retryAfterSeconds?: number;
  success: boolean;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

// -- Catalog (CRM master, ecommerce read-only, ISR 60s) --

export interface PublicProductVariantDto {
  additionalPrice?: number | null;
  barcode?: string | null;
  id: string;
  imageUrl?: string | null;
  isActive?: boolean;
  name: string;
  price: number;
  sku?: string | null;
  stock?: number | null;
}

export interface PublicProductDto {
  barcode?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  compareAtPrice?: number | null;
  currency: string;
  description?: string | null;
  id: string;
  images?: string[];
  imageUrl?: string | null;
  isFeatured?: boolean;
  isPublished: boolean;
  name: string;
  price: number;
  sku?: string | null;
  slug: string;
  stock?: number | null;
  variants?: PublicProductVariantDto[];
  weight?: number | null;
}

export interface PublicProductsParams {
  categoryId?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}

export type PublicProductDetailDto = PublicProductDto & {
  images?: string[];
  variants?: PublicProductVariantDto[];
};

// -- Cart (guest_token + auth_user_id merge server-side) --

export interface CartItemDto {
  id: string;
  imageUrl?: string | null;
  productId: string;
  productName: string;
  quantity: number;
  slug?: string;
  unitPrice: number;
}

export interface CartDto {
  currency: string;
  guestToken?: string | null;
  id: string;
  items: CartItemDto[];
  subtotal: number;
  totalAmount: number;
}

export interface AddToCartRequest {
  guestToken?: string;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

// -- Promotion evaluation (PromotionCalculationEngine → POST /api/public/cart/evaluate) --

export interface EvaluateCartRequest {
  couponCode?: string;
  guestToken?: string;
  items: { productId: string; quantity: number; unitPrice?: number }[];
}

export interface EvaluateCartResponse {
  appliedPromotions: {
    campaignName: string;
    description: string;
    discountAmount: number;
  }[];
  couponValidationMessage?: string | null;
  grandTotal: number;
  isCouponValid: boolean;
  isFreeShipping: boolean;
  shippingFee: number;
  subtotal: number;
  totalDiscountAmount: number;
}

// -- Orders (POST /api/public/orders → status=Confirmed source=ECommerce external_id unique) --

export interface CreatePublicOrderRequest {
  billingAddress?: string;
  billingAddressId?: string;
  cartId?: string;
  couponCode?: string;
  customerEmail?: string;
  customerPhone?: string;
  guestToken?: string;
  notes?: string;
  paymentGateway?: string;
  shippingAddress?: string;
  shippingAddressId?: string;
  shippingCarrier?: string;
}

export interface PublicOrderDto {
  createdAt: string;
  currency: string;
  id: string;
  orderNumber: string;
  paymentStatus: string;
  status: string;
  totalAmount: number;
}

export interface OrderTrackingDto {
  carrier?: string | null;
  estimatedDelivery?: string | null;
  events: { status: string; description: string; timestamp: string }[];
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string | null;
}

// -- Support tickets (POST /api/public/tickets → SenderType=Customer) --

export interface CreatePublicTicketRequest {
  category?: string;
  description: string;
  orderId?: string;
  priority?: string;
  subject: string;
}

export interface PublicTicketDto {
  createdAt: string;
  id: string;
  priority: string;
  status: string;
  subject: string;
  ticketNumber: string;
}

// -- Customer addresses (customer_addresses book, billing/shipping, default) --

export interface CustomerAddressDto {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  country: string;
  createdAt: string;
  district?: string | null;
  id: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
  label?: string | null;
  postalCode?: string | null;
  title?: string | null;
  type: string;
}

export interface CreateAddressRequest {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country?: string;
  district?: string;
  isDefaultBilling?: boolean;
  isDefaultShipping?: boolean;
  label?: string;
  postalCode?: string;
  title?: string;
  type: string;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  id: string;
}

// -- Storefront / tenant settings (tenant_modules.ecommerce_enabled + tenant_settings) --

export interface StorefrontDto {
  defaultCarrier?: string | null;
  ecommerceEnabled: boolean;
  paymentGateway?: string | null;
  storeTheme?: string | null;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

// -- Payments (POST /api/public/payments/create-intent → iyzico/PayTR/Stripe) --

export interface CreatePaymentIntentRequest {
  gateway?: string;
  guestToken?: string;
  orderId: string;
}

export interface PaymentIntentDto {
  checkoutUrl?: string | null;
  clientSecret?: string | null;
  gateway: string;
  orderId: string;
  paymentId: string;
  status: string;
}

// ---------------------------------------------------------------------------
// HMAC helper — server only, uses Node crypto when available
// ---------------------------------------------------------------------------

async function buildHmacHeaders(
  tenantSlug: string
): Promise<Record<string, string>> {
  const secret = getHmacSecret();
  if (!secret) {
    return {};
  }

  const timestamp = Date.now().toString();
  const payload = `${tenantSlug}:${timestamp}`;

  // Server: Node crypto
  try {
    // Dynamic import to avoid bundling node: crypto into client
    const { createHmac } = await import("node:crypto");
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return {
      "X-HMAC-Signature": signature,
      "X-Request-Timestamp": timestamp,
    };
  } catch {
    // Fallback — Web Crypto (edge / browser if secret were ever exposed, which it shouldn't)
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
      const hex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return {
        "X-HMAC-Signature": hex,
        "X-Request-Timestamp": timestamp,
      };
    } catch {
      return { "X-Request-Timestamp": timestamp };
    }
  }
}

// ---------------------------------------------------------------------------
// Core request — mirrors ApiClient.request but for public surface
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: public API wrapper handles 429/4xx/204/JSON branches centrally
async function publicRequest<T>(
  endpoint: string,
  tenantSlug: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (!tenantSlug || tenantSlug.trim().length === 0) {
    return {
      errorCode: "TENANT_SLUG_REQUIRED",
      message: "tenantSlug is required (X-Tenant-Slug)",
      success: false,
    };
  }

  const baseUrl = getCrmBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const anonKey = getAnonKey();
  const hmacHeaders = await buildHmacHeaders(tenantSlug);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Slug": tenantSlug,
    ...(options.headers as Record<string, string>),
    ...hmacHeaders,
  };

  if (anonKey) {
    headers.apikey = anonKey;
    // Supabase anon also expects Authorization: Bearer <anon> for RLS-proxy paths
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${anonKey}`;
    }
  }

  // Forward guest_token if present in options (cart merge)
  // Caller can also pass X-Guest-Token header explicitly

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      // ISR for catalog — 60s; callers can override with `next: { revalidate: 0 }` for mutations
      next: (options as { next?: { revalidate?: number } }).next ?? undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return {
      errorCode: "NETWORK_ERROR",
      message,
      success: false,
    };
  }

  // Rate-limit: 429 with Retry-After
  if (res.status === 429) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : 30;
    let body: { message?: string; errorCode?: string } | null = null;
    try {
      body = (await res.json()) as { message?: string; errorCode?: string };
    } catch {
      // ignore parse
    }
    return {
      errorCode: body?.errorCode || "RATE_LIMITED",
      message:
        body?.message || `Rate limited. Retry after ${retryAfterSeconds}s.`,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds
        : 30,
      success: false,
    };
  }

  if (!res.ok) {
    try {
      const errorJson = (await res.json()) as {
        errorCode?: string;
        title?: string;
        message?: string;
        detail?: string;
      };
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

  // 204 No Content
  if (res.status === 204) {
    return { data: undefined as unknown as T, success: true };
  }

  try {
    const json = (await res.json()) as ApiResponse<T> | T;
    // Normalize: if response already has { success, data } shape, return as-is
    if (json && typeof json === "object" && "success" in json) {
      return json as ApiResponse<T>;
    }
    // Otherwise wrap raw data
    return { data: json as T, success: true };
  } catch {
    return {
      errorCode: "INVALID_JSON",
      message: "Failed to parse response",
      success: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API helpers — typed, no BuildingBlocks import
// ---------------------------------------------------------------------------

export const EcommerceClient = {
  async addToCart(
    data: AddToCartRequest,
    tenantSlug: string
  ): Promise<ApiResponse<CartDto>> {
    const headers: Record<string, string> = {};
    if (data.guestToken) {
      headers["X-Guest-Token"] = data.guestToken;
    }
    return await publicRequest<CartDto>("/api/public/cart/items", tenantSlug, {
      body: JSON.stringify({
        guestToken: data.guestToken,
        productId: data.productId,
        quantity: data.quantity,
      }),
      headers,
      method: "POST",
    });
  },

  // -- Addresses (customer_addresses book) --

  async createAddress(
    data: CreateAddressRequest,
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<CustomerAddressDto>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return await publicRequest<CustomerAddressDto>(
      "/api/public/addresses",
      tenantSlug,
      {
        body: JSON.stringify(data),
        headers,
        method: "POST",
      }
    );
  },

  createOrdersPoller(
    tenantSlug: string,
    callbacks: {
      onOrders?: (data: unknown) => void;
      onError?: (error: Error) => void;
    },
    accessToken?: string,
    intervalMs = 30_000
  ): () => void {
    const tick = async () => {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const res = await publicRequest<PublicOrderDto[]>(
        `/api/public/orders/mine?tenantSlug=${encodeURIComponent(tenantSlug)}&poll=true`,
        tenantSlug,
        { headers, method: "GET" }
      );
      if (res.success) {
        callbacks.onOrders?.(res.data);
      } else if (res.errorCode !== "RATE_LIMITED") {
        callbacks.onError?.(new Error(res.message ?? "poll failed"));
      }
    };
    // Initial tick after 2s, then every intervalMs
    const t0 = setTimeout(() => void tick(), 2000);
    const iv = setInterval(() => void tick(), intervalMs);
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
    };
  },

  async createPaymentIntent(
    data: CreatePaymentIntentRequest,
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<PaymentIntentDto>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (data.guestToken) {
      headers["X-Guest-Token"] = data.guestToken;
    }
    return await publicRequest<PaymentIntentDto>(
      "/api/public/payments/create-intent",
      tenantSlug,
      {
        body: JSON.stringify(data),
        headers,
        method: "POST",
      }
    );
  },

  // -- Orders --

  async createPublicOrder(
    data: CreatePublicOrderRequest,
    tenantSlug: string
  ): Promise<ApiResponse<PublicOrderDto>> {
    const headers: Record<string, string> = {};
    if (data.guestToken) {
      headers["X-Guest-Token"] = data.guestToken;
    }
    return await publicRequest<PublicOrderDto>(
      "/api/public/orders",
      tenantSlug,
      {
        body: JSON.stringify(data),
        headers,
        method: "POST",
      }
    );
  },

  // -- Support tickets --

  async createPublicTicket(
    data: CreatePublicTicketRequest,
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<PublicTicketDto>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return await publicRequest<PublicTicketDto>(
      "/api/public/tickets",
      tenantSlug,
      {
        body: JSON.stringify(data),
        headers,
        method: "POST",
      }
    );
  },

  async deleteAddress(
    addressId: string,
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<void>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return await publicRequest<void>(
      `/api/public/addresses/${addressId}`,
      tenantSlug,
      {
        headers,
        method: "DELETE",
      }
    );
  },

  async evaluateCart(
    data: EvaluateCartRequest,
    tenantSlug: string
  ): Promise<ApiResponse<EvaluateCartResponse>> {
    return await publicRequest<EvaluateCartResponse>(
      "/api/public/cart/evaluate",
      tenantSlug,
      {
        body: JSON.stringify(data),
        method: "POST",
      }
    );
  },

  async getAddresses(
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<CustomerAddressDto[]>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const query = new URLSearchParams({ tenantSlug });
    return await publicRequest<CustomerAddressDto[]>(
      `/api/public/addresses?${query.toString()}`,
      tenantSlug,
      {
        headers,
        method: "GET",
      }
    );
  },

  // -- Cart --

  async getCart(
    tenantSlug: string,
    guestToken?: string
  ): Promise<ApiResponse<CartDto>> {
    const headers: Record<string, string> = {};
    if (guestToken) {
      headers["X-Guest-Token"] = guestToken;
    }
    const query = new URLSearchParams({ tenantSlug });
    if (guestToken) {
      query.set("guestToken", guestToken);
    }
    return await publicRequest<CartDto>(
      `/api/public/cart?${query.toString()}`,
      tenantSlug,
      {
        headers,
        method: "GET",
      }
    );
  },

  async getMyOrders(
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<PublicOrderDto[]>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const query = new URLSearchParams({ tenantSlug });
    return await publicRequest<PublicOrderDto[]>(
      `/api/public/orders/mine?${query.toString()}`,
      tenantSlug,
      {
        headers,
        method: "GET",
      }
    );
  },

  async getMyTickets(
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<PublicTicketDto[]>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const query = new URLSearchParams({ tenantSlug });
    return await publicRequest<PublicTicketDto[]>(
      `/api/public/tickets/mine?${query.toString()}`,
      tenantSlug,
      {
        headers,
        method: "GET",
      }
    );
  },

  async getOrderTracking(
    orderId: string,
    tenantSlug: string
  ): Promise<ApiResponse<OrderTrackingDto>> {
    const query = new URLSearchParams({ tenantSlug });
    return await publicRequest<OrderTrackingDto>(
      `/api/public/orders/${orderId}/tracking?${query.toString()}`,
      tenantSlug,
      { method: "GET" }
    );
  },

  async getPublicProductBySlug(
    slug: string,
    tenantSlug: string
  ): Promise<ApiResponse<PublicProductDetailDto>> {
    const query = new URLSearchParams({ tenantSlug });
    return await publicRequest<PublicProductDetailDto>(
      `/api/public/products/${encodeURIComponent(slug)}?${query.toString()}`,
      tenantSlug,
      {
        method: "GET",
        next: { revalidate: 60 },
      } as RequestInit & { next: { revalidate: number } }
    );
  },
  // -- Products (GET /api/public/products?tenantSlug&is_published) --

  async getPublicProducts(
    params: PublicProductsParams,
    tenantSlug: string
  ): Promise<ApiResponse<PagedResult<PublicProductDto>>> {
    const query = new URLSearchParams();
    query.set("tenantSlug", tenantSlug);
    if (params.isPublished !== undefined) {
      query.set("is_published", String(params.isPublished));
    }
    if (params.isFeatured !== undefined) {
      query.set("is_featured", String(params.isFeatured));
    }
    if (params.categoryId) {
      query.set("categoryId", params.categoryId);
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

    return await publicRequest<PagedResult<PublicProductDto>>(
      `/api/public/products?${query.toString()}`,
      tenantSlug,
      {
        method: "GET",
        next: { revalidate: 60 },
      } as RequestInit & { next: { revalidate: number } }
    );
  },

  async getStorefront(tenantSlug: string): Promise<ApiResponse<StorefrontDto>> {
    const query = new URLSearchParams({ tenantSlug });
    return await publicRequest<StorefrontDto>(
      `/api/public/storefront?${query.toString()}`,
      tenantSlug,
      {
        method: "GET",
        next: { revalidate: 60 },
      } as RequestInit & { next: { revalidate: number } }
    );
  },

  async mergeCart(
    tenantSlug: string,
    guestToken: string,
    accessToken?: string
  ): Promise<ApiResponse<CartDto>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return await publicRequest<CartDto>("/api/public/cart/merge", tenantSlug, {
      body: JSON.stringify({ guestToken }),
      headers,
      method: "POST",
    });
  },

  // -------------------------------------------------------------------------
  // Polling fallback (Q13) — 30s interval when Realtime unavailable
  // -------------------------------------------------------------------------

  /**
   * Polling fallback for GET /api/public/orders/mine?poll=true
   * Calls every 30s; caller should use with setInterval/clearInterval.
   * See also lib/realtime.ts startOrdersPolling for full Supabase Realtime + fallback combo.
   */
  async pollOrdersMine(
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<PublicOrderDto[]>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return await publicRequest<PublicOrderDto[]>(
      `/api/public/orders/mine?tenantSlug=${encodeURIComponent(tenantSlug)}&poll=true`,
      tenantSlug,
      { headers, method: "GET" }
    );
  },

  async removeCartItem(
    itemId: string,
    tenantSlug: string,
    guestToken?: string
  ): Promise<ApiResponse<CartDto>> {
    const headers: Record<string, string> = {};
    if (guestToken) {
      headers["X-Guest-Token"] = guestToken;
    }
    return await publicRequest<CartDto>(
      `/api/public/cart/items/${itemId}`,
      tenantSlug,
      {
        headers,
        method: "DELETE",
      }
    );
  },

  // Expose raw request for escape hatches (still tenantSlug-bound)
  request: publicRequest,

  // -------------------------------------------------------------------------
  // Auth sync + guest merge (Q8) — POST /api/public/auth/sync + POST /api/public/cart/merge
  // -------------------------------------------------------------------------

  async syncAuth(
    tenantSlug: string,
    data: {
      email?: string;
      fullName?: string;
      phone?: string;
      guestToken?: string;
    },
    accessToken?: string
  ): Promise<
    ApiResponse<{ customerId: string; tenantId: string; status: string }>
  > {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (data.guestToken) {
      headers["X-Guest-Token"] = data.guestToken;
    }
    return await publicRequest<{
      customerId: string;
      tenantId: string;
      status: string;
    }>("/api/public/auth/sync", tenantSlug, {
      body: JSON.stringify({
        email: data.email,
        fullName: data.fullName,
        guestToken: data.guestToken,
        phone: data.phone,
      }),
      headers,
      method: "POST",
    });
  },

  async updateAddress(
    addressId: string,
    data: UpdateAddressRequest,
    tenantSlug: string,
    accessToken?: string
  ): Promise<ApiResponse<CustomerAddressDto>> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return await publicRequest<CustomerAddressDto>(
      `/api/public/addresses/${addressId}`,
      tenantSlug,
      {
        body: JSON.stringify(data),
        headers,
        method: "PUT",
      }
    );
  },

  async updateCartItem(
    itemId: string,
    data: UpdateCartItemRequest,
    tenantSlug: string,
    guestToken?: string
  ): Promise<ApiResponse<CartDto>> {
    const headers: Record<string, string> = {};
    if (guestToken) {
      headers["X-Guest-Token"] = guestToken;
    }
    return await publicRequest<CartDto>(
      `/api/public/cart/items/${itemId}`,
      tenantSlug,
      {
        body: JSON.stringify(data),
        headers,
        method: "PUT",
      }
    );
  },
};
