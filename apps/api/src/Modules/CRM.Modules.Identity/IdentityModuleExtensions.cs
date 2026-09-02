using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity.Consumers;
using CRM.Modules.Identity.Data;
using CRM.Modules.Identity.Services;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Identity;

public static class IdentityModuleExtensions
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");

        services.AddDbContext<IdentityDbContext>((sp, options) =>
        {
            var rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString)
                   .AddInterceptors(rlsInterceptor);
        });

        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<CRM.BuildingBlocks.Realtime.INotificationStore, NotificationStore>();

        return services;
    }

    public static void ConfigureIdentityConsumers(IBusRegistrationConfigurator configurator)
    {
        configurator.AddConsumer<RolePermissionsUpdatedConsumer>();
        configurator.AddConsumer<UserRolesChangedConsumer>();
        configurator.AddConsumer<TenantCreatedConsumer>();
    }
}
