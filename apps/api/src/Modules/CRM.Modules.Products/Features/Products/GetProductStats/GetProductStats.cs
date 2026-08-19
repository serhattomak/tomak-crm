using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Products.GetProductStats;

public record ProductStatsDto(
    int TotalProducts,
    int PhysicalProductsCount,
    int ServicesCount,
    int DigitalProductsCount,
    int SubscriptionsCount,
    int LowStockCount,
    int OutOfStockCount,
    decimal TotalInventoryValue,
    decimal TotalRetailValue,
    string Currency);

public record GetProductStatsQuery() : IQuery<ProductStatsDto>;

public class GetProductStatsHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetProductStatsQuery, ProductStatsDto>
{
    public async Task<Result<ProductStatsDto>> Handle(GetProductStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var products = await dbContext.Products
            .Where(p => p.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var total = products.Count;
        var physical = products.Count(p => p.Type == "Physical");
        var services = products.Count(p => p.Type == "Service");
        var digital = products.Count(p => p.Type == "Digital");
        var subscriptions = products.Count(p => p.Type == "Subscription");

        var lowStock = products.Count(p => p.TrackInventory && p.Type == "Physical" && (p.CurrentStock - p.ReservedStock) <= p.MinStockLevel && (p.CurrentStock - p.ReservedStock) > 0);
        var outOfStock = products.Count(p => p.TrackInventory && p.Type == "Physical" && (p.CurrentStock - p.ReservedStock) <= 0);

        var totalInventoryValue = products
            .Where(p => p.TrackInventory && p.Type == "Physical")
            .Sum(p => p.CurrentStock * p.CostPrice);

        var totalRetailValue = products
            .Where(p => p.TrackInventory && p.Type == "Physical")
            .Sum(p => p.CurrentStock * p.SellingPrice);

        var stats = new ProductStatsDto(
            total,
            physical,
            services,
            digital,
            subscriptions,
            lowStock,
            outOfStock,
            totalInventoryValue,
            totalRetailValue,
            "TRY");

        return Result.Success(stats);
    }
}

public class GetProductStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/products/stats", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProductStatsQuery(), ct);
            return Results.Ok(ApiResponse<ProductStatsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.View")
        .WithName("GetProductStats")
        .WithTags("Products");
    }
}
