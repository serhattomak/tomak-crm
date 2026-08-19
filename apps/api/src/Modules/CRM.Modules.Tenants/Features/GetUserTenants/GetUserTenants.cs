using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Features.CreateTenant;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.GetUserTenants;

public record GetUserTenantsQuery : IQuery<IReadOnlyList<TenantDto>>;

public class GetUserTenantsHandler(
    TenantsDbContext dbContext,
    ICurrentUser currentUser) : IQueryHandler<GetUserTenantsQuery, IReadOnlyList<TenantDto>>
{
    public async Task<Result<IReadOnlyList<TenantDto>>> Handle(GetUserTenantsQuery request, CancellationToken cancellationToken)
    {
        if (currentUser.Id is null)
        {
            throw new UnauthorizedException();
        }

        var userId = currentUser.Id.Value;

        var tenants = await dbContext.TenantMembers
            .Where(tm => tm.UserId == userId && tm.Tenant != null && tm.Tenant.IsActive)
            .Include(tm => tm.Tenant)
            .OrderByDescending(tm => tm.IsOwner)
            .ThenBy(tm => tm.Tenant!.Name)
            .Select(tm => new TenantDto(
                tm.Tenant!.Id,
                tm.Tenant.Name,
                tm.Tenant.Slug,
                tm.Tenant.LogoUrl,
                tm.Tenant.IsActive,
                tm.IsOwner,
                tm.Tenant.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<TenantDto>>(tenants);
    }
}

public class GetUserTenantsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tenants/me", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetUserTenantsQuery(), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<TenantDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetUserTenants")
        .WithTags("Tenants");
    }
}
