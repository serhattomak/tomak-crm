using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Orders.GetOrderStats;

public record OrderStatsDto(
    int TotalOrders,
    int PendingOrders,
    int ConfirmedOrders,
    int ProcessingOrders,
    int ShippedOrders,
    int DeliveredOrders,
    int CancelledOrders,
    decimal TotalRevenue,
    decimal PaidRevenue,
    decimal UnpaidRevenue,
    string Currency);

public record GetOrderStatsQuery() : IQuery<OrderStatsDto>;

public class GetOrderStatsHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetOrderStatsQuery, OrderStatsDto>
{
    public async Task<Result<OrderStatsDto>> Handle(GetOrderStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var orders = await dbContext.Orders
            .Where(o => o.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var total = orders.Count;
        var pending = orders.Count(o => o.Status is "Draft" or "PendingApproval");
        var confirmed = orders.Count(o => o.Status == "Confirmed");
        var processing = orders.Count(o => o.Status == "Processing");
        var shipped = orders.Count(o => o.Status == "Shipped");
        var delivered = orders.Count(o => o.Status == "Delivered");
        var cancelled = orders.Count(o => o.Status is "Cancelled" or "Refunded");

        var nonCancelledOrders = orders.Where(o => o.Status != "Cancelled").ToList();
        var totalRevenue = nonCancelledOrders.Sum(o => o.TotalAmount);
        var paidRevenue = nonCancelledOrders.Sum(o => o.PaidAmount);
        var unpaidRevenue = Math.Max(0, totalRevenue - paidRevenue);

        var stats = new OrderStatsDto(
            total,
            pending,
            confirmed,
            processing,
            shipped,
            delivered,
            cancelled,
            totalRevenue,
            paidRevenue,
            unpaidRevenue,
            "TRY");

        return Result.Success(stats);
    }
}

public class GetOrderStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/orders/stats", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetOrderStatsQuery(), ct);
            return Results.Ok(ApiResponse<OrderStatsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.View")
        .WithName("GetOrderStats")
        .WithTags("Orders");
    }
}
