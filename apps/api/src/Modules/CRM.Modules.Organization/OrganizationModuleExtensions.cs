using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Organization;

public static class OrganizationModuleExtensions
{
    public static IServiceCollection AddOrganizationModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");

        services.AddDbContext<OrganizationDbContext>((sp, options) =>
        {
            var rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString)
                   .AddInterceptors(rlsInterceptor);
        });

        return services;
    }
}
