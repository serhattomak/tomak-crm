using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.CreateQuoteRevision;

public record CreateQuoteRevisionCommand(Guid Id, CreateRevisionRequest Request) : ICommand<Guid>;

public class CreateQuoteRevisionValidator : AbstractValidator<CreateQuoteRevisionCommand>
{
    private static readonly string[] ValidPaymentMethods =
    [
        "BankTransfer",
        "CreditCard",
        "Cash",
        "Check",
        "OpenAccount"
    ];

    public CreateQuoteRevisionValidator()
    {
        When(x => !string.IsNullOrWhiteSpace(x.Request.PaymentMethod), () =>
        {
            RuleFor(x => x.Request.PaymentMethod!)
                .Must(m => ValidPaymentMethods.Contains(m.Trim()))
                .WithMessage($"Geçersiz ödeme yöntemi. İzin verilenler: {string.Join(", ", ValidPaymentMethods)}");
        });

        When(x => x.Request.PaymentDueDays.HasValue, () =>
        {
            RuleFor(x => x.Request.PaymentDueDays!.Value)
                .GreaterThanOrEqualTo(0)
                .WithMessage("Vade günü 0 veya daha büyük olmalıdır.");
        });

        When(x => x.Request.Items != null && x.Request.Items.Count > 0, () =>
        {
            RuleForEach(x => x.Request.Items!)
                .ChildRules(item =>
                {
                    item.RuleFor(i => i.Quantity)
                        .Must(q => !q.HasValue || q.Value > 0)
                        .WithMessage("Miktar 0'dan büyük olmalıdır.");

                    item.RuleFor(i => i.UnitPrice)
                        .Must(p => !p.HasValue || p.Value >= 0)
                        .WithMessage("Birim fiyat negatif olamaz.");
                });
        });
    }
}

public class CreateQuoteRevisionHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateQuoteRevisionCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateQuoteRevisionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = request.Request;

        var parentQuote = await dbContext.Quotes
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == request.Id && q.TenantId == tenantId, cancellationToken);

        if (parentQuote == null)
        {
            throw new NotFoundException($"Quote with ID '{request.Id}' was not found.");
        }

        await using var tx = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // Lock previous quote
            parentQuote.Status = "Revised";
            parentQuote.UpdatedAt = DateTime.UtcNow;

            dbContext.QuoteActivities.Add(new QuoteActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = parentQuote.Id,
                ActivityType = "RevisionCreated",
                Title = $"Revizyon Oluşturuldu (R{parentQuote.RevisionNumber + 1})",
                Description = $"Teklif revize edildi ve yeni versiyon oluşturuldu. Not: {req.RevisionNotes ?? "Pazarlık / Güncelleme"}",
                CreatedAt = DateTime.UtcNow
            });

            var newRevisionNumber = parentQuote.RevisionNumber + 1;
            var newQuoteId = Guid.NewGuid();
            var newPublicToken = Guid.NewGuid().ToString("N");

            // Resolve header overrides — prefer explicit, else clone parent
            var effectiveTitle = !string.IsNullOrWhiteSpace(req.Title) ? req.Title.Trim() : parentQuote.Title;
            var effectiveCurrency = !string.IsNullOrWhiteSpace(req.Currency) ? req.Currency.Trim() : parentQuote.Currency;
            var effectiveExchangeRate = req.ExchangeRate.HasValue && req.ExchangeRate.Value > 0 ? req.ExchangeRate.Value : parentQuote.ExchangeRate;
            var effectiveDiscountType = !string.IsNullOrWhiteSpace(req.DiscountType) && (req.DiscountType == "Percentage" || req.DiscountType == "Amount")
                ? req.DiscountType
                : parentQuote.DiscountType;
            var effectiveDiscountRate = req.DiscountRate ?? parentQuote.DiscountRate;
            var effectiveDiscountAmountReq = req.DiscountAmount ?? parentQuote.DiscountAmount;

            // ValidUntil: prefer explicit override, else parent.ValidUntil +15 days, else now+15
            DateTime? effectiveValidUntil;
            if (req.ValidUntil.HasValue)
            {
                var d = req.ValidUntil.Value;
                effectiveValidUntil = d.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(d, DateTimeKind.Utc)
                    : d;
            }
            else if (parentQuote.ValidUntil.HasValue)
            {
                effectiveValidUntil = parentQuote.ValidUntil.Value.AddDays(15);
            }
            else
            {
                effectiveValidUntil = DateTime.UtcNow.AddDays(15);
            }

            var effectiveTermsAndConditions = req.TermsAndConditions != null ? req.TermsAndConditions.Trim() : parentQuote.TermsAndConditions;
            var effectivePaymentTerms = req.PaymentTerms != null ? req.PaymentTerms.Trim() : parentQuote.PaymentTerms;
            var effectiveDeliveryTerms = req.DeliveryTerms != null ? req.DeliveryTerms.Trim() : parentQuote.DeliveryTerms;
            var effectiveBankDetails = req.BankDetails != null ? req.BankDetails.Trim() : parentQuote.BankDetails;
            var effectiveNotes = req.Notes != null ? req.Notes.Trim() : parentQuote.Notes;

            // Payment fields — VARCHAR only, nullable
            var effectivePaymentMethod = !string.IsNullOrWhiteSpace(req.PaymentMethod) ? req.PaymentMethod.Trim() : parentQuote.PaymentMethod;
            var effectivePaymentDueDays = req.PaymentDueDays ?? parentQuote.PaymentDueDays;

            DateTime? effectivePaymentDueDate;
            if (req.PaymentDueDate.HasValue)
            {
                var d = req.PaymentDueDate.Value;
                effectivePaymentDueDate = d.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(d.Date, DateTimeKind.Utc)
                    : d.Date;
            }
            else if (req.PaymentDueDays.HasValue && req.PaymentDueDays.Value >= 0)
            {
                effectivePaymentDueDate = DateTime.UtcNow.Date.AddDays(req.PaymentDueDays.Value);
            }
            else
            {
                effectivePaymentDueDate = parentQuote.PaymentDueDate;
            }

            // Build items — allow override Items with quantity/unit_price/isSelected etc.
            var hasItemOverrides = req.Items != null && req.Items.Count > 0;

            List<QuoteItem> newItems;
            decimal subtotal = 0m;
            decimal itemsDiscount = 0m;
            decimal totalTax = 0m;

            if (hasItemOverrides)
            {
                newItems = [];
                int orderIndex = 0;
                var parentById = parentQuote.Items.ToDictionary(i => i.Id);

                foreach (var itemReq in req.Items!)
                {
                    // Try to merge with parent item if Id matches, else treat as new
                    QuoteItem? parentItem = null;
                    if (itemReq.Id.HasValue && parentById.TryGetValue(itemReq.Id.Value, out var found))
                    {
                        parentItem = found;
                    }

                    var qty = itemReq.Quantity ?? parentItem?.Quantity ?? 1m;
                    qty = qty > 0 ? qty : 1m;

                    var unitPrice = itemReq.UnitPrice ?? parentItem?.UnitPrice ?? 0m;
                    unitPrice = unitPrice >= 0 ? unitPrice : 0m;

                    var unitCost = itemReq.UnitCost ?? parentItem?.UnitCost ?? 0m;
                    var discRate = itemReq.DiscountRate ?? parentItem?.DiscountRate ?? 0m;
                    discRate = Math.Clamp(discRate, 0, 100);

                    var taxRate = itemReq.TaxRate ?? parentItem?.TaxRate ?? 20m;
                    taxRate = Math.Clamp(taxRate, 0, 100);

                    var isOptional = itemReq.IsOptional ?? parentItem?.IsOptional ?? false;
                    var isSelected = itemReq.IsSelected ?? parentItem?.IsSelected ?? true;
                    var productName = !string.IsNullOrWhiteSpace(itemReq.ProductName) ? itemReq.ProductName.Trim() : parentItem?.ProductName ?? "Ürün";
                    var sku = itemReq.SKU?.Trim() ?? parentItem?.SKU;
                    var description = itemReq.Description?.Trim() ?? parentItem?.Description;
                    var unit = !string.IsNullOrWhiteSpace(itemReq.Unit) ? itemReq.Unit.Trim() : parentItem?.Unit ?? "Adet";
                    var productId = itemReq.ProductId ?? parentItem?.ProductId;
                    var variantId = itemReq.VariantId ?? parentItem?.VariantId;

                    var itemSubtotal = qty * unitPrice;
                    var itemDisc = itemSubtotal * (discRate / 100m);
                    var taxable = itemSubtotal - itemDisc;
                    var itemTax = taxable * (taxRate / 100m);
                    var itemTotal = taxable + itemTax;

                    if (isSelected)
                    {
                        subtotal += itemSubtotal;
                        itemsDiscount += itemDisc;
                        totalTax += itemTax;
                    }

                    newItems.Add(new QuoteItem
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        QuoteId = newQuoteId,
                        ProductId = productId,
                        VariantId = variantId,
                        ProductName = productName,
                        SKU = sku,
                        Description = description,
                        Quantity = qty,
                        Unit = unit,
                        UnitPrice = unitPrice,
                        UnitCost = unitCost,
                        DiscountRate = discRate,
                        DiscountAmount = itemDisc,
                        TaxRate = taxRate,
                        TaxAmount = itemTax,
                        TotalPrice = itemTotal,
                        IsOptional = isOptional,
                        IsSelected = isSelected,
                        OrderIndex = itemReq.OrderIndex ?? orderIndex++,
                        CreatedAt = DateTime.UtcNow
                    });

                    if (!itemReq.OrderIndex.HasValue)
                    {
                        // orderIndex already incremented
                    }
                    else
                    {
                        orderIndex = Math.Max(orderIndex, itemReq.OrderIndex.Value + 1);
                    }
                }
            }
            else
            {
                // Clone parent items verbatim
                newItems = parentQuote.Items.Select(item => new QuoteItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    QuoteId = newQuoteId,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    ProductName = item.ProductName,
                    SKU = item.SKU,
                    Description = item.Description,
                    Quantity = item.Quantity,
                    Unit = item.Unit,
                    UnitPrice = item.UnitPrice,
                    UnitCost = item.UnitCost,
                    DiscountRate = item.DiscountRate,
                    DiscountAmount = item.DiscountAmount,
                    TaxRate = item.TaxRate,
                    TaxAmount = item.TaxAmount,
                    TotalPrice = item.TotalPrice,
                    IsOptional = item.IsOptional,
                    IsSelected = item.IsSelected,
                    OrderIndex = item.OrderIndex,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                // For cloned path, derive subtotal/discount/tax from cloned items (or parent's stored values if no override)
                // If header discount overridden, recompute totals; otherwise reuse parent totals
                var hasFinancialOverride = !string.IsNullOrWhiteSpace(req.DiscountType) || req.DiscountRate.HasValue || req.DiscountAmount.HasValue;

                if (hasFinancialOverride)
                {
                    // Recompute from cloned items
                    subtotal = 0m;
                    itemsDiscount = 0m;
                    totalTax = 0m;
                    foreach (var ni in newItems)
                    {
                        if (ni.IsSelected)
                        {
                            var itemSubtotal = ni.Quantity * ni.UnitPrice;
                            // ni.DiscountAmount already computed per item
                            subtotal += itemSubtotal;
                            itemsDiscount += ni.DiscountAmount;
                            totalTax += ni.TaxAmount;
                        }
                    }
                }
                else
                {
                    subtotal = parentQuote.Subtotal;
                    itemsDiscount = parentQuote.DiscountAmount; // parent's total discount includes global; we separate later
                    // Need to split parent discount? For clone path without override, reuse parent aggregates directly
                    // Use parent's stored totalDiscount and tax; itemsDiscount here will be adjusted via global calc below
                    // So we set itemsDiscount = sum of item DiscountAmount, and global part handled below
                    itemsDiscount = newItems.Where(i => i.IsSelected).Sum(i => i.DiscountAmount);
                    totalTax = parentQuote.TaxAmount;
                    // Keep parent totalAmount directly later if no financial override
                }
            }

            // Compute global discount and final totals
            decimal globalDiscountAmount = 0m;
            decimal totalAmount;

            var hasFinancialOverrideForFinal = hasItemOverrides || !string.IsNullOrWhiteSpace(req.DiscountType) || req.DiscountRate.HasValue || req.DiscountAmount.HasValue;

            if (hasFinancialOverrideForFinal)
            {
                if (effectiveDiscountType == "Percentage")
                {
                    var discRate = Math.Clamp(effectiveDiscountRate, 0, 100);
                    globalDiscountAmount = (subtotal - itemsDiscount) * (discRate / 100m);
                }
                else
                {
                    // Amount type: clamp to remaining subtotal after item discounts
                    globalDiscountAmount = Math.Clamp(effectiveDiscountAmountReq, 0, Math.Max(0, subtotal - itemsDiscount));
                }

                var totalDiscount = itemsDiscount + globalDiscountAmount;
                totalAmount = Math.Max(0, (subtotal - totalDiscount) + totalTax);
            }
            else
            {
                // No financial override and no item override -> reuse parent totals verbatim
                globalDiscountAmount = parentQuote.DiscountAmount - newItems.Where(i => i.IsSelected).Sum(i => i.DiscountAmount);
                // Clamp global part to avoid negative
                globalDiscountAmount = Math.Max(0, globalDiscountAmount);
                totalAmount = parentQuote.TotalAmount;
                // Ensure subtotal/tax reflect parent if not recomputed
                if (!hasItemOverrides)
                {
                    subtotal = parentQuote.Subtotal;
                    totalTax = parentQuote.TaxAmount;
                }
            }

            // For override path with recompute, total discount is itemsDiscount+global
            var finalDiscountAmount = hasFinancialOverrideForFinal
                ? itemsDiscount + globalDiscountAmount
                : parentQuote.DiscountAmount;

            // When we cloned items, finalDiscount computed differently; ensure consistency
            if (hasItemOverrides)
            {
                finalDiscountAmount = itemsDiscount + globalDiscountAmount;
            }
            else if (hasFinancialOverrideForFinal)
            {
                finalDiscountAmount = itemsDiscount + globalDiscountAmount;
            }

            var newQuote = new Quote
            {
                Id = newQuoteId,
                TenantId = tenantId,
                QuoteNumber = parentQuote.QuoteNumber,
                RevisionNumber = newRevisionNumber,
                ParentQuoteId = parentQuote.Id,
                Title = effectiveTitle,
                CustomerId = parentQuote.CustomerId,
                CustomerName = parentQuote.CustomerName,
                DealId = parentQuote.DealId,
                AssignedUserId = parentQuote.AssignedUserId,
                AssignedUserName = parentQuote.AssignedUserName,
                Status = "Draft",
                Currency = effectiveCurrency,
                ExchangeRate = effectiveExchangeRate,
                Subtotal = subtotal,
                DiscountType = effectiveDiscountType,
                DiscountRate = effectiveDiscountRate,
                DiscountAmount = finalDiscountAmount,
                TaxAmount = totalTax,
                TotalAmount = totalAmount,
                ValidUntil = effectiveValidUntil,
                TermsAndConditions = effectiveTermsAndConditions,
                PaymentTerms = effectivePaymentTerms,
                DeliveryTerms = effectiveDeliveryTerms,
                BankDetails = effectiveBankDetails,
                Notes = effectiveNotes,
                PaymentMethod = effectivePaymentMethod,
                PaymentDueDays = effectivePaymentDueDays,
                PaymentDueDate = effectivePaymentDueDate,
                PublicViewToken = newPublicToken,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Items = newItems
            };

            dbContext.QuoteActivities.Add(new QuoteActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = newQuoteId,
                ActivityType = "Created",
                Title = $"Revizyon Versiyonu Oluşturuldu (R{newRevisionNumber})",
                Description = $"{parentQuote.QuoteNumber} R{parentQuote.RevisionNumber} teklifinden türetildi. Not: {req.RevisionNotes ?? "Pazarlık / Revizyon"}",
                CreatedAt = DateTime.UtcNow
            });

            dbContext.Quotes.Add(newQuote);
            await dbContext.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return Result.Success(newQuote.Id);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }
}

public class CreateQuoteRevisionEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes/{id:guid}/revisions", async (
            Guid id,
            CreateRevisionRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CreateQuoteRevisionCommand(id, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Create")
        .WithName("CreateQuoteRevision")
        .WithTags("Quotes");
    }
}
