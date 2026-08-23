using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity.Data;
using CRM.Modules.Identity.Entities;
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

        // 1. Fetch all tenant members
        var tenantMembers = await dbContext.TenantMembers
            .Where(tm => tm.TenantId == tenantId)
            .Include(tm => tm.User)
            .ToListAsync(cancellationToken);

        // 2. Fetch all role assignments in this tenant
        var userRoles = await dbContext.UserRoles
            .Where(ur => ur.TenantId == tenantId)
            .Include(ur => ur.User)
            .Include(ur => ur.Role)
            .ToListAsync(cancellationToken);

        var rolesByUser = userRoles
            .GroupBy(ur => ur.UserId)
            .ToDictionary(
                g => g.Key,
                g => g.Where(ur => ur.Role != null).Select(ur => new RoleSummaryDto(ur.Role!.Id, ur.Role.Name)).ToList()
            );

        // 3. Collect unique users from both TenantMembers and UserRoles
        var userMap = new Dictionary<Guid, User>();

        foreach (var member in tenantMembers)
        {
            if (member.User is not null && !userMap.ContainsKey(member.User.Id))
            {
                userMap[member.User.Id] = member.User;
            }
        }

        foreach (var ur in userRoles)
        {
            if (ur.User is not null && !userMap.ContainsKey(ur.User.Id))
            {
                userMap[ur.User.Id] = ur.User;
            }
        }

        var result = userMap.Values
            .Select(u => new TenantUserDto(
                u.Id,
                u.Email,
                u.FullName,
                u.AvatarUrl,
                u.IsActive,
                rolesByUser.TryGetValue(u.Id, out var roles) ? roles : [],
                u.CreatedAt))
            .OrderBy(u => u.FullName ?? u.Email)
            .ToList();

        return Result.Success<IReadOnlyList<TenantUserDto>>(result);
    }
}

public class GetTenantUsersEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/identity/users", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetTenantUsersQuery(), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<TenantUserDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Users.View")
        .WithName("GetTenantUsers")
        .WithTags("Identity");
    }
}
