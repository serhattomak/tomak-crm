using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Products.GetProductPriceHistory;

public record ProductPriceHistoryDto(
    Guid Id,
    Guid ProductId,
    decimal? OldCostPrice,
    decimal? NewCostPrice,
    decimal? OldSellingPrice,
    decimal? NewSellingPrice,
    string Currency,
    string? ChangeReason,
    Guid? ChangedByUserId,
    DateTime CreatedAt);

public record GetProductPriceHistoryQuery(Guid ProductId) : IQuery<List<ProductPriceHistoryDto>>;

public class GetProductPriceHistoryHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetProductPriceHistoryQuery, List<ProductPriceHistoryDto>>
{
    public async Task<Result<List<ProductPriceHistoryDto>>> Handle(GetProductPriceHistoryQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var rows = await dbContext.ProductPriceHistory
            .Where(h => h.ProductId == request.ProductId && h.TenantId == currentTenant.Id.Value)
            .OrderByDescending(h => h.CreatedAt)
            .Select(h => new ProductPriceHistoryDto(
                h.Id,
                h.ProductId,
                h.OldCostPrice,
                h.NewCostPrice,
                h.OldSellingPrice,
                h.NewSellingPrice,
                h.Currency,
                h.ChangeReason,
                h.ChangedByUserId,
                h.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(rows);
    }
}

public class GetProductPriceHistoryEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/products/{id:guid}/price-history", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProductPriceHistoryQuery(id), ct);
            return Results.Ok(ApiResponse<List<ProductPriceHistoryDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.View")
        .WithName("GetProductPriceHistory")
        .WithTags("Products");
    }
}
