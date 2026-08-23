using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Customers;

public static class CustomersModuleExtensions
{
    public static IServiceCollection AddCustomersModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' not found.");

        services.AddDbContext<CustomersDbContext>((sp, options) =>
        {
            var rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString)
                   .AddInterceptors(rlsInterceptor);
        });

        services.AddScoped<IPipelineAssignmentService, PipelineAssignmentService>();

        return services;
    }
}

