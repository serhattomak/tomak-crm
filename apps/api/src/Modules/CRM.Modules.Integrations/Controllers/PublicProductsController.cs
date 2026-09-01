using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Integrations.Services;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Integrations.Controllers;

public record PublicProductVariantDto(
    Guid Id,
    string Name,
    string? Sku,
    string? Barcode,
    decimal AdditionalPrice,
    decimal Price,
    decimal Stock,
    string? ImageUrl,
    bool IsActive);

public record PublicProductDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Slug,
    string? Brand,
    string Type,
    decimal Price,
    decimal CostPrice,
    string Currency,
    decimal TaxRate,
    decimal Stock,
    string Status,
    bool IsPublished,
    bool IsFeatured,
    string? ImageUrl,
    string[]? Tags,
    string? Description,
    Guid? CategoryId,
    string? CategoryName,
    decimal? Weight,
    List<PublicProductVariantDto>? Variants);

public record PublicProductsResponse(
    List<PublicProductDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public class PublicProductsController : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/public/products", async (
            HttpContext httpContext,
            string? tenantSlug,
            string? q,
            string? category,
            int? page,
            int? pageSize,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            ProductsDbContext productsDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var pg = page is > 0 ? page.Value : 1;
            var ps = pageSize is > 0 and <= 100 ? pageSize.Value : 20;

            // Only is_published == true — use IgnoreQueryFilters + explicit tenant filter
            var query = productsDb.Products
                .IgnoreQueryFilters()
                .Where(p => p.TenantId == tenantId && p.IsPublished)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var search = q.Trim().ToLower();
                query = query.Where(p =>
                    p.Name.ToLower().Contains(search) ||
                    (p.SKU != null && p.SKU.ToLower().Contains(search)) ||
                    (p.Brand != null && p.Brand.ToLower().Contains(search)) ||
                    (p.Slug != null && p.Slug.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                var cat = category.Trim().ToLower();
                query = query.Where(p => p.Category != null && p.Category.Slug.ToLower() == cat);
            }

            var total = await query.CountAsync(ct);

            var items = await query
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .OrderBy(p => p.SortOrder)
                .ThenBy(p => p.Name)
                .Skip((pg - 1) * ps)
                .Take(ps)
                .Select(p => new PublicProductDto(
                    p.Id,
                    p.TenantId,
                    p.Name,
                    p.Slug,
                    p.Brand,
                    p.Type,
                    p.SellingPrice,
                    p.CostPrice,
                    p.Currency,
                    p.TaxRate,
                    p.CurrentStock - p.ReservedStock,
                    p.Status,
                    p.IsPublished,
                    p.IsFeatured,
                    p.Images != null && p.Images.Length > 0 ? p.Images[0] : null,
                    p.Tags,
                    p.Description,
                    p.CategoryId,
                    p.Category != null ? p.Category.Name : null,
                    p.WeightKg ?? p.Weight,
                    p.Variants
                        .Where(v => v.IsActive)
                        .Select(v => new PublicProductVariantDto(
                            v.Id,
                            v.Name,
                            v.SKU,
                            v.Barcode,
                            v.AdditionalPrice,
                            p.SellingPrice + v.AdditionalPrice,
                            v.StockQuantity,
                            p.Images != null && p.Images.Length > 0 ? p.Images[0] : null,
                            v.IsActive
                        )).ToList()
                ))
                .ToListAsync(ct);

            httpContext.Response.Headers.CacheControl = "public, max-age=60";
            httpContext.Response.Headers["X-Cache-TTL"] = "60";

            return Results.Ok(ApiResponse<PublicProductsResponse>.Ok(
                new PublicProductsResponse(items, total, pg, ps)));
        })
        .AllowAnonymous()
        .WithName("GetPublicProducts")
        .WithTags("Public Products");

        // GET /api/public/storefront?tenantSlug=xxx — lightweight tenant store config (ecommerce_enabled)
        app.MapGet("/api/public/storefront", async (
            HttpContext httpContext,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            var slug = PublicApiGuardHelper.GetTenantSlug(httpContext);

            // For now, ecommerce is enabled if tenant exists (tenant_modules check is optional). Return true to avoid 404 blocking shop.
            // If tenant_modules table has ecommerce_enabled, we could query it, but fallback to true.
            return Results.Ok(ApiResponse<object>.Ok(new
            {
                tenantId,
                tenantSlug = slug,
                ecommerceEnabled = true,
                storeTheme = "default"
            }));
        })
        .AllowAnonymous()
        .WithName("GetPublicStorefront")
        .WithTags("Public Storefront");

        app.MapGet("/api/public/products/{slug}", async (
            HttpContext httpContext,
            string slug,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            ProductsDbContext productsDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var product = await productsDb.Products
                .IgnoreQueryFilters()
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Where(p => p.TenantId == tenantId && p.Slug == slug && p.IsPublished)
                .Select(p => new PublicProductDto(
                    p.Id,
                    p.TenantId,
                    p.Name,
                    p.Slug,
                    p.Brand,
                    p.Type,
                    p.SellingPrice,
                    p.CostPrice,
                    p.Currency,
                    p.TaxRate,
                    p.CurrentStock - p.ReservedStock,
                    p.Status,
                    p.IsPublished,
                    p.IsFeatured,
                    p.Images != null && p.Images.Length > 0 ? p.Images[0] : null,
                    p.Tags,
                    p.Description,
                    p.CategoryId,
                    p.Category != null ? p.Category.Name : null,
                    p.WeightKg ?? p.Weight,
                    p.Variants
                        .Where(v => v.IsActive)
                        .Select(v => new PublicProductVariantDto(
                            v.Id,
                            v.Name,
                            v.SKU,
                            v.Barcode,
                            v.AdditionalPrice,
                            p.SellingPrice + v.AdditionalPrice,
                            v.StockQuantity,
                            p.Images != null && p.Images.Length > 0 ? p.Images[0] : null,
                            v.IsActive
                        )).ToList()
                ))
                .FirstOrDefaultAsync(ct);

            if (product == null)
            {
                return Results.Json(new { error = "Product not found." }, statusCode: 404);
            }

            httpContext.Response.Headers.CacheControl = "public, max-age=60";
            return Results.Ok(ApiResponse<PublicProductDto>.Ok(product));
        })
        .AllowAnonymous()
        .WithName("GetPublicProductBySlug")
        .WithTags("Public Products");
    }
}
