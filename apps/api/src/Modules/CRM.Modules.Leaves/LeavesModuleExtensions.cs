using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Leaves;

public static class LeavesModuleExtensions
{
    public static IServiceCollection AddLeavesModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is required.");

        services.AddDbContext<LeavesDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
            });
        });

        return services;
    }
}
