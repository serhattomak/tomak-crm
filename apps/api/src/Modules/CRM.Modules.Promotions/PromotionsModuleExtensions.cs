using CRM.Modules.Promotions.Data;
using CRM.Modules.Promotions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Promotions;

public static class PromotionsModuleExtensions
{
    public static IServiceCollection AddPromotionsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' was not found.");

        services.AddDbContext<PromotionsDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Promotions", "public");
            });
        });

        services.AddScoped<ICouponCodeGenerator, CouponCodeGenerator>();
        services.AddScoped<IPromotionCalculationEngine, PromotionCalculationEngine>();

        return services;
    }
}
