using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Brands.GetBrands;

public record BrandDto(
    Guid Id,
    string Name,
    string? LogoUrl,
    string? Website,
    bool IsActive,
    DateTime CreatedAt);

public record GetBrandsQuery(bool? ActiveOnly = null) : IQuery<List<BrandDto>>;

public class GetBrandsHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetBrandsQuery, List<BrandDto>>
{
    public async Task<Result<List<BrandDto>>> Handle(GetBrandsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var query = dbContext.Brands.Where(b => b.TenantId == currentTenant.Id.Value);

        if (request.ActiveOnly == true)
            query = query.Where(b => b.IsActive);

        var items = await query
            .OrderBy(b => b.Name)
            .Select(b => new BrandDto(b.Id, b.Name, b.LogoUrl, b.Website, b.IsActive, b.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(items);
    }
}

public class GetBrandsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/brands", async (
            bool? activeOnly,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetBrandsQuery(activeOnly), ct);
            return Results.Ok(ApiResponse<List<BrandDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.View")
        .WithName("GetBrands")
        .WithTags("Brands");
    }
}
