using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Orders.GetOrders;

public record OrderListDto(
    Guid Id,
    Guid TenantId,
    string OrderNumber,
    Guid? CustomerId,
    string CustomerName,
    string Status,
    string PaymentStatus,
    string PaymentMethod,
    string Currency,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal ShippingFee,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal RemainingAmount,
    int ItemsCount,
    string? TrackingNumber,
    string? Carrier,
    string? InvoiceNumber,
    DateTime OrderDate,
    DateTime? DueDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedOrdersResponse(
    List<OrderListDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record GetOrdersQuery(
    string? Status = null,
    string? PaymentStatus = null,
    Guid? CustomerId = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50) : IQuery<PagedOrdersResponse>;

public class GetOrdersHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetOrdersQuery, PagedOrdersResponse>
{
    public async Task<Result<PagedOrdersResponse>> Handle(GetOrdersQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var query = dbContext.Orders
            .Where(o => o.TenantId == tenantId)
            .Include(o => o.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(o => o.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.PaymentStatus))
        {
            query = query.Where(o => o.PaymentStatus == request.PaymentStatus);
        }

        if (request.CustomerId.HasValue)
        {
            query = query.Where(o => o.CustomerId == request.CustomerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(o =>
                o.OrderNumber.ToLower().Contains(search) ||
                o.CustomerName.ToLower().Contains(search) ||
                (o.InvoiceNumber != null && o.InvoiceNumber.ToLower().Contains(search)) ||
                (o.TrackingNumber != null && o.TrackingNumber.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 200 ? request.PageSize : 50;

        var items = await query
            .OrderByDescending(o => o.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrderListDto(
                o.Id,
                o.TenantId,
                o.OrderNumber,
                o.CustomerId,
                o.CustomerName,
                o.Status,
                o.PaymentStatus,
                o.PaymentMethod,
                o.Currency,
                o.Subtotal,
                o.DiscountAmount,
                o.TaxAmount,
                o.ShippingFee,
                o.TotalAmount,
                o.PaidAmount,
                o.TotalAmount - o.PaidAmount,
                o.Items.Count,
                o.TrackingNumber,
                o.Carrier,
                o.InvoiceNumber,
                o.OrderDate,
                o.DueDate,
                o.CreatedAt,
                o.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedOrdersResponse(items, totalCount, page, pageSize));
    }
}

public class GetOrdersEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/orders", async (
            string? status,
            string? paymentStatus,
            Guid? customerId,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetOrdersQuery(
                status,
                paymentStatus,
                customerId,
                search,
                page ?? 1,
                pageSize ?? 50), ct);

            return Results.Ok(ApiResponse<PagedOrdersResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.View")
        .WithName("GetOrders")
        .WithTags("Orders");
    }
}
