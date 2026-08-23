using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.Exceptions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.BuildingBlocks.Tenancy;

public interface IModuleAccessService
{
    Task<bool> IsModuleEnabledAsync(Guid tenantId, string moduleKey, CancellationToken cancellationToken = default);
    Task<string[]> GetEnabledModulesAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task InvalidateModuleCacheAsync(Guid tenantId, CancellationToken cancellationToken = default);
}

public class RequireModuleFilter(string moduleKey, IModuleAccessService moduleAccessService) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        var currentTenant = httpContext.RequestServices.GetService<ICurrentTenant>();

        if (currentTenant?.Id is null || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required for this action.");
        }

        var isEnabled = await moduleAccessService.IsModuleEnabledAsync(
            currentTenant.Id.Value,
            moduleKey,
            httpContext.RequestAborted);

        if (!isEnabled)
        {
            throw new ForbiddenException($"The module '{moduleKey}' is not enabled for this tenant.");
        }

        return await next(context);
    }
}

public static class ModuleAccessExtensions
{
    public static RouteHandlerBuilder RequireModule(this RouteHandlerBuilder builder, string moduleKey)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var filter = new RequireModuleFilter(
                moduleKey,
                context.HttpContext.RequestServices.GetRequiredService<IModuleAccessService>());
            return await filter.InvokeAsync(context, next);
        });
    }
}
