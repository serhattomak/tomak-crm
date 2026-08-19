using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Orders.CreateOrder;

public record CreateOrderItemRequest(
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

public record CreateOrderRequest(
    Guid? CustomerId,
    string CustomerName,
    string? Status, // "Draft", "Confirmed", etc.
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
    List<CreateOrderItemRequest> Items);

public record CreateOrderCommand(CreateOrderRequest Request) : ICommand<Guid>;

public class CreateOrderValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.Request.CustomerName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Items).NotEmpty().WithMessage("At least one order item is required.");
    }
}

public class CreateOrderHandler(
    OrdersDbContext dbContext,
    ProductsDbContext productsDbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateOrderCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = request.Request;

        // 1. Generate Order Number
        var todayStr = DateTime.UtcNow.ToString("yyyyMMdd");
        var countToday = await dbContext.Orders
            .Where(o => o.TenantId == tenantId && o.CreatedAt >= DateTime.UtcNow.Date)
            .CountAsync(cancellationToken);
        var orderNumber = $"ORD-{todayStr}-{(countToday + 1):D4}";

        var orderId = Guid.NewGuid();
        var status = !string.IsNullOrWhiteSpace(req.Status) ? req.Status : "Draft";
        var currency = !string.IsNullOrWhiteSpace(req.Currency) ? req.Currency.Trim() : "TRY";
        var shippingFee = req.ShippingFee ?? 0.00m;
        var generalDiscount = req.GeneralDiscountAmount ?? 0.00m;

        decimal subtotal = 0.00m;
        decimal totalTax = 0.00m;
        decimal totalItemDiscount = 0.00m;

        var orderItems = new List<OrderItem>();

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

            orderItems.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderId = orderId,
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

        var order = new Order
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = orderNumber,
            CustomerId = req.CustomerId,
            CustomerName = req.CustomerName.Trim(),
            Status = status,
            PaymentStatus = "Unpaid",
            PaymentMethod = !string.IsNullOrWhiteSpace(req.PaymentMethod) ? req.PaymentMethod : "BankTransfer",
            Currency = currency,
            Subtotal = subtotal,
            DiscountAmount = totalItemDiscount + generalDiscount,
            TaxAmount = totalTax,
            ShippingFee = shippingFee,
            TotalAmount = totalAmount,
            PaidAmount = 0.00m,
            ShippingAddress = req.ShippingAddress?.Trim(),
            BillingAddress = req.BillingAddress?.Trim(),
            TrackingNumber = req.TrackingNumber?.Trim(),
            Carrier = req.Carrier?.Trim(),
            InvoiceNumber = req.InvoiceNumber?.Trim(),
            Notes = req.Notes?.Trim(),
            OrderDate = req.OrderDate ?? DateTime.UtcNow,
            DueDate = req.DueDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = orderItems
        };

        // Activity log
        order.Activities.Add(new OrderActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OrderId = orderId,
            ActivityType = "Created",
            Title = "Sipariş Oluşturuldu",
            Description = $"{orderNumber} numaralı sipariş {req.CustomerName} müşterisi için {totalAmount:N2} {currency} tutarında oluşturuldu. (Durum: {status})",
            CreatedAt = DateTime.UtcNow
        });

        // If initial status is Confirmed, adjust product inventory
        if (status is "Confirmed" or "Processing" or "Shipped" or "Delivered")
        {
            foreach (var item in orderItems.Where(i => i.ProductId.HasValue))
            {
                var prod = await productsDbContext.Products
                    .Include(p => p.Variants)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId!.Value && p.TenantId == tenantId, cancellationToken);

                if (prod != null && prod.TrackInventory && prod.Type == "Physical")
                {
                    var prevStock = prod.CurrentStock;
                    var newStock = Math.Max(0, prevStock - item.Quantity);
                    prod.CurrentStock = newStock;
                    prod.UpdatedAt = DateTime.UtcNow;

                    if (item.VariantId.HasValue)
                    {
                        var variant = prod.Variants.FirstOrDefault(v => v.Id == item.VariantId.Value);
                        if (variant != null)
                        {
                            variant.StockQuantity = Math.Max(0, variant.StockQuantity - item.Quantity);
                            variant.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    productsDbContext.ProductStockMovements.Add(new ProductStockMovement
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        ProductId = prod.Id,
                        VariantId = item.VariantId,
                        MovementType = "Out",
                        Quantity = item.Quantity,
                        PreviousStock = prevStock,
                        NewStock = newStock,
                        UnitCost = item.UnitCost,
                        ReferenceNumber = orderNumber,
                        Reason = $"Sipariş Satışı ({orderNumber})",
                        Notes = $"Müşteri: {req.CustomerName}",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await productsDbContext.SaveChangesAsync(cancellationToken);
        }

        dbContext.Orders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(order.Id);
    }
}

public class CreateOrderEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/orders", async (
            CreateOrderRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CreateOrderCommand(request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.Create")
        .WithName("CreateOrder")
        .WithTags("Orders");
    }
}
