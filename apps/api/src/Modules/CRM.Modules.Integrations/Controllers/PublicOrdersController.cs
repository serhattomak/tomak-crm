using System.IdentityModel.Tokens.Jwt;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Integrations.Data;
using CRM.Modules.Integrations.Services;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using CRM.Modules.Promotions.Data;
using CRM.Modules.Promotions.Entities;
using CRM.Modules.Promotions.Services;
using CRM.Modules.Shipping.Data;
using CRM.Modules.Shipping.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CRM.Modules.Integrations.Controllers;

public record CreatePublicOrderRequest(
    string? GuestToken,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string? ShippingAddress,
    string? BillingAddress,
    string? CouponCode,
    string? Currency,
    string? PaymentMethod,
    decimal? ShippingFee,
    List<CreatePublicOrderItemRequest>? Items);

public record CreatePublicOrderItemRequest(
    Guid? ProductId,
    Guid? VariantId,
    string? ProductName,
    string? Sku,
    decimal? UnitPrice,
    int Quantity);

public record PublicOrderDto(
    Guid Id,
    string OrderNumber,
    string Status,
    string PaymentStatus,
    decimal TotalAmount,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal ShippingFee,
    string? ExternalId,
    string Source,
    DateTime CreatedAt,
    List<PublicOrderItemDto> Items);

public record PublicOrderItemDto(
    Guid Id,
    Guid? ProductId,
    string ProductName,
    decimal UnitPrice,
    decimal Quantity,
    decimal TotalPrice);

public record ShipmentTrackingDto(
    Guid ShipmentId,
    string ShipmentNumber,
    string Status,
    string? TrackingNumber,
    string? CarrierName,
    string? TrackingUrl,
    List<ShipmentStatusHistoryDto> Histories);

public record ShipmentStatusHistoryDto(string Status, string? Location, string? Description, DateTime CreatedAt);

public class CreatePublicOrderValidator : AbstractValidator<CreatePublicOrderRequest>
{
    public CreatePublicOrderValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Items).Must(items => items == null || items.Count > 0).WithMessage("Items must not be empty if provided.");
    }
}

public class PublicOrdersController : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // POST /api/public/checkout/orders — creates orders Confirmed source=ECommerce external_id unique
        app.MapPost("/api/public/checkout/orders", async (
            HttpContext httpContext,
            CreatePublicOrderRequest request,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            OrdersDbContext ordersDb,
            ProductsDbContext productsDb,
            CustomersDbContext customersDb,
            PromotionsDbContext promotionsDb,
            ShippingDbContext shippingDb,
            IPromotionCalculationEngine promoEngine,
            ICurrentTenant currentTenant,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            if (string.IsNullOrWhiteSpace(request.CustomerName))
            {
                return Results.Json(new { error = "CustomerName is required." }, statusCode: 400);
            }

            var authUserId = TryResolveAuthUserId(httpContext);
            Guid? customerId = null;

            // Resolve customer from auth_user_id if present
            if (authUserId.HasValue)
            {
                var cust = await customersDb.Customers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.AuthUserId == authUserId.Value, ct);
                // Fallback: try by email if AuthUserId column missing or not matched
                if (cust == null && !string.IsNullOrWhiteSpace(request.CustomerEmail))
                {
                    cust = await customersDb.Customers.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Email != null && c.Email.ToLower() == request.CustomerEmail.Trim().ToLower(), ct);
                }
                customerId = cust?.Id;
            }
            else if (!string.IsNullOrWhiteSpace(request.CustomerEmail))
            {
                var cust = await customersDb.Customers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Email != null && c.Email.ToLower() == request.CustomerEmail.Trim().ToLower(), ct);
                customerId = cust?.Id;
            }

            // Collect items: prefer request.Items, fallback to cart
            var resolvedItems = new List<CreatePublicOrderItemRequest>();
            if (request.Items != null && request.Items.Count > 0)
            {
                resolvedItems.AddRange(request.Items);
            }
            else
            {
                var guestToken = request.GuestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();
                var cart = await FindCartAsync(integrationsDb, tenantId, customerId, guestToken, ct);
                if (cart != null)
                {
                    var cartItems = await integrationsDb.CartItems.IgnoreQueryFilters()
                        .Where(ci => ci.CartId == cart.Id).ToListAsync(ct);
                    foreach (var ci in cartItems)
                    {
                        resolvedItems.Add(new CreatePublicOrderItemRequest(ci.ProductId, ci.VariantId, ci.SnapshotName, null, ci.SnapshotPrice > 0 ? ci.SnapshotPrice : ci.PriceSnapshot, ci.Quantity));
                    }
                }
            }

            if (resolvedItems.Count == 0)
            {
                return Results.Json(new { error = "No items to checkout. Provide Items or ensure cart is not empty." }, statusCode: 400);
            }

            // Build OrderItems with pricing, validate products
            var orderItems = new List<OrderItem>();
            decimal subtotal = 0;
            decimal totalTax = 0;
            decimal totalItemDiscount = 0;
            var currency = !string.IsNullOrWhiteSpace(request.Currency) ? request.Currency.Trim() : "TRY";
            var shippingFee = request.ShippingFee ?? 0;

            foreach (var it in resolvedItems)
            {
                Guid? productId = it.ProductId;
                string productName = it.ProductName ?? "Ürün";
                decimal unitPrice = it.UnitPrice ?? 0;
                var qty = it.Quantity > 0 ? it.Quantity : 1;

                if (productId.HasValue)
                {
                    var product = await productsDb.Products.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == productId.Value, ct);
                    if (product == null)
                    {
                        return Results.Json(new { error = $"Product {productId} not found." }, statusCode: 404);
                    }
                    productName = product.Name;
                    if (unitPrice <= 0) unitPrice = product.SellingPrice;
                    if (it.VariantId.HasValue)
                    {
                        var variant = await productsDb.ProductVariants.IgnoreQueryFilters()
                            .FirstOrDefaultAsync(v => v.Id == it.VariantId.Value, ct);
                        if (variant != null) unitPrice += variant.AdditionalPrice;
                    }
                }
                else if (unitPrice <= 0)
                {
                    return Results.Json(new { error = "UnitPrice is required when ProductId is not provided." }, statusCode: 400);
                }

                var taxRate = 20m;
                var discountRate = 0m;
                var rawPrice = unitPrice * qty;
                var itemDiscount = discountRate > 0 ? rawPrice * (discountRate / 100m) : 0;
                var priceAfterDiscount = Math.Max(0, rawPrice - itemDiscount);
                var itemTax = taxRate > 0 ? priceAfterDiscount * (taxRate / 100m) : 0;
                var totalPrice = priceAfterDiscount + itemTax;

                subtotal += priceAfterDiscount;
                totalTax += itemTax;
                totalItemDiscount += itemDiscount;

                orderItems.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    OrderId = Guid.Empty, // set after orderId generated
                    ProductId = productId,
                    VariantId = it.VariantId,
                    ProductName = productName.Trim(),
                    SKU = it.Sku?.Trim(),
                    Unit = "Adet",
                    UnitPrice = unitPrice,
                    UnitCost = 0,
                    Quantity = qty,
                    TaxRate = taxRate,
                    DiscountRate = discountRate,
                    DiscountAmount = itemDiscount,
                    TaxAmount = itemTax,
                    TotalPrice = totalPrice,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Promotion evaluation — if coupon provided, call engine (preview), then apply discounts and record campaign_usages
            decimal promoDiscount = 0;
            List<AppliedPromotionDto> appliedPromos = [];
            Guid? appliedCouponId = null;
            Guid? appliedCampaignId = null;

            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                var promoItems = orderItems.Select(oi => new CartItemDto
                {
                    ProductId = oi.ProductId,
                    VariantId = oi.VariantId,
                    ProductName = oi.ProductName,
                    UnitPrice = oi.UnitPrice,
                    Quantity = oi.Quantity
                }).ToList();

                var evalReq = new CartPromotionEvaluationRequest
                {
                    Items = promoItems,
                    CustomerId = customerId,
                    CouponCode = request.CouponCode.Trim(),
                    ShippingFee = shippingFee
                };
                var evalResult = await promoEngine.EvaluateCartAsync(evalReq, ct);
                if (evalResult.IsCouponValid)
                {
                    promoDiscount = evalResult.TotalDiscountAmount;
                    appliedPromos = evalResult.AppliedPromotions;
                    var first = appliedPromos.FirstOrDefault();
                    if (first != null) appliedCampaignId = first.CampaignId;
                    // Find coupon id
                    var coupon = await promotionsDb.Coupons.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Code.ToLower() == request.CouponCode.Trim().ToLower(), ct);
                    appliedCouponId = coupon?.Id;
                    if (evalResult.IsFreeShipping) shippingFee = 0;
                }
            }

            var totalAmount = Math.Max(0, (subtotal - promoDiscount) + totalTax + shippingFee);

            // Generate order number + external_id
            var todayStr = DateTime.UtcNow.ToString("yyyyMMdd");
            var countToday = await ordersDb.Orders.IgnoreQueryFilters()
                .Where(o => o.TenantId == tenantId && o.CreatedAt >= DateTime.UtcNow.Date)
                .CountAsync(ct);
            var orderNumber = $"ORD-{todayStr}-{(countToday + 1):D4}";
            var externalId = $"EC-{tenantId.ToString()[..8]}-{Guid.NewGuid().ToString("N")[..8]}".ToUpperInvariant();
            var orderId = Guid.NewGuid();

            foreach (var oi in orderItems) oi.OrderId = orderId;

            var order = new Order
            {
                Id = orderId,
                TenantId = tenantId,
                OrderNumber = orderNumber,
                CustomerId = customerId,
                CustomerName = request.CustomerName.Trim(),
                Status = "Confirmed",
                PaymentStatus = "Unpaid",
                PaymentMethod = !string.IsNullOrWhiteSpace(request.PaymentMethod) ? request.PaymentMethod : "CreditCard",
                Currency = currency,
                Subtotal = subtotal,
                DiscountAmount = totalItemDiscount + promoDiscount,
                TaxAmount = totalTax,
                ShippingFee = shippingFee,
                TotalAmount = totalAmount,
                PaidAmount = 0,
                ShippingAddress = request.ShippingAddress?.Trim(),
                BillingAddress = request.BillingAddress?.Trim(),
                Notes = $"E-Commerce checkout (external_id={externalId}) Coupon={request.CouponCode ?? "-"}",
                OrderDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Items = orderItems
            };

            // Set VARCHAR enum source/external — use EF.Property to support both column names
            // We set via reflection-safe EF.Property setter after Add (or use entry)
            order.ExternalId = externalId;
            order.ExternalSource = "ECommerce";
            order.Source = "ECommerce";
            order.EcommerceCustomerId = customerId;
            ordersDb.Orders.Add(order);

            order.Activities.Add(new OrderActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderId = orderId,
                ActivityType = "Created",
                Title = "E-Ticaret Siparişi Oluşturuldu",
                Description = $"{orderNumber} E-Ticaret (external_id={externalId}) üzerinden {request.CustomerName} için {totalAmount:N2} {currency} tutarında oluşturuldu. Kaynak: ECommerce, Durum: Confirmed.",
                CreatedAt = DateTime.UtcNow
            });

            // Inventory deduction for Confirmed orders (Physical products)
            foreach (var oi in orderItems.Where(i => i.ProductId.HasValue))
            {
                var prod = await productsDb.Products.IgnoreQueryFilters()
                    .Include(p => p.Variants)
                    .FirstOrDefaultAsync(p => p.Id == oi.ProductId!.Value && p.TenantId == tenantId, ct);
                if (prod != null && prod.TrackInventory && prod.Type == "Physical")
                {
                    var prevStock = prod.CurrentStock;
                    var newStock = Math.Max(0, prevStock - oi.Quantity);
                    prod.CurrentStock = newStock;
                    prod.UpdatedAt = DateTime.UtcNow;
                    if (oi.VariantId.HasValue)
                    {
                        var variant = prod.Variants.FirstOrDefault(v => v.Id == oi.VariantId.Value);
                        if (variant != null)
                        {
                            variant.StockQuantity = Math.Max(0, variant.StockQuantity - oi.Quantity);
                            variant.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    productsDb.ProductStockMovements.Add(new ProductStockMovement
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        ProductId = prod.Id,
                        VariantId = oi.VariantId,
                        MovementType = "Out",
                        Quantity = oi.Quantity,
                        PreviousStock = prevStock,
                        NewStock = newStock,
                        UnitCost = oi.UnitCost,
                        ReferenceNumber = orderNumber,
                        Reason = $"E-Ticaret Siparişi ({orderNumber})",
                        Notes = $"Müşteri: {request.CustomerName} external_id={externalId}",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            await productsDb.SaveChangesAsync(ct);

            // Save order first to get Id for usages/shipment
            await ordersDb.SaveChangesAsync(ct);

            // Write campaign_usages if promotion applied
            if (appliedCampaignId.HasValue && promoDiscount > 0)
            {
                var usage = new CampaignUsage
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CampaignId = appliedCampaignId.Value,
                    CouponId = appliedCouponId,
                    OrderId = orderId,
                    CustomerId = customerId,
                    DiscountAmount = promoDiscount,
                    OrderTotalBefore = subtotal + totalTax + shippingFee,
                    OrderTotalAfter = totalAmount,
                    UsedAt = DateTime.UtcNow
                };
                promotionsDb.CampaignUsages.Add(usage);

                // Increment coupon UsedCount and campaign CurrentUsageCount
                if (appliedCouponId.HasValue)
                {
                    var coupon = await promotionsDb.Coupons.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == appliedCouponId.Value, ct);
                    if (coupon != null) coupon.UsedCount += 1;
                }
                var campaign = await promotionsDb.Campaigns.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == appliedCampaignId.Value, ct);
                if (campaign != null) campaign.CurrentUsageCount += 1;

                await promotionsDb.SaveChangesAsync(ct);
            }

            // Create placeholder shipment
            try
            {
                var shipment = new Shipment
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ShipmentNumber = $"SHP-{todayStr}-{(countToday + 1):D4}",
                    OrderId = orderId,
                    OrderNumber = orderNumber,
                    CustomerId = customerId,
                    CustomerName = request.CustomerName.Trim(),
                    Status = "Preparing",
                    Type = "Outbound",
                    RecipientName = request.CustomerName.Trim(),
                    RecipientAddress = request.ShippingAddress ?? request.BillingAddress ?? "-",
                    ShippingCost = shippingFee,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                shippingDb.Shipments.Add(shipment);
                await shippingDb.SaveChangesAsync(ct);
            }
            catch
            {
                // Shipment is placeholder — don't fail order creation if shipping module unavailable
            }

            // Clear cart after successful checkout
            try
            {
                var guestToken = request.GuestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();
                var cart = await FindCartAsync(integrationsDb, tenantId, customerId, guestToken, ct);
                if (cart != null)
                {
                    var cartItems = await integrationsDb.CartItems.IgnoreQueryFilters().Where(ci => ci.CartId == cart.Id).ToListAsync(ct);
                    integrationsDb.CartItems.RemoveRange(cartItems);
                    await integrationsDb.SaveChangesAsync(ct);
                }
            }
            catch { }

            return Results.Ok(ApiResponse<object>.Ok(new { orderId, orderNumber, externalId, totalAmount, currency }));
        })
        .AllowAnonymous()
        .WithName("CreatePublicOrder")
        .WithTags("Public Orders");

        // GET /api/public/orders/mine?tenantSlug&page&pageSize&poll=true (30s polling fallback for Realtime)
        app.MapGet("/api/public/orders/mine", async (
            HttpContext httpContext,
            int? page,
            int? pageSize,
            bool? poll,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            OrdersDbContext ordersDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var authUserId = TryResolveAuthUserId(httpContext);
            var guestToken = httpContext.Request.Query["guest_token"].FirstOrDefault() ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();

            // Resolve customerId for auth users; for guests, filter by external_id? For now return by CustomerId or empty
            Guid? customerId = null;
            if (authUserId.HasValue)
            {
                var customersDb = httpContext.RequestServices.GetService(typeof(CustomersDbContext)) as CustomersDbContext;
                if (customersDb != null)
                {
                    var cust = await customersDb.Customers.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.AuthUserId == authUserId.Value, ct);
                    customerId = cust?.Id;
                }
            }

            // If neither customerId nor guestToken, return 401
            if (customerId == null && string.IsNullOrWhiteSpace(guestToken))
            {
                // Allow returning empty for unauthenticated? Spec says tenant isolation enforced via auth_user_id or guest_token
                return Results.Json(new { error = "Authentication required: provide Authorization Bearer or guest_token." }, statusCode: 401);
            }

            var pg = page is > 0 ? page.Value : 1;
            var ps = pageSize is > 0 and <= 50 ? pageSize.Value : 20;

            var query = ordersDb.Orders.IgnoreQueryFilters()
                .Where(o => o.TenantId == tenantId);

            if (customerId.HasValue)
            {
                query = query.Where(o => o.CustomerId == customerId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(guestToken))
            {
                // For guest orders, we stored no direct guest_token link; fallback: orders without CustomerId and recent
                // We check Notes contains guestToken or external_id pattern? Simplified: return orders with CustomerId == null
                query = query.Where(o => o.CustomerId == null);
            }

            // Polling fallback: when ?poll=true, disable caching (Realtime fallback 30s interval)
            if (poll == true || string.Equals(httpContext.Request.Query["poll"].FirstOrDefault(), "true", StringComparison.OrdinalIgnoreCase))
            {
                httpContext.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
                httpContext.Response.Headers.Pragma = "no-cache";
            }

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((pg - 1) * ps)
                .Take(ps)
                .Include(o => o.Items)
                .Select(o => new PublicOrderDto(
                    o.Id,
                    o.OrderNumber,
                    o.Status,
                    o.PaymentStatus,
                    o.TotalAmount,
                    o.Subtotal,
                    o.DiscountAmount,
                    o.ShippingFee,
                    o.ExternalId,
                    o.Source ?? o.ExternalSource ?? "Manual",
                    o.CreatedAt,
                    o.Items.Select(i => new PublicOrderItemDto(i.Id, i.ProductId, i.ProductName, i.UnitPrice, i.Quantity, i.TotalPrice)).ToList()
                ))
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<object>.Ok(new { items, totalCount = total, page = pg, pageSize = ps }));
        })
        .AllowAnonymous()
        .WithName("GetPublicOrdersMine")
        .WithTags("Public Orders");

        // GET /api/public/orders/{id}/tracking?tenantSlug
        app.MapGet("/api/public/orders/{id:guid}/tracking", async (
            HttpContext httpContext,
            Guid id,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            OrdersDbContext ordersDb,
            ShippingDbContext shippingDb,
            CustomersDbContext customersDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var authUserId = TryResolveAuthUserId(httpContext);
            var guestToken = httpContext.Request.Query["guest_token"].FirstOrDefault();

            var order = await ordersDb.Orders.IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Id == id && o.TenantId == tenantId, ct);
            if (order == null) return Results.Json(new { error = "Order not found." }, statusCode: 404);

            // Ownership check: must be customer's order or guest order
            if (authUserId.HasValue)
            {
                var cust = await customersDb.Customers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.AuthUserId == authUserId.Value, ct);
                if (cust != null && order.CustomerId != cust.Id)
                {
                    return Results.Json(new { error = "Forbidden — order does not belong to authenticated user." }, statusCode: 403);
                }
            }
            else if (!string.IsNullOrWhiteSpace(guestToken))
            {
                // Guest ownership: order must have no customer or externalId linked? Allow if order.CustomerId == null
                if (order.CustomerId != null)
                {
                    return Results.Json(new { error = "Forbidden — guest token does not match order owner." }, statusCode: 403);
                }
            }
            else
            {
                return Results.Json(new { error = "Authentication required for tracking." }, statusCode: 401);
            }

            var shipments = await shippingDb.Shipments.IgnoreQueryFilters()
                .Where(s => s.TenantId == tenantId && s.OrderId == id)
                .Include(s => s.StatusHistories)
                .ToListAsync(ct);

            var result = shipments.Select(s => new ShipmentTrackingDto(
                s.Id,
                s.ShipmentNumber,
                s.Status,
                s.TrackingNumber,
                s.CarrierName,
                s.TrackingUrl,
                s.StatusHistories.OrderBy(h => h.CreatedAt).Select(h => new ShipmentStatusHistoryDto(h.Status, h.Location, h.Description, h.CreatedAt)).ToList()
            )).ToList();

            // Fallback: if no shipment, return order tracking fields
            if (result.Count == 0)
            {
                result.Add(new ShipmentTrackingDto(
                    Guid.Empty,
                    order.OrderNumber,
                    order.Status == "Confirmed" ? "Preparing" : order.Status,
                    order.TrackingNumber,
                    order.Carrier,
                    null,
                    []));

            }

            return Results.Ok(ApiResponse<List<ShipmentTrackingDto>>.Ok(result));
        })
        .AllowAnonymous()
        .WithName("GetPublicOrderTracking")
        .WithTags("Public Orders");
    }

    private static Guid? TryResolveAuthUserId(HttpContext ctx)
    {
        if (ctx.Items.TryGetValue("auth_user_id", out var v) && v is Guid g) return g;

        if (ctx.Request.Headers.TryGetValue("X-Customer-Id", out var cid) && Guid.TryParse(cid.ToString(), out var parsedCid))
        {
            // X-Customer-Id is customer Id, not auth user id — but we treat as fallback for ownership check
            // Store as hint; actual mapping will use CustomersDb
            ctx.Items["customer_id_hint"] = parsedCid;
        }

        var auth = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth["Bearer ".Length..].Trim();
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(token);
                var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "user_id" || c.Type == "id" || c.Type == "sub")?.Value;
                if (Guid.TryParse(sub, out var userId))
                {
                    ctx.Items["auth_user_id"] = userId;
                    return userId;
                }
            }
            catch { }
        }

        if (ctx.Request.Headers.TryGetValue("X-Auth-User-Id", out var au) && Guid.TryParse(au.ToString(), out var auId))
        {
            ctx.Items["auth_user_id"] = auId;
            return auId;
        }

        return null;
    }

    private static async Task<CRM.Modules.Integrations.Entities.Cart?> FindCartAsync(
        IntegrationsDbContext db, Guid tenantId, Guid? customerId, string? guestToken, CancellationToken ct)
    {
        if (customerId.HasValue)
        {
            var c = await db.Carts.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.TenantId == tenantId && x.CustomerId == customerId.Value, ct);
            if (c != null) return c;
        }
        if (!string.IsNullOrWhiteSpace(guestToken))
        {
            return await db.Carts.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.TenantId == tenantId && x.GuestToken == guestToken, ct);
        }
        return null;
    }
}
