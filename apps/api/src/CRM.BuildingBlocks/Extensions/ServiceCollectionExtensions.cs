using System.Reflection;
using System.Text;
using CRM.BuildingBlocks.Behaviors;
using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Realtime;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Storage;
using CRM.BuildingBlocks.Tenancy;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace CRM.BuildingBlocks.Extensions;

public static class ServiceCollectionExtensions
{
    // Published in Supabase's own examples and checked into appsettings.json. Anything running
    // with these accepts tokens that anybody can mint, so their presence outside Development is
    // treated as a configuration error rather than a default.
    internal const string DemoJwtSecret = "super-secret-jwt-token-with-at-least-32-characters-long";

    internal const string DemoServiceRoleKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

    /// <summary>
    /// Fails fast when the application would run outside Development with the demo credentials
    /// still in effect. A silent fallback to the demo JWT secret means every token in the system
    /// is forgeable, and that failure mode is invisible at runtime — so it is refused at startup.
    /// </summary>
    public static void EnsureProductionSecretsAreOverridden(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            return;
        }

        var jwtSecret = configuration["Supabase:JwtSecret"];
        if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret == DemoJwtSecret)
        {
            throw new InvalidOperationException(
                "Supabase:JwtSecret is missing or still set to the published demo value. Provide it from the environment before running outside Development: with that secret, anyone can forge a valid token.");
        }

        var serviceRoleKey = configuration["Supabase:ServiceRoleKey"];
        if (string.IsNullOrWhiteSpace(serviceRoleKey) || serviceRoleKey == DemoServiceRoleKey)
        {
            throw new InvalidOperationException(
                "Supabase:ServiceRoleKey is missing or still set to the published demo value. Provide it from the environment before running outside Development.");
        }
    }

    public static IServiceCollection AddBuildingBlocks(
        this IServiceCollection services,
        IConfiguration configuration,
        params Assembly[] moduleAssemblies)
    {
        // 1. HttpContextAccessor & Scoped Accessors
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUserAccessor>();
        services.AddScoped<ICurrentTenant, CurrentTenantAccessor>();
        services.AddScoped<NpgsqlRlsConnectionInterceptor>();
        // Tenant ids arrive from the caller (header or hub query string), so every tenant-scoped
        // path must confirm membership before trusting one.
        services.AddSingleton<ITenantMembershipVerifier, TenantMembershipVerifier>();
        services.AddScoped<ITenantAccessGuard, TenantAccessGuard>();

        // 2. Exception Handling
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();

        // 3. MediatR with Pipeline Behaviors
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssemblies([typeof(ServiceCollectionExtensions).Assembly, ..moduleAssemblies]);
            cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });

        // 4. FluentValidation
        services.AddValidatorsFromAssemblies([typeof(ServiceCollectionExtensions).Assembly, ..moduleAssemblies]);

        // 5. AutoMapper
        services.AddAutoMapper(cfg => { }, [typeof(ServiceCollectionExtensions).Assembly, ..moduleAssemblies]);

        // 6. Redis & HybridCache
        var redisConn = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConn;
            options.InstanceName = "crm:";
        });
        
#pragma warning disable EXTEXP0018
        services.AddHybridCache();
#pragma warning restore EXTEXP0018
        
        services.AddSingleton<ICacheService, HybridCacheService>();

        // 7. Minimal API Endpoints Discovery
        services.AddEndpoints(moduleAssemblies);

        // 8. Supabase / JWT Authentication
        services.AddSupabaseAuthentication(configuration);

        // 9. Supabase Storage
        services.AddSupabaseStorage(configuration);

        // 10. Realtime / SignalR
        services.AddCrmRealtime(configuration);

        return services;
    }

    public static IServiceCollection AddSupabaseAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSecret = configuration["Supabase:JwtSecret"] ?? DemoJwtSecret;

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            // A browser cannot set an Authorization header on a WebSocket handshake, so SignalR
            // passes the token as a query parameter. Accept it only under /hubs: query strings are
            // recorded in access logs, so the exception must stay as narrow as possible.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];

                    if (!string.IsNullOrEmpty(accessToken) &&
                        context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }

                    return Task.CompletedTask;
                }
            };
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });

        // Deny by default: every endpoint requires an authenticated caller unless it opts out
        // with AllowAnonymous(). Without this, forgetting a single RequireAuthorization() call
        // silently publishes an endpoint to the internet — which is how the inventory, vehicle
        // and EPC families ended up anonymous.
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        return services;
    }
}
