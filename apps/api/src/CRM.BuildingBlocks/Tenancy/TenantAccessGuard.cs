using CRM.BuildingBlocks.Security;

namespace CRM.BuildingBlocks.Tenancy;

public interface ITenantAccessGuard
{
    Task<bool> IsMemberOrSuperAdminAsync(Guid userId, Guid tenantId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Answers one question: may this user act on this tenant?
/// <para>
/// Tenant ids reach the API from caller-controlled input — an <c>X-Tenant-Id</c> header, a
/// subdomain, or a route parameter. Every path that trusts one has to ask this question, so it
/// lives in a single place rather than being re-implemented per endpoint.
/// </para>
/// </summary>
public class TenantAccessGuard(
    ITenantMembershipVerifier membershipVerifier,
    IPermissionService permissionService) : ITenantAccessGuard
{
    public async Task<bool> IsMemberOrSuperAdminAsync(
        Guid userId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty || tenantId == Guid.Empty)
        {
            return false;
        }

        // Platform administrators legitimately act on tenants they are not a member of — the
        // tenant modules and labels screens do exactly this. The lookup is cached for an hour.
        if (await permissionService.IsSuperAdminAsync(userId, cancellationToken))
        {
            return true;
        }

        return await membershipVerifier.IsMemberAsync(userId, tenantId, cancellationToken);
    }
}
