using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Vehicles.Data;
using CRM.Modules.Vehicles.Features.Documents;
using CRM.Modules.Vehicles.Features.EPC;
using CRM.Modules.Vehicles.Features.Vehicles;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Vehicles;

public static class VehiclesModuleExtensions
{
    public static IServiceCollection AddVehiclesModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' not found.");

        services.AddDbContext<VehiclesDbContext>((sp, options) =>
        {
            var rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString)
                   .AddInterceptors(rlsInterceptor);
        });

        return services;
    }

    public static IEndpointRouteBuilder MapVehiclesModuleEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapVehicleEndpoints();
        endpoints.MapEpcEndpoints();
        endpoints.MapVehicleDocEndpoints();

        return endpoints;
    }
}
