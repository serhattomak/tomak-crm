using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Customers.GetCustomerStats;

public record CustomerStatsDto(
    int TotalCustomers,
    int ActiveCustomers,
    int LeadCustomers,
    int ChurnedCustomers,
    int CompaniesCount,
    int IndividualsCount,
    int VipCount,
    int EnterpriseCount,
    decimal TotalRevenue,
    decimal AverageRevenuePerCustomer,
    string Currency);

public record GetCustomerStatsQuery() : IQuery<CustomerStatsDto>;

public class GetCustomerStatsHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCustomerStatsQuery, CustomerStatsDto>
{
    public async Task<Result<CustomerStatsDto>> Handle(GetCustomerStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var query = dbContext.Customers
            .Where(c => c.TenantId == tenantId)
            .AsNoTracking();

        var total = await query.CountAsync(cancellationToken);
        var active = await query.CountAsync(c => c.Status == "Active", cancellationToken);
        var leads = await query.CountAsync(c => c.Status == "Lead", cancellationToken);
        var churned = await query.CountAsync(c => c.Status == "Churned", cancellationToken);
        var companies = await query.CountAsync(c => c.Type == "Company", cancellationToken);
        var individuals = await query.CountAsync(c => c.Type == "Individual", cancellationToken);
        var vip = await query.CountAsync(c => c.Tier == "VIP", cancellationToken);
        var enterprise = await query.CountAsync(c => c.Tier == "Enterprise", cancellationToken);
        var totalRevenue = await query.SumAsync(c => c.TotalRevenue, cancellationToken);
        var avgRevenue = active > 0 ? totalRevenue / active : 0m;

        var stats = new CustomerStatsDto(
            total,
            active,
            leads,
            churned,
            companies,
            individuals,
            vip,
            enterprise,
            totalRevenue,
            Math.Round(avgRevenue, 2),
            "TRY");

        return Result.Success(stats);
    }
}

public class GetCustomerStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/customers/stats", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetCustomerStatsQuery(), ct);
            return Results.Ok(ApiResponse<CustomerStatsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.View")
        .WithName("GetCustomerStats")
        .WithTags("Customers");
    }
}
