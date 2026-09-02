using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Services;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.Modules.Email;

public static class EmailModuleExtensions
{
    public static IServiceCollection AddEmailModule(this IServiceCollection services, IConfiguration configuration)
    {
        string connectionString = configuration.GetConnectionString("Database")
            ?? configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Database' (or 'Default') was not found.");

        services.AddDbContext<EmailDbContext>((sp, options) =>
        {
            NpgsqlRlsConnectionInterceptor rlsInterceptor = sp.GetRequiredService<NpgsqlRlsConnectionInterceptor>();
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory_Email", "public");
            }).AddInterceptors(rlsInterceptor);
        });

        services.AddHttpClient();
        services.AddScoped<IEmailService, SmtpEmailService>();
        services.AddHostedService<EmailSyncJob>();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(EmailModuleExtensions).Assembly));

        return services;
    }

    /// <summary>
    /// Maps email endpoints (14 endpoints scaffold lands in 03-05).
    /// Kept as no-op for phase1 scaffolding so Program.cs MapEmailEndpoints compiles.
    /// </summary>
    public static IEndpointRouteBuilder MapEmailEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // Endpoints registered via IEndpoint auto-discovery (AddEndpoints) or explicit Map in 03-05.
        // Scaffold returns builder unchanged to satisfy Build.
        return endpoints;
    }
}
