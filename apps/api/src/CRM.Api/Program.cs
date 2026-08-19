using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Extensions;
using CRM.BuildingBlocks.Messaging;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity;
using CRM.Modules.Tenants;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Setup
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}");
});

// 2. Add Building Blocks & Modules
var tenantAssembly = typeof(TenantsModuleExtensions).Assembly;
var identityAssembly = typeof(IdentityModuleExtensions).Assembly;

builder.Services.AddBuildingBlocks(builder.Configuration, tenantAssembly, identityAssembly);
builder.Services.AddTenantsModule(builder.Configuration);
builder.Services.AddIdentityModule(builder.Configuration);

// 3. MassTransit & RabbitMQ
builder.Services.AddMessaging(builder.Configuration, x =>
{
    IdentityModuleExtensions.ConfigureIdentityConsumers(x);
});

// 4. OpenAPI & Scalar
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info.Title = "CRM Modular Monolith API";
        document.Info.Version = "v1";
        document.Info.Description = ".NET 10 Modular Monolith with Local Supabase, Redis, and Multi-Tenancy (RLS).";
        return Task.CompletedTask;
    });
});

// 5. Health Checks
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Database")!, name: "postgresql", tags: ["db", "ready"])
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!, name: "redis", tags: ["cache", "ready"])
    .AddRabbitMQ(sp =>
    {
        var factory = new RabbitMQ.Client.ConnectionFactory
        {
            HostName = builder.Configuration["RabbitMq:Host"] ?? "localhost",
            Port = int.TryParse(builder.Configuration["RabbitMq:Port"], out var p) ? p : 5672,
            UserName = builder.Configuration["RabbitMq:Username"] ?? "guest",
            Password = builder.Configuration["RabbitMq:Password"] ?? "guest"
        };
        return factory.CreateConnectionAsync().GetAwaiter().GetResult();
    }, name: "rabbitmq", tags: ["messaging", "ready"]);

// 6. CORS Policy for Frontend (Next.js)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 7. Middlewares Pipeline
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("CRM API Reference")
               .WithTheme(ScalarTheme.Moon)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseMiddleware<TenantContextMiddleware>();
app.UseAuthorization();

// 8. Map Slices Endpoints
app.MapEndpoints();

// 9. Map HealthChecks
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapGet("/", () => Results.Redirect("/scalar/v1"));

app.Run();
