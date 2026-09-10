using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.FieldService.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.FieldService;

public static class FieldServiceModuleExtensions
{
    public static IServiceCollection AddFieldServiceModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' was not found.");

        services.AddDbContext<FieldServiceDbContext>((sp, options) =>
        {
            var rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_FieldService", "public");
            })
            .AddInterceptors(rlsInterceptor);
        });

        return services;
    }
}
