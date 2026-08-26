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
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddBuildingBlocks(builder.Configuration, tenantAssembly, identityAssembly, organizationAssembly, customersAssembly, productsAssembly, ordersAssembly, leavesAssembly, payrollAssembly, attendanceAssembly, chatAssembly, shippingAssembly, automationsAssembly, complianceAssembly, recruitmentAssembly);
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

// 6. CORS Policy for Frontend (Next.js & Tunnel)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
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
