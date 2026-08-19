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

namespace CRM.Modules.Products.Features.Products.GetProductById;

public record ProductVariantDetailDto(
    Guid Id,
    Guid ProductId,
    string Name,
    string? SKU,
    string? Barcode,
    decimal AdditionalPrice,
    decimal StockQuantity,
    string? Attributes,
    bool IsActive,
    DateTime CreatedAt);

public record ProductStockMovementDto(
    Guid Id,
    Guid ProductId,
    Guid? VariantId,
    string? VariantName,
    string MovementType,
    decimal Quantity,
    decimal PreviousStock,
    decimal NewStock,
    decimal? UnitCost,
    string? ReferenceNumber,
    string? Reason,
    string? Notes,
    Guid? PerformedByUserId,
    DateTime CreatedAt);

public record ProductDetailDto(
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
    string? Attributes,
    string? Description,
    List<ProductVariantDetailDto> Variants,
    List<ProductStockMovementDto> StockMovements,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GetProductByIdQuery(Guid Id) : IQuery<ProductDetailDto>;

public class GetProductByIdHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetProductByIdQuery, ProductDetailDto>
{
    public async Task<Result<ProductDetailDto>> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var product = await dbContext.Products
            .Where(p => p.Id == request.Id && p.TenantId == currentTenant.Id.Value)
            .Include(p => p.Category)
                .ThenInclude(c => c!.Parent)
            .Include(p => p.Variants)
            .Include(p => p.StockMovements)
                .ThenInclude(s => s.Variant)
            .FirstOrDefaultAsync(cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product '{request.Id}' not found.");
        }

        var variantsDto = product.Variants
            .OrderBy(v => v.Name)
            .Select(v => new ProductVariantDetailDto(
                v.Id,
                v.ProductId,
                v.Name,
                v.SKU,
                v.Barcode,
                v.AdditionalPrice,
                v.StockQuantity,
                v.Attributes,
                v.IsActive,
                v.CreatedAt))
            .ToList();

        var stockMovementsDto = product.StockMovements
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new ProductStockMovementDto(
                s.Id,
                s.ProductId,
                s.VariantId,
                s.Variant != null ? s.Variant.Name : null,
                s.MovementType,
                s.Quantity,
                s.PreviousStock,
                s.NewStock,
                s.UnitCost,
                s.ReferenceNumber,
                s.Reason,
                s.Notes,
                s.PerformedByUserId,
                s.CreatedAt))
            .ToList();

        var categoryName = product.Category != null
            ? (product.Category.Parent != null ? $"{product.Category.Parent.Name} > {product.Category.Name}" : product.Category.Name)
            : null;

        var detail = new ProductDetailDto(
            product.Id,
            product.TenantId,
            product.CategoryId,
            categoryName,
            product.Type,
            product.Name,
            product.SKU,
            product.Barcode,
            product.Brand,
            product.Unit,
            product.CostPrice,
            product.SellingPrice,
            product.Currency,
            product.TaxRate,
            product.DiscountRate,
            product.TrackInventory,
            product.CurrentStock,
            product.ReservedStock,
            product.AvailableStock,
            product.MinStockLevel,
            product.IsLowStock,
            product.ProfitMargin,
            product.Status,
            product.Images,
            product.Tags,
            product.Attributes,
            product.Description,
            variantsDto,
            stockMovementsDto,
            product.CreatedAt,
            product.UpdatedAt);

        return Result.Success(detail);
    }
}

public class GetProductByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/products/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProductByIdQuery(id), ct);
            return Results.Ok(ApiResponse<ProductDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.View")
        .WithName("GetProductById")
        .WithTags("Products");
    }
}
