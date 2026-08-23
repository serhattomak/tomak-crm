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

namespace CRM.Modules.Orders.Features.Quotes.CreateQuote;

public record CreateQuoteCommand(CreateQuoteRequest Request) : ICommand<Guid>;

public class CreateQuoteValidator : AbstractValidator<CreateQuoteCommand>
{
    public CreateQuoteValidator()
    {
        RuleFor(x => x.Request.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.CustomerName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Items).NotEmpty().WithMessage("Teklif için en az bir kalem girilmelidir.");
    }
}

public class CreateQuoteHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateQuoteCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateQuoteCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = request.Request;

        // 1. Generate Quote Number: TEK-YYYY-XXXX
        var yearStr = DateTime.UtcNow.ToString("yyyy");
        var quoteCountThisYear = await dbContext.Quotes
            .Where(q => q.TenantId == tenantId && q.QuoteNumber.StartsWith($"TEK-{yearStr}-") && q.RevisionNumber == 0)
            .CountAsync(cancellationToken);

        var quoteNumber = $"TEK-{yearStr}-{(quoteCountThisYear + 1):D4}";
        var quoteId = Guid.NewGuid();
        var currency = !string.IsNullOrWhiteSpace(req.Currency) ? req.Currency.Trim() : "TRY";
        var exchangeRate = req.ExchangeRate > 0 ? req.ExchangeRate : 1.0000m;

        decimal subtotal = 0.00m;
        decimal totalTax = 0.00m;
        decimal totalItemDiscount = 0.00m;
        bool requiresApproval = false;

        var quoteItems = new List<QuoteItem>();
        int index = 0;

        foreach (var item in req.Items)
        {
            var qty = item.Quantity > 0 ? item.Quantity : 1.00m;
            var unitPrice = item.UnitPrice >= 0 ? item.UnitPrice : 0.00m;
            var unitCost = item.UnitCost >= 0 ? item.UnitCost : 0.00m;
            var taxRate = item.TaxRate >= 0 ? item.TaxRate : 20.00m;
            var discountRate = item.DiscountRate >= 0 ? item.DiscountRate : 0.00m;

            if (discountRate > 20.00m)
            {
                requiresApproval = true;
            }

            var rawPrice = unitPrice * qty;
            var itemDiscount = discountRate > 0 ? (rawPrice * (discountRate / 100.00m)) : item.DiscountAmount;
            var priceAfterDiscount = Math.Max(0, rawPrice - itemDiscount);
            var itemTax = taxRate > 0 ? (priceAfterDiscount * (taxRate / 100.00m)) : 0.00m;
            var totalPrice = priceAfterDiscount + itemTax;

            if (item.IsSelected && !item.IsOptional)
            {
                subtotal += priceAfterDiscount;
                totalTax += itemTax;
                totalItemDiscount += itemDiscount;
            }

            quoteItems.Add(new QuoteItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = quoteId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                ProductName = item.ProductName.Trim(),
                SKU = item.SKU?.Trim(),
                Description = item.Description?.Trim(),
                Quantity = qty,
                Unit = !string.IsNullOrWhiteSpace(item.Unit) ? item.Unit.Trim() : "Adet",
                UnitPrice = unitPrice,
                UnitCost = unitCost,
                DiscountRate = discountRate,
                DiscountAmount = itemDiscount,
                TaxRate = taxRate,
                TaxAmount = itemTax,
                TotalPrice = totalPrice,
                IsOptional = item.IsOptional,
                IsSelected = item.IsSelected,
                OrderIndex = index++,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Quote-level general discount
        decimal generalDiscountAmount = 0.00m;
        if (req.DiscountType == "Percentage" && req.DiscountRate > 0)
        {
            generalDiscountAmount = subtotal * (req.DiscountRate / 100.00m);
            if (req.DiscountRate > 15.00m)
            {
                requiresApproval = true;
            }
        }
        else if (req.DiscountType == "Amount" && req.DiscountAmount > 0)
        {
            generalDiscountAmount = req.DiscountAmount;
            if (subtotal > 0 && (generalDiscountAmount / subtotal) > 0.15m)
            {
                requiresApproval = true;
            }
        }

        var totalAmount = Math.Max(0, (subtotal - generalDiscountAmount) + totalTax);

        var initialStatus = requiresApproval ? "PendingApproval" : "Draft";
        var publicToken = Guid.NewGuid().ToString("N");

        var quote = new Quote
        {
            Id = quoteId,
            TenantId = tenantId,
            QuoteNumber = quoteNumber,
            RevisionNumber = 0,
            ParentQuoteId = null,
            Title = req.Title.Trim(),
            CustomerId = req.CustomerId,
            CustomerName = req.CustomerName.Trim(),
            DealId = req.DealId,
            AssignedUserId = req.AssignedUserId,
            AssignedUserName = req.AssignedUserName?.Trim(),
            Status = initialStatus,
            Currency = currency,
            ExchangeRate = exchangeRate,
            Subtotal = subtotal,
            DiscountType = req.DiscountType ?? "Percentage",
            DiscountRate = req.DiscountRate,
            DiscountAmount = totalItemDiscount + generalDiscountAmount,
            TaxAmount = totalTax,
            TotalAmount = totalAmount,
            ValidUntil = req.ValidUntil ?? DateTime.UtcNow.AddDays(15),
            TermsAndConditions = req.TermsAndConditions?.Trim(),
            PaymentTerms = req.PaymentTerms?.Trim(),
            DeliveryTerms = req.DeliveryTerms?.Trim(),
            BankDetails = req.BankDetails?.Trim(),
            Notes = req.Notes?.Trim(),
            PublicViewToken = publicToken,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = quoteItems
        };

        // Activity log
        var activityDesc = requiresApproval
            ? $"{quoteNumber} numaralı teklif {req.CustomerName} müşterisi için {totalAmount:N2} {currency} tutarında hazırlandı. İskonto eşiği aşıldığı için Yönetici Onayı Bekliyor durumuna alındı."
            : $"{quoteNumber} numaralı teklif {req.CustomerName} müşterisi için {totalAmount:N2} {currency} tutarında taslak olarak oluşturuldu.";

        quote.Activities.Add(new QuoteActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            QuoteId = quoteId,
            ActivityType = "Created",
            Title = requiresApproval ? "Teklif Oluşturuldu (Onay Bekliyor)" : "Teklif Oluşturuldu",
            Description = activityDesc,
            CreatedAt = DateTime.UtcNow
        });

        dbContext.Quotes.Add(quote);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(quote.Id);
    }
}

public class CreateQuoteEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes", async (
            CreateQuoteRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CreateQuoteCommand(request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Create")
        .WithName("CreateQuote")
        .WithTags("Quotes");
    }
}
