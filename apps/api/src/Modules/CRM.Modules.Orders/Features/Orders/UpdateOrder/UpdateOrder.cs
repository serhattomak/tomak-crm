using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Orders.UpdateOrder;

public record UpdateOrderItemDto(
    Guid? Id,
    Guid? ProductId,
    Guid? VariantId,
    string ProductName,
    string? SKU,
    string? Unit,
    decimal UnitPrice,
    decimal? UnitCost,
    decimal Quantity,
    decimal? TaxRate,
    decimal? DiscountRate,
    string? OptionsOrNotes);

public record UpdateOrderRequest(
    Guid? CustomerId,
    string CustomerName,
    string? PaymentMethod,
    string? Currency,
    decimal? ShippingFee,
    decimal? GeneralDiscountAmount,
    string? ShippingAddress,
    string? BillingAddress,
    string? TrackingNumber,
    string? Carrier,
    string? InvoiceNumber,
    string? Notes,
    DateTime? OrderDate,
    DateTime? DueDate,
    List<UpdateOrderItemDto> Items);

public record UpdateOrderCommand(Guid Id, UpdateOrderRequest Request) : ICommand<bool>;

public class UpdateOrderValidator : AbstractValidator<UpdateOrderCommand>
{
    public UpdateOrderValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.CustomerName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Items).NotEmpty().WithMessage("At least one order item is required.");
    }
}

public class UpdateOrderHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateOrderCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateOrderCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var order = await dbContext.Orders
            .Include(o => o.Items)
            .Include(o => o.Activities)
            .FirstOrDefaultAsync(o => o.Id == request.Id && o.TenantId == tenantId, cancellationToken);

        if (order == null)
        {
            throw new NotFoundException($"Order '{request.Id}' not found.");
        }

        var req = request.Request;
        var currency = !string.IsNullOrWhiteSpace(req.Currency) ? req.Currency.Trim() : order.Currency;
        var shippingFee = req.ShippingFee ?? 0.00m;
        var generalDiscount = req.GeneralDiscountAmount ?? 0.00m;

        decimal subtotal = 0.00m;
        decimal totalTax = 0.00m;
        decimal totalItemDiscount = 0.00m;

        dbContext.OrderItems.RemoveRange(order.Items);

        var newOrderItems = new List<OrderItem>();
        foreach (var item in req.Items)
        {
            var qty = item.Quantity > 0 ? item.Quantity : 1.00m;
            var unitPrice = item.UnitPrice >= 0 ? item.UnitPrice : 0.00m;
            var unitCost = item.UnitCost ?? 0.00m;
            var taxRate = item.TaxRate ?? 20.00m;
            var discountRate = item.DiscountRate ?? 0.00m;

            var rawPrice = unitPrice * qty;
            var itemDiscount = discountRate > 0 ? (rawPrice * (discountRate / 100.00m)) : 0.00m;
            var priceAfterDiscount = Math.Max(0, rawPrice - itemDiscount);
            var itemTax = taxRate > 0 ? (priceAfterDiscount * (taxRate / 100.00m)) : 0.00m;
            var totalPrice = priceAfterDiscount + itemTax;

            subtotal += priceAfterDiscount;
            totalTax += itemTax;
            totalItemDiscount += itemDiscount;

            newOrderItems.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderId = order.Id,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                ProductName = item.ProductName.Trim(),
                SKU = item.SKU?.Trim(),
                Unit = !string.IsNullOrWhiteSpace(item.Unit) ? item.Unit.Trim() : "Adet",
                UnitPrice = unitPrice,
                UnitCost = unitCost,
                Quantity = qty,
                TaxRate = taxRate,
                DiscountRate = discountRate,
                DiscountAmount = itemDiscount,
                TaxAmount = itemTax,
                TotalPrice = totalPrice,
                OptionsOrNotes = item.OptionsOrNotes?.Trim(),
                CreatedAt = DateTime.UtcNow
            });
        }

        var totalAmount = Math.Max(0, (subtotal - generalDiscount) + totalTax + shippingFee);

        order.CustomerId = req.CustomerId;
        order.CustomerName = req.CustomerName.Trim();
        order.PaymentMethod = !string.IsNullOrWhiteSpace(req.PaymentMethod) ? req.PaymentMethod : order.PaymentMethod;
        order.Currency = currency;
        order.Subtotal = subtotal;
        order.DiscountAmount = totalItemDiscount + generalDiscount;
        order.TaxAmount = totalTax;
        order.ShippingFee = shippingFee;
        order.TotalAmount = totalAmount;
        order.ShippingAddress = req.ShippingAddress?.Trim();
        order.BillingAddress = req.BillingAddress?.Trim();
        order.TrackingNumber = req.TrackingNumber?.Trim();
        order.Carrier = req.Carrier?.Trim();
        order.InvoiceNumber = req.InvoiceNumber?.Trim();
        order.Notes = req.Notes?.Trim();
        order.OrderDate = req.OrderDate ?? order.OrderDate;
        order.DueDate = req.DueDate;
        order.UpdatedAt = DateTime.UtcNow;
        order.Items = newOrderItems;

        order.Activities.Add(new OrderActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OrderId = order.Id,
            ActivityType = "ItemUpdated",
            Title = "Sipariş Güncellendi",
            Description = $"Sipariş bilgileri ve kalemleri güncellendi. Yeni Toplam Tutar: {totalAmount:N2} {currency}",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class UpdateOrderEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/orders/{id:guid}", async (
            Guid id,
            UpdateOrderRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateOrderCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.Update")
        .WithName("UpdateOrder")
        .WithTags("Orders");
    }
}
