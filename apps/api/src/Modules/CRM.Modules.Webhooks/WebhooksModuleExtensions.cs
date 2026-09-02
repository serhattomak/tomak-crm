using CRM.Modules.Webhooks.Data;
using CRM.Modules.Webhooks.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Webhooks;

public static class WebhooksModuleExtensions
{
    public static IServiceCollection AddWebhooksModule(this IServiceCollection services, IConfiguration configuration)
    {
        string connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is required.");

        services.AddDbContext<WebhooksDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Webhooks", "public");
            });
        });

        services.AddHttpClient();
        services.AddScoped<IWebhookDispatcher, WebhookDispatcher>();

        return services;
    }
}
