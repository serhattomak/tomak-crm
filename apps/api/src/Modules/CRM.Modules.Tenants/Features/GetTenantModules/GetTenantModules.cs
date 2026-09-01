using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.GetTenantModules;

public record TenantModuleDto(
    string ModuleKey,
    string DefaultDisplayName,
    string? DisplayNameOverride,
    string Category,
    bool IsEnabled,
    DateTime? ActivatedAt);

public record GetTenantModulesQuery(Guid TenantId) : IQuery<TenantModuleDto[]>;

public class GetTenantModulesHandler(
    TenantsDbContext dbContext,
    ICurrentUser currentUser,
    IPermissionService permissionService) : IQueryHandler<GetTenantModulesQuery, TenantModuleDto[]>
{
    public async Task<Result<TenantModuleDto[]>> Handle(GetTenantModulesQuery request, CancellationToken cancellationToken)
    {
        var tenantModules = await dbContext.TenantModules
            .Where(m => m.TenantId == request.TenantId)
            .ToListAsync(cancellationToken);

        var isSuperAdmin = currentUser.Id.HasValue && await permissionService.IsSuperAdminAsync(currentUser.Id.Value, cancellationToken);

        // Merge with registry to show all modules (even unregistered ones)
        var result = ModuleRegistry.All.Select(def =>
        {
            var tenantModule = tenantModules.FirstOrDefault(
                m => m.ModuleKey.Equals(def.Key, StringComparison.OrdinalIgnoreCase));

            // Super Admin fallback: treat every registered module as enabled
            var isEnabled = isSuperAdmin ? true : (tenantModule?.IsEnabled ?? false);

            return new TenantModuleDto(
                def.Key,
                def.DefaultDisplayName,
                tenantModule?.DisplayName,
                def.Category,
                isEnabled,
                tenantModule?.ActivatedAt);
        }).ToArray();

        return result;
    }
}

public class GetTenantModulesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tenants/{tenantId:guid}/modules", async (Guid tenantId, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetTenantModulesQuery(tenantId), ct);
            return Results.Ok(ApiResponse<TenantModuleDto[]>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetTenantModules")
        .WithTags("Tenants");
    }
}
