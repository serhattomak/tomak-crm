using System.Collections.Concurrent;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace CRM.BuildingBlocks.Tenancy;

public interface ITenantMembershipVerifier
{
    Task<bool> IsMemberAsync(Guid userId, Guid tenantId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Verifies that a user really belongs to a tenant before any tenant-scoped access is granted.
/// <para>
/// The tenant is resolved from caller-supplied input (an <c>X-Tenant-Id</c> header or a SignalR
/// query parameter), so accepting it without this check lets any authenticated user read another
/// tenant's data by changing one value. Results are cached briefly because both the HTTP pipeline
/// and every hub connection would otherwise hit the database on each request.
/// </para>
/// <para>
/// Fails closed: if membership cannot be determined, access is denied and the result is not cached.
/// </para>
/// </summary>
public class TenantMembershipVerifier(
    IConfiguration configuration,
    ILogger<TenantMembershipVerifier> logger) : ITenantMembershipVerifier
{
    private static readonly ConcurrentDictionary<(Guid TenantId, Guid UserId), CacheEntry> Cache = new();
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(5);

    public async Task<bool> IsMemberAsync(
        Guid userId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty || tenantId == Guid.Empty)
        {
            return false;
        }

        var cacheKey = (tenantId, userId);
        if (Cache.TryGetValue(cacheKey, out var cached) && cached.ExpiresAt > DateTimeOffset.UtcNow)
        {
            return cached.IsMember;
        }

        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrEmpty(connectionString))
        {
            logger.LogError("Database connection string is missing; denying tenant membership check.");
            return false;
        }

        bool isMember;
        try
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = new NpgsqlCommand(
                "SELECT EXISTS (SELECT 1 FROM public.tenant_members WHERE tenant_id = @tenantId AND user_id = @userId);",
                connection);
            command.Parameters.AddWithValue("tenantId", tenantId);
            command.Parameters.AddWithValue("userId", userId);

            isMember = await command.ExecuteScalarAsync(cancellationToken) is true;
        }
        catch (Exception exception)
        {
            // Fail closed and do not cache: a transient database error must not be remembered as
            // "not a member", and must never be treated as "is a member".
            logger.LogError(
                exception,
                "Tenant membership check failed for user {UserId} / tenant {TenantId}; denying access.",
                userId,
                tenantId);
            return false;
        }

        // A stale "is a member" entry outlives a revocation by at most CacheLifetime; a stale
        // "not a member" entry would lock a legitimate user out for the same window, which is why
        // only successful lookups are cached.
        if (isMember)
        {
            Cache[cacheKey] = new CacheEntry(true, DateTimeOffset.UtcNow.Add(CacheLifetime));
        }

        return isMember;
    }

    private readonly record struct CacheEntry(bool IsMember, DateTimeOffset ExpiresAt);
}
