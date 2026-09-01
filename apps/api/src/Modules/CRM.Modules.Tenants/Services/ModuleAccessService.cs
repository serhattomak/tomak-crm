using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Services;

public class ModuleAccessService(
    TenantsDbContext dbContext,
    ICacheService cacheService,
    ICurrentUser currentUser,
    IPermissionService permissionService) : IModuleAccessService
{
    private static string CacheKey(Guid tenantId) => $"tenant:{tenantId}:modules";
    private static readonly string[] CacheTags = ["tenant-modules"];

    public async Task<bool> IsModuleEnabledAsync(Guid tenantId, string moduleKey, CancellationToken cancellationToken = default)
    {
        // Super Admin bypass: all modules are enabled regardless of tenant_modules
        if (currentUser.Id.HasValue && await permissionService.IsSuperAdminAsync(currentUser.Id.Value, cancellationToken))
        {
            return true;
        }

        var enabledModules = await GetEnabledModulesAsync(tenantId, cancellationToken);
        return enabledModules.Contains(moduleKey, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<string[]> GetEnabledModulesAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        // Super Admin bypass: return all registered module keys as enabled
        if (currentUser.Id.HasValue && await permissionService.IsSuperAdminAsync(currentUser.Id.Value, cancellationToken))
        {
            return ModuleRegistry.GetDefaultModuleKeys();
        }

        return await cacheService.GetOrCreateAsync(
            CacheKey(tenantId),
            async ct =>
            {
                var modules = await dbContext.TenantModules
                    .Where(m => m.TenantId == tenantId && m.IsEnabled)
                    .Select(m => m.ModuleKey)
                    .ToArrayAsync(ct);

                return modules;
            },
            TimeSpan.FromMinutes(30),
            CacheTags,
            cancellationToken);
    }

    public async Task InvalidateModuleCacheAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        await cacheService.RemoveAsync(CacheKey(tenantId), cancellationToken);
    }
}
