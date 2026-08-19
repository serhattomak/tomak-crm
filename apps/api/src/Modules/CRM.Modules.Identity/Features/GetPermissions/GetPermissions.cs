using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Identity.Data;
using CRM.Modules.Identity.Features.GetRoles;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Identity.Features.GetPermissions;

public record PermissionGroupDto(string Module, IReadOnlyList<PermissionDto> Permissions);

public record GetPermissionsQuery : IQuery<IReadOnlyList<PermissionGroupDto>>;

public class GetPermissionsHandler(IdentityDbContext dbContext)
    : IQueryHandler<GetPermissionsQuery, IReadOnlyList<PermissionGroupDto>>
{
    public async Task<Result<IReadOnlyList<PermissionGroupDto>>> Handle(GetPermissionsQuery request, CancellationToken cancellationToken)
    {
        var permissions = await dbContext.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Name)
            .Select(p => new PermissionDto(p.Id, p.Code, p.Name, p.Module, p.Description))
            .ToListAsync(cancellationToken);

        var grouped = permissions
            .GroupBy(p => p.Module)
            .Select(g => new PermissionGroupDto(g.Key, g.ToList()))
            .ToList();

        return Result.Success<IReadOnlyList<PermissionGroupDto>>(grouped);
    }
}

public class GetPermissionsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/identity/permissions", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetPermissionsQuery(), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<PermissionGroupDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetPermissions")
        .WithTags("Identity");
    }
}
