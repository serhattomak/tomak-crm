using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Identity.Features.GetTenantUsers;

public record TenantUserDto(
    Guid Id,
    string Email,
    string? FullName,
    string? AvatarUrl,
    bool IsActive,
    IReadOnlyList<RoleSummaryDto> Roles,
    DateTime CreatedAt);

public record RoleSummaryDto(Guid Id, string Name);

public record GetTenantUsersQuery : IQuery<IReadOnlyList<TenantUserDto>>;

public class GetTenantUsersHandler(
    IdentityDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetTenantUsersQuery, IReadOnlyList<TenantUserDto>>
{
    public async Task<Result<IReadOnlyList<TenantUserDto>>> Handle(GetTenantUsersQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var userRoles = await dbContext.UserRoles
            .Where(ur => ur.TenantId == tenantId)
            .Include(ur => ur.User)
            .Include(ur => ur.Role)
            .ToListAsync(cancellationToken);

        var grouped = userRoles
            .GroupBy(ur => ur.User!)
            .Select(g => new TenantUserDto(
                g.Key.Id,
                g.Key.Email,
                g.Key.FullName,
                g.Key.AvatarUrl,
                g.Key.IsActive,
                g.Select(ur => new RoleSummaryDto(ur.Role!.Id, ur.Role.Name)).ToList(),
                g.Key.CreatedAt))
            .ToList();

        return Result.Success<IReadOnlyList<TenantUserDto>>(grouped);
    }
}

public class GetTenantUsersEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/identity/users", async (IQueryHandler<GetTenantUsersQuery, IReadOnlyList<TenantUserDto>> handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new GetTenantUsersQuery(), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<TenantUserDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Users.View")
        .WithName("GetTenantUsers")
        .WithTags("Identity");
    }
}
