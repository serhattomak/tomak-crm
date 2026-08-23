using System.Reflection;
using CRM.Modules.Compliance.Data;
using CRM.Modules.Compliance.Services;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Compliance;

public static class ComplianceModuleExtensions
{
    public static IServiceCollection AddComplianceModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' not found.");

        services.AddDbContext<ComplianceDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__ComplianceMigrationsHistory", "public");
                npgsqlOptions.EnableRetryOnFailure(3);
            });
        });

        services.AddScoped<IComplianceEngine, ComplianceEngine>();

        var assembly = Assembly.GetExecutingAssembly();
        services.AddValidatorsFromAssembly(assembly);

        return services;
    }
}
