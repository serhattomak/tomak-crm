using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Products.GetProducts;

public record ProductListDto(
    Guid Id,
    Guid TenantId,
    Guid? CategoryId,
    string? CategoryName,
    string Type,
    string Name,
    string? SKU,
    string? Barcode,
    string? Brand,
    string Unit,
    decimal CostPrice,
    decimal SellingPrice,
    string Currency,
    decimal TaxRate,
    decimal DiscountRate,
    bool TrackInventory,
    decimal CurrentStock,
    decimal ReservedStock,
    decimal AvailableStock,
    decimal MinStockLevel,
    bool IsLowStock,
    decimal ProfitMargin,
    string Status,
    string[]? Images,
    string[]? Tags,
    int VariantsCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? Slug,
    string? SeoTitle,
    bool IsPublished,
    bool IsFeatured,
    int SortOrder,
    decimal? WeightKg);

public record PagedProductsResponse(
    List<ProductListDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record GetProductsQuery(
    string? Type = null,
    Guid? CategoryId = null,
    string? Status = null,
    string? StockStatus = null, // "in_stock", "low_stock", "out_of_stock"
    string? Search = null,
    int Page = 1,
    int PageSize = 50,
    bool? IsPublished = null) : IQuery<PagedProductsResponse>;

public class GetProductsHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetProductsQuery, PagedProductsResponse>
{
    public async Task<Result<PagedProductsResponse>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var query = dbContext.Products
            .Where(p => p.TenantId == tenantId)
            .Include(p => p.Category)
                .ThenInclude(c => c!.Parent)
            .Include(p => p.Variants)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Type))
        {
            query = query.Where(p => p.Type == request.Type);
        }

        if (request.CategoryId.HasValue)
        {
            var targetId = request.CategoryId.Value;
            var relatedCategoryIds = await dbContext.ProductCategories
                .Where(c => c.TenantId == tenantId && (c.Id == targetId || c.ParentId == targetId))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken);

            query = query.Where(p => p.CategoryId.HasValue && relatedCategoryIds.Contains(p.CategoryId.Value));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(p => p.Status == request.Status);
        }

        if (request.IsPublished.HasValue)
        {
            query = query.Where(p => p.IsPublished == request.IsPublished.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.StockStatus))
        {
            switch (request.StockStatus)
            {
                case "in_stock":
                    query = query.Where(p => !p.TrackInventory || (p.CurrentStock - p.ReservedStock) > p.MinStockLevel);
                    break;
                case "low_stock":
                    query = query.Where(p => p.TrackInventory && p.Type == "Physical" && (p.CurrentStock - p.ReservedStock) <= p.MinStockLevel && (p.CurrentStock - p.ReservedStock) > 0);
                    break;
                case "out_of_stock":
                    query = query.Where(p => p.TrackInventory && p.Type == "Physical" && (p.CurrentStock - p.ReservedStock) <= 0);
                    break;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(search) ||
                (p.SKU != null && p.SKU.ToLower().Contains(search)) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(search)) ||
                (p.Brand != null && p.Brand.ToLower().Contains(search)) ||
                (p.Slug != null && p.Slug.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 200 ? request.PageSize : 50;

        var items = await query
            .OrderBy(p => p.SortOrder)
            .ThenByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductListDto(
                p.Id,
                p.TenantId,
                p.CategoryId,
                p.Category != null ? (p.Category.Parent != null ? p.Category.Parent.Name + " > " + p.Category.Name : p.Category.Name) : null,
                p.Type,
                p.Name,
                p.SKU,
                p.Barcode,
                p.Brand,
                p.Unit,
                p.CostPrice,
                p.SellingPrice,
                p.Currency,
                p.TaxRate,
                p.DiscountRate,
                p.TrackInventory,
                p.CurrentStock,
                p.ReservedStock,
                p.CurrentStock - p.ReservedStock,
                p.MinStockLevel,
                p.TrackInventory && p.Type == "Physical" && (p.CurrentStock - p.ReservedStock) <= p.MinStockLevel,
                p.SellingPrice > 0 ? ((p.SellingPrice - p.CostPrice) / p.SellingPrice) * 100 : 0,
                p.Status,
                p.Images,
                p.Tags,
                p.Variants.Count,
                p.CreatedAt,
                p.UpdatedAt,
                p.Slug,
                p.SeoTitle,
                p.IsPublished,
                p.IsFeatured,
                p.SortOrder,
                p.WeightKg))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedProductsResponse(items, totalCount, page, pageSize));
    }
}

public class GetProductsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/products", async (
            string? type,
            Guid? categoryId,
            string? status,
            string? stockStatus,
            string? search,
            int? page,
            int? pageSize,
            bool? isPublished,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProductsQuery(
                type,
                categoryId,
                status,
                stockStatus,
                search,
                page ?? 1,
                pageSize ?? 50,
                isPublished), ct);

            return Results.Ok(ApiResponse<PagedProductsResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.View")
        .WithName("GetProducts")
        .WithTags("Products");
    }
}
