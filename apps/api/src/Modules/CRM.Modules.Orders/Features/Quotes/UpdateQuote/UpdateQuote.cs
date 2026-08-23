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

namespace CRM.Modules.Orders.Features.Quotes.UpdateQuote;

public record UpdateQuoteCommand(Guid Id, UpdateQuoteRequest Request) : ICommand<Guid>;

public class UpdateQuoteValidator : AbstractValidator<UpdateQuoteCommand>
{
    public UpdateQuoteValidator()
    {
        RuleFor(x => x.Request.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.CustomerName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Items).NotEmpty().WithMessage("Teklif için en az bir kalem girilmelidir.");
    }
}

public class UpdateQuoteHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateQuoteCommand, Guid>
{
    public async Task<Result<Guid>> Handle(UpdateQuoteCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = request.Request;

        var quote = await dbContext.Quotes
            .Include(q => q.Items)
            .Include(q => q.Activities)
            .FirstOrDefaultAsync(q => q.Id == request.Id && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{request.Id}' was not found.");
        }

        if (quote.Status is "Accepted" or "ConvertedToOrder" or "Revised")
        {
            throw new BadRequestException($"Kabul edilmiş, siparişe dönüştürülmüş veya revize edilmiş teklifler doğrudan düzenlenemez. Lütfen yeni revizyon oluşturun.");
        }

        var currency = !string.IsNullOrWhiteSpace(req.Currency) ? req.Currency.Trim() : "TRY";
        var exchangeRate = req.ExchangeRate > 0 ? req.ExchangeRate : 1.0000m;

        decimal subtotal = 0.00m;
        decimal totalTax = 0.00m;
        decimal totalItemDiscount = 0.00m;
        bool requiresApproval = false;

        // Clear existing items
        dbContext.QuoteItems.RemoveRange(quote.Items);

        var newItems = new List<QuoteItem>();
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

            newItems.Add(new QuoteItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = quote.Id,
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

        // General discount
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

        quote.Title = req.Title.Trim();
        quote.CustomerId = req.CustomerId;
        quote.CustomerName = req.CustomerName.Trim();
        quote.DealId = req.DealId;
        quote.AssignedUserId = req.AssignedUserId;
        quote.AssignedUserName = req.AssignedUserName?.Trim();
        quote.Currency = currency;
        quote.ExchangeRate = exchangeRate;
        quote.Subtotal = subtotal;
        quote.DiscountType = req.DiscountType ?? "Percentage";
        quote.DiscountRate = req.DiscountRate;
        quote.DiscountAmount = totalItemDiscount + generalDiscountAmount;
        quote.TaxAmount = totalTax;
        quote.TotalAmount = totalAmount;
        quote.ValidUntil = req.ValidUntil;
        quote.TermsAndConditions = req.TermsAndConditions?.Trim();
        quote.PaymentTerms = req.PaymentTerms?.Trim();
        quote.DeliveryTerms = req.DeliveryTerms?.Trim();
        quote.BankDetails = req.BankDetails?.Trim();
        quote.Notes = req.Notes?.Trim();
        quote.UpdatedAt = DateTime.UtcNow;
        quote.Items = newItems;

        if (requiresApproval && quote.Status != "Approved")
        {
            quote.Status = "PendingApproval";
        }

        quote.Activities.Add(new QuoteActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            QuoteId = quote.Id,
            ActivityType = "Updated",
            Title = "Teklif Güncellendi",
            Description = $"Teklif içeriği ve kalemleri güncellendi. Yeni toplam: {totalAmount:N2} {currency}",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(quote.Id);
    }
}

public class UpdateQuoteEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/quotes/{id:guid}", async (
            Guid id,
            UpdateQuoteRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateQuoteCommand(id, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Update")
        .WithName("UpdateQuote")
        .WithTags("Quotes");
    }
}
