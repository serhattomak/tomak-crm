using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Invoicing.Data;
using CRM.Modules.Invoicing.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Invoicing;

public static class InvoicingModuleExtensions
{
    public static IServiceCollection AddInvoicingModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' was not found.");

        services.AddDbContext<InvoicingDbContext>((sp, options) =>
        {
            var rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Invoicing", "public");
            })
            .AddInterceptors(rlsInterceptor);
        });

        services.AddScoped<ICariLedgerService, CariLedgerService>();
        services.AddScoped<IUblTrXmlService, UblTrXmlService>();

        return services;
    }
}
