using CRM.Modules.Customers.Data;
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

        services.AddDbContext<CustomersDbContext>(options =>
        {
            options.UseNpgsql(connectionString);
        });

        return services;
    }
}
