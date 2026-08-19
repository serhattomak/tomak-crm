using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace CRM.BuildingBlocks.Endpoints;

public interface IEndpoint
{
    void MapEndpoint(IEndpointRouteBuilder app);
}

public static class EndpointExtensions
{
    public static IServiceCollection AddEndpoints(this IServiceCollection services, params Assembly[] assemblies)
    {
        var endpointType = typeof(IEndpoint);
        var types = assemblies
            .SelectMany(a => a.GetTypes())
            .Where(t => endpointType.IsAssignableFrom(t) && !t.IsInterface && !t.IsAbstract);

        foreach (var type in types)
        {
            services.TryAddEnumerable(ServiceDescriptor.Transient(endpointType, type));
        }

        return services;
    }

    public static IApplicationBuilder MapEndpoints(this WebApplication app, RouteGroupBuilder? routeGroupBuilder = null)
    {
        var endpoints = app.Services.GetServices<IEndpoint>();
        IEndpointRouteBuilder builder = routeGroupBuilder is not null ? routeGroupBuilder : app;

        foreach (var endpoint in endpoints)
        {
            endpoint.MapEndpoint(builder);
        }

        return app;
    }

    public static RouteHandlerBuilder RequirePermission(this RouteHandlerBuilder builder, string permissionCode)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var filter = new Security.RequirePermissionFilter(
                permissionCode,
                context.HttpContext.RequestServices.GetRequiredService<Security.IPermissionService>());
            return await filter.InvokeAsync(context, next);
        });
    }
}
