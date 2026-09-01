using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Identity.Features.GetProfile;

public record UserProfileDto(
    Guid Id,
    string Email,
    string? FullName,
    string? AvatarUrl,
    IReadOnlySet<string> Permissions,
    IReadOnlyList<string> Roles,
    bool IsSuperAdmin);

public record GetProfileQuery : IQuery<UserProfileDto>;

public class GetProfileHandler(
    IdentityDbContext dbContext,
    ICurrentUser currentUser,
    ICurrentTenant currentTenant,
    IPermissionService permissionService) : IQueryHandler<GetProfileQuery, UserProfileDto>
{
    public async Task<Result<UserProfileDto>> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        if (currentUser.Id is null)
        {
            throw new UnauthorizedException();
        }

        var userId = currentUser.Id.Value;

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            throw new NotFoundException("User profile was not found.");
        }

        IReadOnlySet<string> permissions = new HashSet<string>();
        IReadOnlyList<string> roles = [];

        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            permissions = await permissionService.GetUserPermissionsAsync(userId, currentTenant.Id.Value, cancellationToken);

            roles = await dbContext.UserRoles
                .Where(ur => ur.UserId == userId && ur.TenantId == currentTenant.Id.Value)
                .Select(ur => ur.Role!.Name)
                .ToListAsync(cancellationToken);
        }

        var isSuperAdmin = await permissionService.IsSuperAdminAsync(userId, cancellationToken);

        return new UserProfileDto(
            user.Id,
            user.Email,
            user.FullName,
            user.AvatarUrl,
            permissions,
            roles,
            isSuperAdmin);
    }
}

public class GetProfileEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/identity/profile", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProfileQuery(), ct);
            return Results.Ok(ApiResponse<UserProfileDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetProfile")
        .WithTags("Identity");
    }
}
