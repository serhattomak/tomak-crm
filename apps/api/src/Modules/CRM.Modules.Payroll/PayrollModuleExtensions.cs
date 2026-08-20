using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Payroll;

public static class PayrollModuleExtensions
{
    public static IServiceCollection AddPayrollModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is required.");

        services.AddDbContext<PayrollDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
            });
        });

        // Register Calculation Engine
        services.AddScoped<IPayrollCalculationEngine, TurkeyPayrollEngine>();

        return services;
    }
}
