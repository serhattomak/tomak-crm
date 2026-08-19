using System.Security.Claims;
using CRM.BuildingBlocks.Exceptions;
using Microsoft.AspNetCore.Http;

namespace CRM.BuildingBlocks.Security;

public interface ICurrentUser
{
    Guid? Id { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
    ClaimsPrincipal? Principal { get; }
}

public class CurrentUserAccessor(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public Guid? Id
    {
        get
        {
            var sub = User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                      User?.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? Email =>
        User?.FindFirstValue(ClaimTypes.Email) ??
        User?.FindFirstValue("email");

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public ClaimsPrincipal? Principal => User;
}

public interface IPermissionService
{
    Task<bool> HasPermissionAsync(Guid userId, Guid tenantId, string permissionCode, CancellationToken cancellationToken = default);
    Task<IReadOnlySet<string>> GetUserPermissionsAsync(Guid userId, Guid tenantId, CancellationToken cancellationToken = default);
    Task InvalidateUserPermissionsCacheAsync(Guid tenantId, Guid? userId = null, CancellationToken cancellationToken = default);
}

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public class RequirePermissionAttribute(string permission) : Attribute
{
    public string Permission { get; } = permission;
}

public class RequirePermissionFilter(string permissionCode, IPermissionService permissionService) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        var currentUser = httpContext.RequestServices.GetService(typeof(ICurrentUser)) as ICurrentUser;
        var currentTenant = httpContext.RequestServices.GetService(typeof(Tenancy.ICurrentTenant)) as Tenancy.ICurrentTenant;

        if (currentUser?.IsAuthenticated != true || !currentUser.Id.HasValue)
        {
            throw new UnauthorizedException("You must be authenticated to access this endpoint.");
        }

        if (currentTenant == null || !currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required for this action.");
        }

        var hasPermission = await permissionService.HasPermissionAsync(
            currentUser.Id.Value,
            currentTenant.Id.Value,
            permissionCode,
            httpContext.RequestAborted);

        if (!hasPermission)
        {
            throw new ForbiddenException($"Missing required permission: '{permissionCode}'.");
        }

        return await next(context);
    }
}
