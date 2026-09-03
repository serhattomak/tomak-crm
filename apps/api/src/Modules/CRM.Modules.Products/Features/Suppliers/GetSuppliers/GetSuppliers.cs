using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Suppliers.GetSuppliers;

public record SupplierDto(
    Guid Id,
    string Name,
    string? ContactName,
    string? Email,
    string? Phone,
    string? Address,
    bool IsActive,
    DateTime CreatedAt);

public record GetSuppliersQuery(bool? ActiveOnly = null) : IQuery<List<SupplierDto>>;

public class GetSuppliersHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetSuppliersQuery, List<SupplierDto>>
{
    public async Task<Result<List<SupplierDto>>> Handle(GetSuppliersQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var query = dbContext.Suppliers.Where(s => s.TenantId == currentTenant.Id.Value);

        if (request.ActiveOnly == true)
            query = query.Where(s => s.IsActive);

        var items = await query
            .OrderBy(s => s.Name)
            .Select(s => new SupplierDto(s.Id, s.Name, s.ContactName, s.Email, s.Phone, s.Address, s.IsActive, s.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(items);
    }
}

public class GetSuppliersEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/suppliers", async (
            bool? activeOnly,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetSuppliersQuery(activeOnly), ct);
            return Results.Ok(ApiResponse<List<SupplierDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.View")
        .WithName("GetSuppliers")
        .WithTags("Suppliers");
    }
}
