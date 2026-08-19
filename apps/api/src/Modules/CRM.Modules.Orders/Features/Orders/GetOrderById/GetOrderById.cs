using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Orders.GetOrderById;

public record OrderItemDetailDto(
    Guid Id,
    Guid OrderId,
    Guid? ProductId,
    Guid? VariantId,
    string ProductName,
    string? SKU,
    string Unit,
    decimal UnitPrice,
    decimal UnitCost,
    decimal Quantity,
    decimal TaxRate,
    decimal DiscountRate,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalPrice,
    string? OptionsOrNotes,
    DateTime CreatedAt);

public record OrderPaymentDetailDto(
    Guid Id,
    Guid OrderId,
    decimal Amount,
    string PaymentMethod,
    string? ReferenceNumber,
    string? Notes,
    DateTime PaymentDate,
    DateTime CreatedAt);

public record OrderActivityDetailDto(
    Guid Id,
    Guid OrderId,
    string ActivityType,
    string Title,
    string? Description,
    DateTime CreatedAt);

public record OrderDetailDto(
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
    string? ShippingAddress,
    string? BillingAddress,
    string? TrackingNumber,
    string? Carrier,
    string? InvoiceNumber,
    string? Notes,
    DateTime OrderDate,
    DateTime? DueDate,
    List<OrderItemDetailDto> Items,
    List<OrderPaymentDetailDto> Payments,
    List<OrderActivityDetailDto> Activities,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GetOrderByIdQuery(Guid Id) : IQuery<OrderDetailDto>;

public class GetOrderByIdHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetOrderByIdQuery, OrderDetailDto>
{
    public async Task<Result<OrderDetailDto>> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var order = await dbContext.Orders
            .Where(o => o.Id == request.Id && o.TenantId == currentTenant.Id.Value)
            .Include(o => o.Items)
            .Include(o => o.Payments)
            .Include(o => o.Activities)
            .FirstOrDefaultAsync(cancellationToken);

        if (order == null)
        {
            throw new NotFoundException($"Order '{request.Id}' not found.");
        }

        var itemsDto = order.Items
            .OrderBy(i => i.CreatedAt)
            .Select(i => new OrderItemDetailDto(
                i.Id,
                i.OrderId,
                i.ProductId,
                i.VariantId,
                i.ProductName,
                i.SKU,
                i.Unit,
                i.UnitPrice,
                i.UnitCost,
                i.Quantity,
                i.TaxRate,
                i.DiscountRate,
                i.DiscountAmount,
                i.TaxAmount,
                i.TotalPrice,
                i.OptionsOrNotes,
                i.CreatedAt))
            .ToList();

        var paymentsDto = order.Payments
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new OrderPaymentDetailDto(
                p.Id,
                p.OrderId,
                p.Amount,
                p.PaymentMethod,
                p.ReferenceNumber,
                p.Notes,
                p.PaymentDate,
                p.CreatedAt))
            .ToList();

        var activitiesDto = order.Activities
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new OrderActivityDetailDto(
                a.Id,
                a.OrderId,
                a.ActivityType,
                a.Title,
                a.Description,
                a.CreatedAt))
            .ToList();

        var detail = new OrderDetailDto(
            order.Id,
            order.TenantId,
            order.OrderNumber,
            order.CustomerId,
            order.CustomerName,
            order.Status,
            order.PaymentStatus,
            order.PaymentMethod,
            order.Currency,
            order.Subtotal,
            order.DiscountAmount,
            order.TaxAmount,
            order.ShippingFee,
            order.TotalAmount,
            order.PaidAmount,
            order.TotalAmount - order.PaidAmount,
            order.ShippingAddress,
            order.BillingAddress,
            order.TrackingNumber,
            order.Carrier,
            order.InvoiceNumber,
            order.Notes,
            order.OrderDate,
            order.DueDate,
            itemsDto,
            paymentsDto,
            activitiesDto,
            order.CreatedAt,
            order.UpdatedAt);

        return Result.Success(detail);
    }
}

public class GetOrderByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/orders/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetOrderByIdQuery(id), ct);
            return Results.Ok(ApiResponse<OrderDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.View")
        .WithName("GetOrderById")
        .WithTags("Orders");
    }
}
