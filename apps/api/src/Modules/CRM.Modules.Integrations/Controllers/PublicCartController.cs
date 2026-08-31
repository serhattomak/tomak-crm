using System.IdentityModel.Tokens.Jwt;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Integrations.Data;
using CRM.Modules.Integrations.Entities;
using CRM.Modules.Integrations.Services;
using CRM.Modules.Products.Data;
using CRM.Modules.Promotions.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CRM.Modules.Integrations.Controllers;

// ── DTOs ──
public record AddToCartRequest(
    Guid ProductId,
    Guid? VariantId,
    int Quantity,
    string? GuestToken);

public record MergeCartRequest(string GuestToken);

public record CartItemDto2(
    Guid Id,
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string? Sku,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal,
    string Currency,
    string? Image);

public record CartResponse(
    Guid CartId,
    Guid TenantId,
    Guid? CustomerId,
    string? GuestToken,
    List<CartItemDto2> Items,
    decimal Subtotal,
    int TotalQuantity,
    DateTime ExpiresAt);

public record EvaluateCartRequest(
    string? CouponCode,
    string? GuestToken,
    decimal? ShippingFee);

public class PublicCartController : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // GET /api/public/cart?tenantSlug&guestToken
        app.MapGet("/api/public/cart", async (
            HttpContext httpContext,
            string? guestToken,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            ProductsDbContext productsDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var customerId = TryResolveCustomerId(httpContext);
            var resolvedGuestToken = guestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();

            var cart = await FindOrCreateCartAsync(integrationsDb, tenantId, customerId, resolvedGuestToken, createIfMissing: false, ct);
            if (cart == null)
            {
                return Results.Ok(ApiResponse<CartResponse>.Ok(new CartResponse(Guid.Empty, tenantId, customerId, resolvedGuestToken, [], 0, 0, DateTime.UtcNow.AddDays(7))));
            }

            var response = await BuildCartResponseAsync(integrationsDb, productsDb, cart, ct);
            return Results.Ok(ApiResponse<CartResponse>.Ok(response));
        })
        .AllowAnonymous()
        .WithName("GetPublicCart")
        .WithTags("Public Cart");

        // POST /api/public/cart — upsert cart_items
        app.MapPost("/api/public/cart", async (
            HttpContext httpContext,
            AddToCartRequest request,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            ProductsDbContext productsDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            if (request.ProductId == Guid.Empty) return Results.Json(new { error = "ProductId is required." }, statusCode: 400);
            if (request.Quantity <= 0) return Results.Json(new { error = "Quantity must be > 0." }, statusCode: 400);

            var customerId = TryResolveCustomerId(httpContext);
            var guestToken = request.GuestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();

            if (customerId == null && string.IsNullOrWhiteSpace(guestToken))
            {
                guestToken = Guid.NewGuid().ToString("N");
            }

            // Validate product is published and belongs to tenant
            var product = await productsDb.Products
                .IgnoreQueryFilters()
                .Where(p => p.TenantId == tenantId && p.Id == request.ProductId)
                .FirstOrDefaultAsync(ct);

            if (product == null)
            {
                return Results.Json(new { error = "Product not found." }, statusCode: 404);
            }

            if (!product.IsPublished)
            {
                return Results.Json(new { error = "Product is not published." }, statusCode: 400);
            }

            decimal unitPrice = product.SellingPrice;
            if (request.VariantId.HasValue)
            {
                var variant = await productsDb.ProductVariants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(v => v.Id == request.VariantId.Value && v.TenantId == tenantId, ct);
                if (variant != null)
                {
                    unitPrice += variant.AdditionalPrice;
                }
            }

            var cart = await FindOrCreateCartAsync(integrationsDb, tenantId, customerId, guestToken, createIfMissing: true, ct);
            if (cart == null) return Results.Json(new { error = "Unable to create cart." }, statusCode: 500);

            var existingItem = await integrationsDb.CartItems
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(ci => ci.CartId == cart.Id && ci.ProductId == request.ProductId && ci.VariantId == request.VariantId, ct);

            if (existingItem != null)
            {
                existingItem.Quantity += request.Quantity;
                existingItem.PriceSnapshot = unitPrice;
                existingItem.SnapshotPrice = unitPrice;
                existingItem.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var item = new CartItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CartId = cart.Id,
                    ProductId = request.ProductId,
                    VariantId = request.VariantId,
                    Quantity = request.Quantity,
                    PriceSnapshot = unitPrice,
                    SnapshotPrice = unitPrice,
                    SnapshotName = product.Name,
                    Currency = product.Currency,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                integrationsDb.CartItems.Add(item);
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await integrationsDb.SaveChangesAsync(ct);

            var response = await BuildCartResponseAsync(integrationsDb, productsDb, cart, ct);
            return Results.Ok(ApiResponse<CartResponse>.Ok(response));
        })
        .AllowAnonymous()
        .WithName("AddToPublicCart")
        .WithTags("Public Cart");

        // DELETE /api/public/cart/items/{itemId}
        app.MapDelete("/api/public/cart/items/{itemId:guid}", async (
            HttpContext httpContext,
            Guid itemId,
            string? guestToken,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            ProductsDbContext productsDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var customerId = TryResolveCustomerId(httpContext);
            var resolvedGuestToken = guestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();

            var cart = await FindOrCreateCartAsync(integrationsDb, tenantId, customerId, resolvedGuestToken, createIfMissing: false, ct);
            if (cart == null) return Results.Json(new { error = "Cart not found." }, statusCode: 404);

            var item = await integrationsDb.CartItems.IgnoreQueryFilters()
                .FirstOrDefaultAsync(ci => ci.Id == itemId && ci.CartId == cart.Id, ct);
            if (item == null) return Results.Json(new { error = "Item not found." }, statusCode: 404);

            integrationsDb.CartItems.Remove(item);
            await integrationsDb.SaveChangesAsync(ct);

            var response = await BuildCartResponseAsync(integrationsDb, productsDb, cart, ct);
            return Results.Ok(ApiResponse<CartResponse>.Ok(response));
        })
        .AllowAnonymous()
        .WithName("RemoveFromPublicCart")
        .WithTags("Public Cart");

        // POST /api/public/cart/merge
        app.MapPost("/api/public/cart/merge", async (
            HttpContext httpContext,
            MergeCartRequest request,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            ProductsDbContext productsDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var customerId = TryResolveCustomerId(httpContext);
            if (customerId == null)
            {
                return Results.Json(new { error = "Authenticated customer required for merge." }, statusCode: 401);
            }

            if (string.IsNullOrWhiteSpace(request.GuestToken))
            {
                return Results.Json(new { error = "GuestToken is required." }, statusCode: 400);
            }

            var guestCart = await integrationsDb.Carts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.GuestToken == request.GuestToken, ct);
            if (guestCart == null)
            {
                return Results.Json(new { error = "Guest cart not found." }, statusCode: 404);
            }

            var customerCart = await FindOrCreateCartAsync(integrationsDb, tenantId, customerId, null, createIfMissing: true, ct);
            if (customerCart == null) return Results.Json(new { error = "Unable to resolve customer cart." }, statusCode: 500);

            if (guestCart.Id == customerCart.Id) return Results.Ok(ApiResponse<CartResponse>.Ok(await BuildCartResponseAsync(integrationsDb, productsDb, customerCart, ct)));

            var guestItems = await integrationsDb.CartItems.IgnoreQueryFilters()
                .Where(ci => ci.CartId == guestCart.Id).ToListAsync(ct);

            foreach (var gi in guestItems)
            {
                var existing = await integrationsDb.CartItems.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(ci => ci.CartId == customerCart.Id && ci.ProductId == gi.ProductId && ci.VariantId == gi.VariantId, ct);
                if (existing != null)
                {
                    existing.Quantity += gi.Quantity;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var cloned = new CartItem
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        CartId = customerCart.Id,
                        ProductId = gi.ProductId,
                        VariantId = gi.VariantId,
                        Quantity = gi.Quantity,
                        PriceSnapshot = gi.PriceSnapshot,
                        SnapshotPrice = gi.SnapshotPrice,
                        SnapshotName = gi.SnapshotName,
                        Currency = gi.Currency,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    integrationsDb.CartItems.Add(cloned);
                }
            }

            // Remove guest cart after merge
            integrationsDb.Carts.Remove(guestCart);
            await integrationsDb.SaveChangesAsync(ct);

            var response = await BuildCartResponseAsync(integrationsDb, productsDb, customerCart, ct);
            return Results.Ok(ApiResponse<CartResponse>.Ok(response));
        })
        .AllowAnonymous()
        .WithName("MergePublicCart")
        .WithTags("Public Cart");

        // POST /api/public/cart/evaluate — promotion preview without writing campaign_usages
        app.MapPost("/api/public/cart/evaluate", async (
            HttpContext httpContext,
            EvaluateCartRequest request,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            ProductsDbContext productsDb,
            IPromotionCalculationEngine promoEngine,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var customerId = TryResolveCustomerId(httpContext);
            var guestToken = request.GuestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();

            // Build cart items from current cart (or empty)
            var cart = await FindOrCreateCartAsync(integrationsDb, tenantId, customerId, guestToken, createIfMissing: false, ct);
            var cartItems = cart != null
                ? await integrationsDb.CartItems.IgnoreQueryFilters().Where(ci => ci.CartId == cart.Id).ToListAsync(ct)
                : new List<CartItem>();

            var promoItems = new List<CartItemDto>();
            foreach (var ci in cartItems)
            {
                var product = await productsDb.Products.IgnoreQueryFilters().AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == ci.ProductId, ct);
                promoItems.Add(new CartItemDto
                {
                    ProductId = ci.ProductId,
                    VariantId = ci.VariantId,
                    CategoryId = product?.CategoryId,
                    Brand = product?.Brand,
                    ProductName = ci.SnapshotName ?? product?.Name ?? "Ürün",
                    UnitPrice = ci.SnapshotPrice > 0 ? ci.SnapshotPrice : ci.PriceSnapshot,
                    Quantity = ci.Quantity
                });
            }

            var evalReq = new CartPromotionEvaluationRequest
            {
                Items = promoItems,
                CustomerId = customerId,
                CouponCode = request.CouponCode,
                ShippingFee = request.ShippingFee ?? 0
            };

            var result = await promoEngine.EvaluateCartAsync(evalReq, ct);
            // Do NOT write campaign_usages here — preview only
            return Results.Ok(ApiResponse<CartPromotionEvaluationResult>.Ok(result));
        })
        .AllowAnonymous()
        .WithName("EvaluatePublicCart")
        .WithTags("Public Cart");
    }

    private static Guid? TryResolveCustomerId(HttpContext ctx)
    {
        // Try Authorization Bearer JWT sub claim -> map to customers.auth_user_id via direct DB? For now extract GUID from JWT.
        // Fallback: header X-Customer-Id
        if (ctx.Request.Headers.TryGetValue("X-Customer-Id", out var cid) && Guid.TryParse(cid.ToString(), out var parsedCid))
        {
            return parsedCid;
        }

        var auth = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth["Bearer ".Length..].Trim();
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(token);
                var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "user_id" || c.Type == "id")?.Value;
                if (Guid.TryParse(sub, out var userId))
                {
                    // Need to map auth_user_id -> customer Id. We store in HttpContext for later DB lookup.
                    // Try cache lookup via configuration connection; simplified: use userId as customerId hint if mapping fails — caller can also send X-Customer-Id.
                    // Real mapping happens in Orders controller via CustomersDbContext; here we just return userId and let Order creation resolve correctly.
                    // For cart, we keep customerId as userId temporarily; merge will fix.
                    ctx.Items["auth_user_id"] = userId;
                    return userId;
                }
            }
            catch
            {
                // Invalid token — ignore
            }
        }

        // Also check X-Auth-User-Id header for/testing
        if (ctx.Request.Headers.TryGetValue("X-Auth-User-Id", out var au) && Guid.TryParse(au.ToString(), out var auId))
        {
            ctx.Items["auth_user_id"] = auId;
            return auId;
        }

        if (ctx.Items.TryGetValue("auth_user_id", out var v) && v is Guid g) return g;
        return null;
    }

    private static async Task<Cart?> FindOrCreateCartAsync(
        IntegrationsDbContext db,
        Guid tenantId,
        Guid? customerId,
        string? guestToken,
        bool createIfMissing,
        CancellationToken ct)
    {
        Cart? cart = null;

        if (customerId.HasValue)
        {
            cart = await db.Carts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.CustomerId == customerId.Value, ct);
        }

        if (cart == null && !string.IsNullOrWhiteSpace(guestToken))
        {
            cart = await db.Carts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.GuestToken == guestToken, ct);
        }

        if (cart == null && createIfMissing)
        {
            cart = new Cart
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CustomerId = customerId,
                GuestToken = customerId.HasValue ? null : guestToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Carts.Add(cart);
            await db.SaveChangesAsync(ct);
        }

        return cart;
    }

    private static async Task<CartResponse> BuildCartResponseAsync(
        IntegrationsDbContext db,
        ProductsDbContext productsDb,
        Cart cart,
        CancellationToken ct)
    {
        var items = await db.CartItems.IgnoreQueryFilters()
            .Where(ci => ci.CartId == cart.Id)
            .ToListAsync(ct);

        var dtos = new List<CartItemDto2>();
        decimal subtotal = 0;
        int totalQty = 0;

        foreach (var ci in items)
        {
            var product = await productsDb.Products.IgnoreQueryFilters().AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == ci.ProductId, ct);
            var unitPrice = ci.SnapshotPrice > 0 ? ci.SnapshotPrice : ci.PriceSnapshot;
            if (unitPrice == 0 && product != null) unitPrice = product.SellingPrice;
            var line = unitPrice * ci.Quantity;
            subtotal += line;
            totalQty += ci.Quantity;
            dtos.Add(new CartItemDto2(
                ci.Id,
                ci.ProductId,
                ci.VariantId,
                ci.SnapshotName ?? product?.Name ?? "Ürün",
                product?.SKU,
                ci.Quantity,
                unitPrice,
                line,
                ci.Currency,
                product?.Images?.FirstOrDefault()));
        }

        return new CartResponse(cart.Id, cart.TenantId, cart.CustomerId, cart.GuestToken, dtos, subtotal, totalQty, cart.ExpiresAt);
    }
}
