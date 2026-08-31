using CRM.Modules.Integrations.Data;
using CRM.Modules.Integrations.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Integrations;

public static class IntegrationsModuleExtensions
{
    public static IServiceCollection AddIntegrationsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' was not found.");

        services.AddDbContext<IntegrationsDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Integrations", "public");
            });
        });

        services.AddMemoryCache();
        services.AddScoped<IPublicApiTenantResolver, PublicApiTenantResolver>();
        services.AddSingleton<PublicApiRateLimiter>();
        services.AddSingleton<PublicApiHmacValidator>();
        services.AddScoped<IGuestMergeService, GuestMergeService>();

        return services;
    }
}
