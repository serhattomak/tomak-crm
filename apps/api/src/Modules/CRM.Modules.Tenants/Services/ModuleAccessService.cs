using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Services;

public class ModuleAccessService(
    TenantsDbContext dbContext,
    ICacheService cacheService) : IModuleAccessService
{
    private static string CacheKey(Guid tenantId) => $"tenant:{tenantId}:modules";
    private static readonly string[] CacheTags = ["tenant-modules"];

    public async Task<bool> IsModuleEnabledAsync(Guid tenantId, string moduleKey, CancellationToken cancellationToken = default)
    {
        var enabledModules = await GetEnabledModulesAsync(tenantId, cancellationToken);
        return enabledModules.Contains(moduleKey, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<string[]> GetEnabledModulesAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
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
