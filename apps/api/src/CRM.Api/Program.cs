using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Extensions;
using CRM.BuildingBlocks.Messaging;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity;
using CRM.Modules.Organization;
using CRM.Modules.Tenants;
using CRM.Modules.Customers;
using CRM.Modules.Products;
using CRM.Modules.Orders;
using CRM.Modules.Leaves;
using CRM.Modules.Payroll;
using CRM.Modules.Attendance;
using CRM.Modules.Chat;
using CRM.Modules.Shipping;
using CRM.Modules.Automations;
using CRM.Modules.Compliance;
using CRM.Modules.Recruitment;
using CRM.Modules.Promotions;
using CRM.Modules.Projects;
using CRM.Modules.Vehicles;
using CRM.Modules.Email;
using CRM.Modules.Invoicing;
using CRM.Modules.Activities;
using CRM.Modules.Contracts;
using CRM.Modules.FieldService;
using CRM.Modules.FieldService.Features;
using CRM.Api.Jobs;
using CRM.BuildingBlocks.Realtime;
using CRM.BuildingBlocks.Security;
using Quartz;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Scalar.AspNetCore;
using Serilog;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 0. Refuse to boot outside Development with the checked-in demo credentials.
CRM.BuildingBlocks.Extensions.ServiceCollectionExtensions.EnsureProductionSecretsAreOverridden(
    builder.Configuration,
    builder.Environment);

// 1. Serilog Logging Configuration
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
var organizationAssembly = typeof(OrganizationModuleExtensions).Assembly;
var customersAssembly = typeof(CustomersModuleExtensions).Assembly;
var productsAssembly = typeof(ProductsModuleExtensions).Assembly;
var ordersAssembly = typeof(OrdersModuleExtensions).Assembly;
var leavesAssembly = typeof(LeavesModuleExtensions).Assembly;
var payrollAssembly = typeof(PayrollModuleExtensions).Assembly;
var attendanceAssembly = typeof(AttendanceModuleExtensions).Assembly;
var chatAssembly = typeof(ChatModuleExtensions).Assembly;
var shippingAssembly = typeof(ShippingModuleExtensions).Assembly;
var automationsAssembly = typeof(AutomationsModuleExtensions).Assembly;
var complianceAssembly = typeof(ComplianceModuleExtensions).Assembly;
var recruitmentAssembly = typeof(RecruitmentModuleExtensions).Assembly;
var promotionsAssembly = typeof(PromotionsModuleExtensions).Assembly;
var projectsAssembly = typeof(ProjectsModuleExtensions).Assembly;
var vehiclesAssembly = typeof(VehiclesModuleExtensions).Assembly;
var emailAssembly = typeof(EmailModuleExtensions).Assembly;
var invoicingAssembly = typeof(InvoicingModuleExtensions).Assembly;
var activitiesAssembly = typeof(ActivitiesModuleExtensions).Assembly;
var contractsAssembly = typeof(ContractsModuleExtensions).Assembly;
var fieldServiceAssembly = typeof(FieldServiceModuleExtensions).Assembly;
var apiAssembly = typeof(Program).Assembly;

builder.Services.AddBuildingBlocks(builder.Configuration, tenantAssembly, identityAssembly, organizationAssembly, customersAssembly, productsAssembly, ordersAssembly, leavesAssembly, payrollAssembly, attendanceAssembly, chatAssembly, shippingAssembly, automationsAssembly, complianceAssembly, recruitmentAssembly, promotionsAssembly, projectsAssembly, vehiclesAssembly, emailAssembly, invoicingAssembly, activitiesAssembly, contractsAssembly, fieldServiceAssembly, apiAssembly);
builder.Services.AddTenantsModule(builder.Configuration);
builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddOrganizationModule(builder.Configuration);
builder.Services.AddCustomersModule(builder.Configuration);
builder.Services.AddProductsModule(builder.Configuration);
builder.Services.AddOrdersModule(builder.Configuration);
builder.Services.AddLeavesModule(builder.Configuration);
builder.Services.AddPayrollModule(builder.Configuration);
builder.Services.AddAttendanceModule(builder.Configuration);
builder.Services.AddChatModule(builder.Configuration);
builder.Services.AddShippingModule(builder.Configuration);
builder.Services.AddAutomationsModule(builder.Configuration);
builder.Services.AddComplianceModule(builder.Configuration);
builder.Services.AddRecruitmentModule(builder.Configuration);
builder.Services.AddPromotionsModule(builder.Configuration);
builder.Services.AddProjectsModule(builder.Configuration);
builder.Services.AddVehiclesModule(builder.Configuration);
builder.Services.AddEmailModule(builder.Configuration);
builder.Services.AddInvoicingModule(builder.Configuration);
builder.Services.AddActivitiesModule(builder.Configuration);
builder.Services.AddContractsModule(builder.Configuration);
builder.Services.AddFieldServiceModule(builder.Configuration);

// 3. MassTransit & RabbitMQ
builder.Services.AddMessaging(builder.Configuration, x =>
{
    IdentityModuleExtensions.ConfigureIdentityConsumers(x);
});

// 4. Quartz.NET Background Job Scheduler
builder.Services.AddQuartz(q =>
{
    var quoteJobKey = new JobKey("QuoteExpirationJob");
    q.AddJob<QuoteExpirationJob>(opts => opts.WithIdentity(quoteJobKey));
    q.AddTrigger(opts => opts
        .ForJob(quoteJobKey)
        .WithIdentity("QuoteExpirationJob-trigger")
        .WithSimpleSchedule(x => x.WithIntervalInHours(1).RepeatForever()));

    var slaJobKey = new JobKey("SlaCheckJob");
    q.AddJob<SlaCheckJob>(opts => opts.WithIdentity(slaJobKey));
    q.AddTrigger(opts => opts
        .ForJob(slaJobKey)
        .WithIdentity("SlaCheckJob-trigger")
        .WithSimpleSchedule(x => x.WithIntervalInMinutes(5).RepeatForever()));
});
builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

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

// 6. CORS Policy for Frontend (Next.js & Tunnel)
// The browser normally calls the API through the Next proxy, so this policy exists
// for direct dev/tunnel origins. Credentials are allowed, which is exactly why the
// origin must be an explicit list: "any origin + credentials" lets any site read
// authenticated responses.
var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()?
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim().TrimEnd('/'))
    .ToArray() ?? [];

var allowedOrigins = configuredOrigins.Length > 0
    ? configuredOrigins
    :
    [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3210", "http://127.0.0.1:3210",
    ];

// Suffixes are matched on the host with a leading dot, so ".trycloudflare.com"
// cannot match "eviltrycloudflare.com". Development only unless configured.
var configuredSuffixes = builder.Configuration
    .GetSection("Cors:AllowedOriginSuffixes")
    .Get<string[]>()?
    .Where(suffix => !string.IsNullOrWhiteSpace(suffix))
    .Select(suffix => suffix.Trim())
    .ToArray() ?? [];

var allowedSuffixes = configuredSuffixes.Length > 0
    ? configuredSuffixes
    : builder.Environment.IsDevelopment() ? [".trycloudflare.com"] : [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                  if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                  {
                      return false;
                  }

                  var normalized = $"{uri.Scheme}://{uri.Authority}";
                  return allowedOrigins.Contains(normalized, StringComparer.OrdinalIgnoreCase)
                      || allowedSuffixes.Any(suffix =>
                          uri.Host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase));
              })
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
    // Development-only docs. The fallback authorization policy would otherwise require a token.
    app.MapOpenApi().AllowAnonymous();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("CRM API Reference")
               .WithTheme(ScalarTheme.Moon)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    }).AllowAnonymous();
}

app.UseCors("AllowFrontend");
app.UseStaticFiles();

app.UseAuthentication();
app.UseMiddleware<TenantContextMiddleware>();
app.UseAuthorization();

// 8. Map Slices Endpoints
app.MapEndpoints();
app.MapVehiclesModuleEndpoints();
app.MapEmailEndpoints();
app.MapFieldServiceEndpoints();
app.MapHub<CrmHub>("/hubs/crm").RequireAuthorization();

// 9. Health Checks
// The anonymous probe answers liveness only. The dependency report names internal
// services (Postgres, Redis, RabbitMQ) and is a platform-admin surface.
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = (context, report) =>
    {
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsync(JsonSerializer.Serialize(new { status = report.Status.ToString() }));
    }
}).AllowAnonymous();

app.MapGet("/health/detailed", async (
    ICurrentUser currentUser,
    IPermissionService permissionService,
    HealthCheckService healthCheckService,
    CancellationToken ct) =>
{
    if (currentUser.Id is not { } userId
        || !await permissionService.IsSuperAdminAsync(userId, ct))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var report = await healthCheckService.CheckHealthAsync(ct);
    return Results.Ok(new
    {
        status = report.Status.ToString(),
        entries = report.Entries.ToDictionary(
            entry => entry.Key,
            entry => new
            {
                status = entry.Value.Status.ToString(),
                duration = entry.Value.Duration,
                description = entry.Value.Description,
            }),
    });
}).RequireAuthorization();

app.MapGet("/", () => Results.Redirect("/scalar/v1")).AllowAnonymous();

app.Run();
