using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.ConvertToOrder;

public record AcceptQuoteCommand(Guid Id, AcceptQuoteRequest Request) : ICommand<Guid>;
public record ConvertToOrderCommand(Guid Id) : ICommand<Guid>;

public class ConvertToOrderHandler(
    OrdersDbContext dbContext,
    CustomersDbContext customersDbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AcceptQuoteCommand, Guid>, ICommandHandler<ConvertToOrderCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AcceptQuoteCommand request, CancellationToken cancellationToken)
    {
        return await ProcessConversion(request.Id, request.Request.AutoConvertToOrder, cancellationToken);
    }

    public async Task<Result<Guid>> Handle(ConvertToOrderCommand request, CancellationToken cancellationToken)
    {
        return await ProcessConversion(request.Id, true, cancellationToken);
    }

    private async Task<Result<Guid>> ProcessConversion(Guid quoteId, bool createOrder, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var quote = await dbContext.Quotes
            .Include(q => q.Items)
            .Include(q => q.Activities)
            .FirstOrDefaultAsync(q => q.Id == quoteId && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{quoteId}' was not found.");
        }

        quote.Status = "Accepted";
        quote.AcceptedAt = DateTime.UtcNow;
        quote.UpdatedAt = DateTime.UtcNow;

        Guid orderId = Guid.Empty;

        if (createOrder)
        {
            // 1. Generate Order Number
            var todayStr = DateTime.UtcNow.ToString("yyyyMMdd");
            var countToday = await dbContext.Orders
                .Where(o => o.TenantId == tenantId && o.CreatedAt >= DateTime.UtcNow.Date)
                .CountAsync(cancellationToken);
            var orderNumber = $"ORD-{todayStr}-{(countToday + 1):D4}";

            orderId = Guid.NewGuid();

            var orderItems = quote.Items
                .Where(i => i.IsSelected)
                .Select(item => new OrderItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    OrderId = orderId,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    ProductName = item.ProductName,
                    SKU = item.SKU,
                    Unit = item.Unit,
                    UnitPrice = item.UnitPrice,
                    UnitCost = item.UnitCost,
                    Quantity = item.Quantity,
                    TaxRate = item.TaxRate,
                    DiscountRate = item.DiscountRate,
                    DiscountAmount = item.DiscountAmount,
                    TaxAmount = item.TaxAmount,
                    TotalPrice = item.TotalPrice,
                    OptionsOrNotes = item.Description,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

            var order = new Order
            {
                Id = orderId,
                TenantId = tenantId,
                OrderNumber = orderNumber,
                CustomerId = quote.CustomerId,
                CustomerName = quote.CustomerName,
                Status = "Confirmed",
                PaymentStatus = "Unpaid",
                PaymentMethod = "BankTransfer",
                Currency = quote.Currency,
                Subtotal = quote.Subtotal,
                DiscountAmount = quote.DiscountAmount,
                TaxAmount = quote.TaxAmount,
                ShippingFee = 0.00m,
                TotalAmount = quote.TotalAmount,
                PaidAmount = 0.00m,
                Notes = $"Bu sipariş {quote.QuoteNumber} R{quote.RevisionNumber} numaralı teklifin kabul edilmesiyle otomatik oluşturulmuştur.",
                OrderDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Items = orderItems
            };

            order.Activities.Add(new OrderActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderId = orderId,
                ActivityType = "Created",
                Title = "Tekliften Sipariş Oluşturuldu",
                Description = $"{quote.QuoteNumber} numaralı teklif onaylanarak {orderNumber} numaralı siparişe dönüştürüldü.",
                CreatedAt = DateTime.UtcNow
            });

            dbContext.Orders.Add(order);
            quote.ConvertedOrderId = orderId;

            quote.Activities.Add(new QuoteActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = quote.Id,
                ActivityType = "ConvertedToOrder",
                Title = "Teklif Kabul Edildi & Siparişe Dönüştü",
                Description = $"Teklif müşteri tarafından kabul edildi ve {orderNumber} numaralı sipariş oluşturuldu.",
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            quote.Activities.Add(new QuoteActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = quote.Id,
                ActivityType = "Accepted",
                Title = "Teklif Kabul Edildi",
                Description = "Teklif müşteri tarafından kabul edildi olarak işaretlendi.",
                CreatedAt = DateTime.UtcNow
            });
        }

        // 2. If quote has linked DealId, update Deal stage to Won
        if (quote.DealId.HasValue)
        {
            var deal = await customersDbContext.Deals
                .Include(d => d.Pipeline!)
                .ThenInclude(p => p.Stages)
                .FirstOrDefaultAsync(d => d.Id == quote.DealId.Value && d.TenantId == tenantId, cancellationToken);

            if (deal != null)
            {
                // Find Won stage in pipeline (or highest probability stage / order index)
                var wonStage = deal.Pipeline?.Stages
                    .OrderByDescending(s => s.Probability)
                    .ThenByDescending(s => s.OrderIndex)
                    .FirstOrDefault();

                if (wonStage != null)
                {
                    deal.StageId = wonStage.Id;
                    deal.Stage = wonStage;
                }

                deal.Status = "Won";
                deal.WonReason = $"{quote.QuoteNumber} numaralı teklif kabul edildi";
                deal.UpdatedAt = DateTime.UtcNow;

                customersDbContext.DealActivities.Add(new DealActivity
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    DealId = deal.Id,
                    ActivityType = "StageChange",
                    Title = "Fırsat Kazanıldı (Teklif Onaylandı)",
                    Description = $"{quote.QuoteNumber} numaralı teklif kabul edildiği için fırsat 'Kazanıldı' aşamasına taşındı.",
                    OldValue = deal.Status,
                    NewValue = "Won",
                    CreatedAt = DateTime.UtcNow
                });

                await customersDbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(orderId != Guid.Empty ? orderId : quote.Id);
    }
}

public class ConvertToOrderEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes/{id:guid}/accept", async (
            Guid id,
            AcceptQuoteRequest? request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AcceptQuoteCommand(id, request ?? new AcceptQuoteRequest()), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Update")
        .WithName("AcceptQuote")
        .WithTags("Quotes");

        app.MapPost("/api/quotes/{id:guid}/convert-to-order", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ConvertToOrderCommand(id), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Update")
        .WithName("ConvertToOrder")
        .WithTags("Quotes");
    }
}
