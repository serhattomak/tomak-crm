using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Recruitment.Data;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Recruitment;

public static class RecruitmentModuleExtensions
{
    /// <summary>
    /// Registers RecruitmentDbContext with Npgsql RLS interceptor.
    /// MediatR handlers and FluentValidation validators are auto-discovered via
    /// AddBuildingBlocks when the Recruitment assembly is passed as a module assembly.
    /// Endpoints implementing IEndpoint are discovered via AddEndpoints / MapEndpoints
    /// and enforce permissions via RequirePermission("Recruitment.*").
    /// </summary>
    public static IServiceCollection AddRecruitmentModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Connection string 'Database' not found.");

        services.AddDbContext<RecruitmentDbContext>((sp, options) =>
        {
            var rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString)
                   .AddInterceptors(rlsInterceptor);
        });

        return services;
    }

    /// <summary>
    /// Maps Recruitment endpoints. Endpoints are auto-discovered via IEndpoint
    /// (AddEndpoints/MapEndpoints) – this helper exists for explicit wiring if needed
    /// and to satisfy module setup conventions.
    /// All endpoints should use .RequirePermission("Recruitment.View" | "Recruitment.Manage" | "Recruitment.Publish" | "Recruitment.ManageCandidates").
    /// </summary>
    public static IEndpointRouteBuilder MapRecruitmentEndpoints(this IEndpointRouteBuilder app)
    {
        // IEndpoint implementations in CRM.Modules.Recruitment.Features/* are
        // automatically mapped by app.MapEndpoints() in Program.cs.
        return app;
    }
}
