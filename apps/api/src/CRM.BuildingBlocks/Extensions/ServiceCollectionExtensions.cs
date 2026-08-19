using System.Reflection;
using System.Text;
using CRM.BuildingBlocks.Behaviors;
using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CRM.BuildingBlocks.Extensions;

public static class ServiceCollectionExtensions
{
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

        return services;
    }

    public static IServiceCollection AddSupabaseAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSecret = configuration["Supabase:JwtSecret"] ?? "super-secret-jwt-token-with-at-least-32-characters-long";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
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

        services.AddAuthorization();

        return services;
    }
}
