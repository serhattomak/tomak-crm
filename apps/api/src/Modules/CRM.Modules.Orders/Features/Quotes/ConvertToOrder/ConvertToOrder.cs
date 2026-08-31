using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.ConvertToOrder;

public record AcceptQuoteCommand(Guid Id, AcceptQuoteRequest Request) : ICommand<Guid>;
public record ConvertToOrderCommand(Guid Id, ConvertToOrderRequest? Request) : ICommand<Guid>;

public class ConvertToOrderValidator : AbstractValidator<ConvertToOrderCommand>
{
    private static readonly string[] ValidPaymentMethods =
    [
        "BankTransfer",
        "CreditCard",
        "Cash",
        "Check",
        "OpenAccount"
    ];

    public ConvertToOrderValidator()
    {
        When(x => x.Request != null && !string.IsNullOrWhiteSpace(x.Request.PaymentMethod), () =>
        {
            RuleFor(x => x.Request!.PaymentMethod!)
                .Must(m => ValidPaymentMethods.Contains(m.Trim()))
                .WithMessage($"Geçersiz ödeme yöntemi. İzin verilenler: {string.Join(", ", ValidPaymentMethods)}");
        });

        When(x => x.Request != null && x.Request.ShippingFee.HasValue, () =>
        {
            RuleFor(x => x.Request!.ShippingFee!.Value)
                .GreaterThanOrEqualTo(0)
                .WithMessage("Kargo ücreti negatif olamaz.");
        });
    }
}

public class AcceptQuoteValidator : AbstractValidator<AcceptQuoteCommand>
{
    private static readonly string[] ValidPaymentMethods =
    [
        "BankTransfer",
        "CreditCard",
        "Cash",
        "Check",
        "OpenAccount"
    ];

    public AcceptQuoteValidator()
    {
        When(x => x.Request.Overrides != null && !string.IsNullOrWhiteSpace(x.Request.Overrides.PaymentMethod), () =>
        {
            RuleFor(x => x.Request.Overrides!.PaymentMethod!)
                .Must(m => ValidPaymentMethods.Contains(m.Trim()))
                .WithMessage($"Geçersiz ödeme yöntemi. İzin verilenler: {string.Join(", ", ValidPaymentMethods)}");
        });
    }
}

public class ConvertToOrderHandler(
    OrdersDbContext dbContext,
    CustomersDbContext customersDbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AcceptQuoteCommand, Guid>, ICommandHandler<ConvertToOrderCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AcceptQuoteCommand request, CancellationToken cancellationToken)
    {
        return await ProcessConversion(request.Id, request.Request.AutoConvertToOrder, request.Request.Overrides, cancellationToken);
    }

    public async Task<Result<Guid>> Handle(ConvertToOrderCommand request, CancellationToken cancellationToken)
    {
        return await ProcessConversion(request.Id, true, request.Request, cancellationToken);
    }

    private async Task<Result<Guid>> ProcessConversion(Guid quoteId, bool createOrder, ConvertToOrderRequest? overrides, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var quote = await dbContext.Quotes
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == quoteId && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{quoteId}' was not found.");
        }

        // Guard: prevent double conversion — 409 Conflict
        if (quote.ConvertedOrderId.HasValue && quote.ConvertedOrderId.Value != Guid.Empty)
        {
            throw new ConflictException("Bu teklif zaten siparişe çevrilmiş");
        }

        if (createOrder && quote.ConvertedOrderId.HasValue)
        {
            throw new ConflictException("Bu teklif zaten siparişe çevrilmiş");
        }

        await using var tx = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
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

                // Resolve payment method — quote -> override -> fallback BankTransfer, validate VARCHAR
                var rawPaymentMethod = !string.IsNullOrWhiteSpace(overrides?.PaymentMethod)
                    ? overrides!.PaymentMethod!.Trim()
                    : (!string.IsNullOrWhiteSpace(quote.PaymentMethod) ? quote.PaymentMethod!.Trim() : "BankTransfer");

                var allowedMethods = new HashSet<string> { "BankTransfer", "CreditCard", "Cash", "Check", "OpenAccount" };
                var effectivePaymentMethod = allowedMethods.Contains(rawPaymentMethod) ? rawPaymentMethod : "BankTransfer";

                // Resolve DueDate — override.DueDate > quote.PaymentDueDate > quote.ValidUntil
                DateTime? effectiveDueDate = null;
                if (overrides?.DueDate.HasValue == true)
                {
                    var d = overrides.DueDate.Value;
                    effectiveDueDate = d.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(d.Date, DateTimeKind.Utc)
                        : d.Date;
                }
                else if (quote.PaymentDueDate.HasValue)
                {
                    var d = quote.PaymentDueDate.Value;
                    effectiveDueDate = d.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(d.Date, DateTimeKind.Utc) : d.Date;
                }
                else if (quote.ValidUntil.HasValue)
                {
                    var d = quote.ValidUntil.Value;
                    effectiveDueDate = d.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(d.Date, DateTimeKind.Utc) : d.Date;
                }

                var effectiveShippingFee = overrides?.ShippingFee ?? 0m;
                if (effectiveShippingFee < 0) effectiveShippingFee = 0m;

                var effectiveNotes = !string.IsNullOrWhiteSpace(overrides?.Notes)
                    ? overrides!.Notes!.Trim()
                    : $"Bu sipariş {quote.QuoteNumber} R{quote.RevisionNumber} numaralı teklifin kabul edilmesiyle otomatik oluşturulmuştur.";

                // Build order items — preview filtering with isSelected + quantity/unit_price overrides
                List<OrderItem> orderItems;
                decimal subtotal;
                decimal itemsDiscount;
                decimal totalTax;

                var hasItemOverrides = overrides?.Items != null && overrides.Items.Count > 0;

                if (hasItemOverrides)
                {
                    // Build lookup for quote items by id and by productId+name
                    var quoteById = quote.Items.ToDictionary(i => i.Id);
                    orderItems = [];
                    subtotal = 0m;
                    itemsDiscount = 0m;
                    totalTax = 0m;

                    foreach (var ov in overrides!.Items!)
                    {
                        QuoteItem? baseItem = null;
                        if (ov.QuoteItemId.HasValue && quoteById.TryGetValue(ov.QuoteItemId.Value, out var found))
                        {
                            baseItem = found;
                        }
                        else if (ov.ProductId.HasValue)
                        {
                            baseItem = quote.Items.FirstOrDefault(qi => qi.ProductId == ov.ProductId);
                        }

                        // If no baseItem found and ov has ProductName, treat as new line; otherwise skip
                        if (baseItem == null && string.IsNullOrWhiteSpace(ov.ProductName))
                        {
                            continue;
                        }

                        var isSelected = ov.IsSelected ?? baseItem?.IsSelected ?? true;
                        if (!isSelected)
                        {
                            continue;
                        }

                        var qty = ov.Quantity ?? baseItem?.Quantity ?? 1m;
                        qty = qty > 0 ? qty : 1m;

                        var unitPrice = ov.UnitPrice ?? baseItem?.UnitPrice ?? 0m;
                        unitPrice = unitPrice >= 0 ? unitPrice : 0m;

                        var baseQty = qty;
                        var baseUnitPrice = unitPrice;
                        var discRate = baseItem?.DiscountRate ?? 0m;
                        var taxRate = baseItem?.TaxRate ?? 20m;
                        discRate = Math.Clamp(discRate, 0, 100);
                        taxRate = Math.Clamp(taxRate, 0, 100);

                        var itemSubtotal = baseQty * baseUnitPrice;
                        var itemDisc = itemSubtotal * (discRate / 100m);
                        var taxable = itemSubtotal - itemDisc;
                        var itemTax = taxable * (taxRate / 100m);
                        var itemTotal = taxable + itemTax;

                        subtotal += itemSubtotal;
                        itemsDiscount += itemDisc;
                        totalTax += itemTax;

                        orderItems.Add(new OrderItem
                        {
                            Id = Guid.NewGuid(),
                            TenantId = tenantId,
                            OrderId = orderId,
                            ProductId = ov.ProductId ?? baseItem?.ProductId,
                            VariantId = baseItem?.VariantId,
                            ProductName = !string.IsNullOrWhiteSpace(ov.ProductName) ? ov.ProductName.Trim() : baseItem!.ProductName,
                            SKU = baseItem?.SKU,
                            Unit = baseItem?.Unit ?? "Adet",
                            UnitPrice = baseUnitPrice,
                            UnitCost = baseItem?.UnitCost ?? 0m,
                            Quantity = baseQty,
                            TaxRate = taxRate,
                            DiscountRate = discRate,
                            DiscountAmount = itemDisc,
                            TaxAmount = itemTax,
                            TotalPrice = itemTotal,
                            OptionsOrNotes = !string.IsNullOrWhiteSpace(ov.Description) ? ov.Description.Trim() : baseItem?.Description,
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    // If overrides filtered out everything, keep empty list (will produce zero totals + shipping)
                }
                else
                {
                    orderItems = quote.Items
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

                    // Use quote stored aggregates when no item overrides
                    subtotal = quote.Subtotal;
                    itemsDiscount = 0m; // will be derived from DiscountAmount global? Keep parent total
                    totalTax = quote.TaxAmount;
                }

                // Compute order financials
                decimal orderSubtotal;
                decimal orderDiscountAmount;
                decimal orderTaxAmount;
                decimal orderTotalAmount;

                if (hasItemOverrides)
                {
                    // Global discount from quote
                    decimal globalDiscount = 0m;
                    var discountType = quote.DiscountType is "Percentage" or "Amount" ? quote.DiscountType : "Percentage";
                    if (discountType == "Percentage")
                    {
                        var dr = Math.Clamp(quote.DiscountRate, 0, 100);
                        globalDiscount = (subtotal - itemsDiscount) * (dr / 100m);
                    }
                    else
                    {
                        globalDiscount = Math.Clamp(quote.DiscountAmount - itemsDiscount, 0, Math.Max(0, subtotal - itemsDiscount));
                        // If quote DiscountAmount already includes item discounts, avoid double count; fallback to 0
                        if (globalDiscount < 0) globalDiscount = 0;
                    }

                    orderSubtotal = subtotal;
                    orderDiscountAmount = itemsDiscount + globalDiscount;
                    orderTaxAmount = totalTax;
                    orderTotalAmount = Math.Max(0, (subtotal - orderDiscountAmount) + totalTax) + effectiveShippingFee;
                }
                else
                {
                    orderSubtotal = quote.Subtotal;
                    orderDiscountAmount = quote.DiscountAmount;
                    orderTaxAmount = quote.TaxAmount;
                    orderTotalAmount = quote.TotalAmount + effectiveShippingFee;
                }

                var order = new Order
                {
                    Id = orderId,
                    TenantId = tenantId,
                    OrderNumber = orderNumber,
                    CustomerId = quote.CustomerId,
                    CustomerName = quote.CustomerName,
                    Status = "Confirmed",
                    PaymentStatus = "Unpaid",
                    PaymentMethod = effectivePaymentMethod,
                    Currency = quote.Currency,
                    Subtotal = orderSubtotal,
                    DiscountAmount = orderDiscountAmount,
                    TaxAmount = orderTaxAmount,
                    ShippingFee = effectiveShippingFee,
                    TotalAmount = orderTotalAmount,
                    PaidAmount = 0.00m,
                    Notes = effectiveNotes,
                    OrderDate = DateTime.UtcNow,
                    DueDate = effectiveDueDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    Items = orderItems
                };

                dbContext.OrderActivities.Add(new OrderActivity
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

                dbContext.QuoteActivities.Add(new QuoteActivity
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
                dbContext.QuoteActivities.Add(new QuoteActivity
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
            await tx.CommitAsync(cancellationToken);

            return Result.Success(orderId != Guid.Empty ? orderId : quote.Id);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
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
            ConvertToOrderRequest? request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ConvertToOrderCommand(id, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Update")
        .WithName("ConvertToOrder")
        .WithTags("Quotes");
    }
}
