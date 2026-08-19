using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Identity.Features.GetRoles;

public record RoleDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Description,
    bool IsDefault,
    IReadOnlyList<PermissionDto> Permissions,
    int MemberCount,
    DateTime CreatedAt);

public record PermissionDto(Guid Id, string Code, string Name, string Module, string? Description);

public record GetRolesQuery : IQuery<IReadOnlyList<RoleDto>>;

public class GetRolesHandler(
    IdentityDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetRolesQuery, IReadOnlyList<RoleDto>>
{
    public async Task<Result<IReadOnlyList<RoleDto>>> Handle(GetRolesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var roles = await dbContext.Roles
            .Where(r => r.TenantId == tenantId)
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.UserRoles)
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto(
                r.Id,
                r.TenantId,
                r.Name,
                r.Description,
                r.IsDefault,
                r.RolePermissions.Select(rp => new PermissionDto(
                    rp.Permission!.Id,
                    rp.Permission.Code,
                    rp.Permission.Name,
                    rp.Permission.Module,
                    rp.Permission.Description)).ToList(),
                r.UserRoles.Count,
                r.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<RoleDto>>(roles);
    }
}

public class GetRolesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/identity/roles", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetRolesQuery(), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<RoleDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Roles.View")
        .WithName("GetRoles")
        .WithTags("Identity");
    }
}
