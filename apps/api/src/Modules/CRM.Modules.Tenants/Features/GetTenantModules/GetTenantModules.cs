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
    IPermissionService permissionService,
    ITenantAccessGuard tenantAccessGuard) : IQueryHandler<GetTenantModulesQuery, TenantModuleDto[]>
{
    public async Task<Result<TenantModuleDto[]>> Handle(GetTenantModulesQuery request, CancellationToken cancellationToken)
    {
        // The tenant id comes from the route, not from the X-Tenant-Id header the middleware
        // validates, so membership has to be checked here.
        if (currentUser.Id is not { } userId ||
            !await tenantAccessGuard.IsMemberOrSuperAdminAsync(userId, request.TenantId, cancellationToken))
        {
            throw new ForbiddenException("You are not a member of this tenant.");
        }

        var tenantModules = await dbContext.TenantModules
            .Where(m => m.TenantId == request.TenantId)
            .ToListAsync(cancellationToken);

        // A tenant created by the signup trigger has no tenant_modules rows at all, whereas one
        // created through the API is seeded with the registry defaults. Treating "no rows" as
        // "never provisioned" keeps both paths identical; otherwise a fresh workspace reports
        // every module as disabled and its navigation silently disappears.
        var isProvisioned = tenantModules.Count > 0;
        var defaultModuleKeys = ModuleRegistry.GetDefaultModuleKeys();

        var isSuperAdmin = await permissionService.IsSuperAdminAsync(userId, cancellationToken);

        // Merge with registry to show all modules (even unregistered ones)
        var result = ModuleRegistry.All.Select(def =>
        {
            var tenantModule = tenantModules.FirstOrDefault(
                m => m.ModuleKey.Equals(def.Key, StringComparison.OrdinalIgnoreCase));

            // Super Admin fallback: treat every registered module as enabled
            var isEnabled = isSuperAdmin
                ? true
                : isProvisioned
                    ? (tenantModule?.IsEnabled ?? false)
                    : defaultModuleKeys.Contains(def.Key);

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
