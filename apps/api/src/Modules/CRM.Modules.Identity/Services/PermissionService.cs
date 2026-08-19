using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.Security;
using CRM.Modules.Identity.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Identity.Services;

public class PermissionService(
    IdentityDbContext dbContext,
    ICacheService cacheService,
    ILogger<PermissionService> logger) : IPermissionService
{
    private static string GetCacheKey(Guid tenantId, Guid userId) =>
        $"tenant:{tenantId}:user:{userId}:permissions";

    public async Task<bool> HasPermissionAsync(
        Guid userId,
        Guid tenantId,
        string permissionCode,
        CancellationToken cancellationToken = default)
    {
        if (await IsSuperAdminAsync(userId, cancellationToken))
        {
            return true;
        }

        var permissions = await GetUserPermissionsAsync(userId, tenantId, cancellationToken);
        return permissions.Contains(permissionCode);
    }

    public async Task<IReadOnlySet<string>> GetUserPermissionsAsync(
        Guid userId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        // Super admins get all permissions
        if (await IsSuperAdminAsync(userId, cancellationToken))
        {
            return await GetAllPermissionsAsync(cancellationToken);
        }

        var cacheKey = GetCacheKey(tenantId, userId);
        var tenantTag = $"tenant:{tenantId}:permissions";

        var set = await cacheService.GetOrCreateAsync<HashSet<string>>(
            cacheKey,
            async ct =>
            {
                logger.LogInformation("Loading permissions from DB for User {UserId} in Tenant {TenantId}", userId, tenantId);

                // Query DB without query filter constraint because we explicitly query by tenantId
                var permissions = await dbContext.UserRoles
                    .IgnoreQueryFilters()
                    .Where(ur => ur.TenantId == tenantId && ur.UserId == userId)
                    .SelectMany(ur => ur.Role!.RolePermissions)
                    .Select(rp => rp.Permission!.Code)
                    .Distinct()
                    .ToListAsync(ct);

                return permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);
            },
            TimeSpan.FromMinutes(30),
            [tenantTag, $"user:{userId}"],
            cancellationToken);

        return set ?? (IReadOnlySet<string>)new HashSet<string>();
    }

    public async Task InvalidateUserPermissionsCacheAsync(
        Guid tenantId,
        Guid? userId = null,
        CancellationToken cancellationToken = default)
    {
        if (userId.HasValue)
        {
            var cacheKey = GetCacheKey(tenantId, userId.Value);
            logger.LogInformation("Invalidating Redis permission cache for Key {CacheKey}", cacheKey);
            await cacheService.RemoveAsync(cacheKey, cancellationToken);
        }
        else
        {
            var tenantTag = $"tenant:{tenantId}:permissions";
            logger.LogInformation("Invalidating all user permission caches for Tenant {TenantId} via tag {Tag}", tenantId, tenantTag);
            await cacheService.RemoveByTagAsync(tenantTag, cancellationToken);
        }
    }

    private async Task<bool> IsSuperAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cacheKey = $"user:{userId}:is_super_admin";

        var result = await cacheService.GetOrCreateAsync<bool?>(
            cacheKey,
            async ct =>
            {
                logger.LogInformation("Checking super admin status from DB for User {UserId}", userId);

                return await dbContext.Users
                    .IgnoreQueryFilters()
                    .Where(u => u.Id == userId && u.IsActive)
                    .Select(u => u.IsSuperAdmin)
                    .FirstOrDefaultAsync(ct);
            },
            TimeSpan.FromMinutes(60),
            [$"user:{userId}"],
            cancellationToken);

        return result == true;
    }

    private async Task<IReadOnlySet<string>> GetAllPermissionsAsync(CancellationToken cancellationToken)
    {
        const string cacheKey = "global:all_permissions";

        var set = await cacheService.GetOrCreateAsync<HashSet<string>>(
            cacheKey,
            async ct =>
            {
                logger.LogInformation("Loading all permissions from DB for super admin");

                var permissions = await dbContext.Set<Entities.Permission>()
                    .IgnoreQueryFilters()
                    .Select(p => p.Code)
                    .ToListAsync(ct);

                return permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);
            },
            TimeSpan.FromMinutes(60),
            ["global:permissions"],
            cancellationToken);

        return set ?? (IReadOnlySet<string>)new HashSet<string>();
    }
}
