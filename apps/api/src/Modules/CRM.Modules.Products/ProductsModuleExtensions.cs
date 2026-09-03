using CRM.Modules.Products.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Products;

public static class ProductsModuleExtensions
{
    public static IServiceCollection AddProductsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' was not found.");

        services.AddDbContext<ProductsDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Products", "public");
            });
        });

        services.AddScoped<CRM.Modules.Products.Services.IInventoryService, CRM.Modules.Products.Services.InventoryService>();

        return services;
    }
}
