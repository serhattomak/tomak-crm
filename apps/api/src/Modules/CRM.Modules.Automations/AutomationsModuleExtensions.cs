using CRM.Modules.Automations.Data;
using CRM.Modules.Automations.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Automations;

public static class AutomationsModuleExtensions
{
    public static IServiceCollection AddAutomationsModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is required.");

        services.AddDbContext<AutomationsDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
            });
        });

        services.AddHttpClient();
        services.AddScoped<IAutomationEngine, AutomationEngine>();

        return services;
    }
}
