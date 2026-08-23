using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.Public;

public record PublicQuoteViewDto(
    Guid Id,
    string QuoteNumber,
    int RevisionNumber,
    string Title,
    string CustomerName,
    string Status,
    string Currency,
    decimal Subtotal,
    string DiscountType,
    decimal DiscountRate,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime? ValidUntil,
    DateTime? SentAt,
    DateTime? AcceptedAt,
    string? TermsAndConditions,
    string? PaymentTerms,
    string? DeliveryTerms,
    string? BankDetails,
    string? Notes,
    string? CompanyName,
    string? CompanyEmail,
    string? CompanyPhone,
    string? CompanyAddress,
    string? CompanyLogoUrl,
    List<QuoteItemDto> Items
);

public record GetPublicQuoteQuery(string Token) : IQuery<PublicQuoteViewDto>;
public record PublicAcceptQuoteCommand(string Token, PublicAcceptQuoteRequest Request) : ICommand<bool>;
public record PublicRequestRevisionCommand(string Token, string Feedback) : ICommand<bool>;

public class PublicQuoteHandler(
    OrdersDbContext dbContext,
    CustomersDbContext customersDbContext,
    TenantsDbContext tenantsDbContext) :
    IQueryHandler<GetPublicQuoteQuery, PublicQuoteViewDto>,
    ICommandHandler<PublicAcceptQuoteCommand, bool>,
    ICommandHandler<PublicRequestRevisionCommand, bool>
{
    public async Task<Result<PublicQuoteViewDto>> Handle(GetPublicQuoteQuery request, CancellationToken cancellationToken)
    {
        var quote = await dbContext.Quotes
            .IgnoreQueryFilters()
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.PublicViewToken == request.Token && q.IsActive, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException("Teklif bulunamadı veya bağlantı geçersiz.");
        }

        // If status was Sent, mark as Viewed on first customer visit
        if (quote.Status == "Sent")
        {
            quote.Status = "Viewed";
            dbContext.QuoteActivities.Add(new QuoteActivity
            {
                Id = Guid.NewGuid(),
                TenantId = quote.TenantId,
                QuoteId = quote.Id,
                ActivityType = "Viewed",
                Title = "Müşteri Teklifi İnceledi",
                Description = "Teklif müşteri tarafından dijital bağlantı üzerinden görüntülendi.",
                CreatedAt = DateTime.UtcNow
            });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // Fetch company / tenant profile
        var tenant = await tenantsDbContext.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == quote.TenantId, cancellationToken);

        var dto = new PublicQuoteViewDto(
            quote.Id,
            quote.QuoteNumber,
            quote.RevisionNumber,
            quote.Title,
            quote.CustomerName,
            quote.Status,
            quote.Currency,
            quote.Subtotal,
            quote.DiscountType,
            quote.DiscountRate,
            quote.DiscountAmount,
            quote.TaxAmount,
            quote.TotalAmount,
            quote.ValidUntil,
            quote.SentAt,
            quote.AcceptedAt,
            quote.TermsAndConditions,
            quote.PaymentTerms,
            quote.DeliveryTerms,
            quote.BankDetails,
            quote.Notes,
            tenant?.Name ?? "CRM Şirketi",
            "",
            "",
            "",
            tenant?.LogoUrl,
            quote.Items.OrderBy(i => i.OrderIndex).Select(i => new QuoteItemDto(
                i.Id,
                i.ProductId,
                i.VariantId,
                i.ProductName,
                i.SKU,
                i.Description,
                i.Quantity,
                i.Unit,
                i.UnitPrice,
                i.UnitCost,
                i.DiscountRate,
                i.DiscountAmount,
                i.TaxRate,
                i.TaxAmount,
                i.TotalPrice,
                i.IsOptional,
                i.IsSelected,
                i.OrderIndex
            )).ToList()
        );

        return Result.Success(dto);
    }

    public async Task<Result<bool>> Handle(PublicAcceptQuoteCommand request, CancellationToken cancellationToken)
    {
        var quote = await dbContext.Quotes
            .IgnoreQueryFilters()
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.PublicViewToken == request.Token && q.IsActive, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException("Teklif bulunamadı.");
        }

        if (quote.Status is "Accepted" or "ConvertedToOrder")
        {
            return Result.Success(true);
        }

        quote.Status = "Accepted";
        quote.AcceptedAt = DateTime.UtcNow;
        quote.UpdatedAt = DateTime.UtcNow;

        var acceptedBy = !string.IsNullOrWhiteSpace(request.Request.AcceptedByName) ? request.Request.AcceptedByName.Trim() : quote.CustomerName;
        var note = !string.IsNullOrWhiteSpace(request.Request.CustomerNotes) ? request.Request.CustomerNotes.Trim() : "Onaylandı";

        dbContext.QuoteActivities.Add(new QuoteActivity
        {
            Id = Guid.NewGuid(),
            TenantId = quote.TenantId,
            QuoteId = quote.Id,
            ActivityType = "Accepted",
            Title = "Müşteri Teklifi Onayladı",
            Description = $"Teklif {acceptedBy} tarafından dijital olarak onaylandı. Müşteri notu: {note}",
            CreatedAt = DateTime.UtcNow
        });

        // Automatically create Order
        var todayStr = DateTime.UtcNow.ToString("yyyyMMdd");
        var countToday = await dbContext.Orders
            .IgnoreQueryFilters()
            .Where(o => o.TenantId == quote.TenantId && o.CreatedAt >= DateTime.UtcNow.Date)
            .CountAsync(cancellationToken);
        var orderNumber = $"ORD-{todayStr}-{(countToday + 1):D4}";

        var orderId = Guid.NewGuid();
        var orderItems = quote.Items
            .Where(i => i.IsSelected)
            .Select(item => new OrderItem
            {
                Id = Guid.NewGuid(),
                TenantId = quote.TenantId,
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
            TenantId = quote.TenantId,
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
            Notes = $"Bu sipariş {quote.QuoteNumber} teklifinin müşteri tarafından dijital onaylanmasıyla oluşturulmuştur. Onaylayan: {acceptedBy}",
            OrderDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = orderItems
        };

        dbContext.Orders.Add(order);
        quote.ConvertedOrderId = orderId;

        // If deal linked, update deal
        if (quote.DealId.HasValue)
        {
            var deal = await customersDbContext.Deals
                .IgnoreQueryFilters()
                .Include(d => d.Pipeline!)
                .ThenInclude(p => p.Stages)
                .FirstOrDefaultAsync(d => d.Id == quote.DealId.Value && d.TenantId == quote.TenantId, cancellationToken);

            if (deal != null)
            {
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
                deal.WonReason = $"{quote.QuoteNumber} numaralı teklif dijital ortamda müşteri tarafından onaylandı";
                deal.UpdatedAt = DateTime.UtcNow;

                customersDbContext.DealActivities.Add(new DealActivity
                {
                    Id = Guid.NewGuid(),
                    TenantId = quote.TenantId,
                    DealId = deal.Id,
                    ActivityType = "StageChange",
                    Title = "Fırsat Kazanıldı (Dijital Teklif Onayı)",
                    Description = $"{quote.QuoteNumber} numaralı teklif müşteri tarafından online onaylandığı için fırsat kazanıldı.",
                    OldValue = deal.Status,
                    NewValue = "Won",
                    CreatedAt = DateTime.UtcNow
                });

                await customersDbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }

    public async Task<Result<bool>> Handle(PublicRequestRevisionCommand request, CancellationToken cancellationToken)
    {
        var quote = await dbContext.Quotes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(q => q.PublicViewToken == request.Token && q.IsActive, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException("Teklif bulunamadı.");
        }

        quote.Status = "RevisionRequested";
        quote.UpdatedAt = DateTime.UtcNow;

        dbContext.QuoteActivities.Add(new QuoteActivity
        {
            Id = Guid.NewGuid(),
            TenantId = quote.TenantId,
            QuoteId = quote.Id,
            ActivityType = "RevisionRequested",
            Title = "Müşteri Revizyon Talebi İletti",
            Description = $"Müşterinin ilettiği revizyon talebi: {request.Feedback}",
            CreatedAt = DateTime.UtcNow
        });

        if (quote.DealId.HasValue)
        {
            var deal = await customersDbContext.Deals
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(d => d.Id == quote.DealId.Value, cancellationToken);

            if (deal != null)
            {
                deal.LastActivityAt = DateTime.UtcNow;
                deal.UpdatedAt = DateTime.UtcNow;

                customersDbContext.DealActivities.Add(new DealActivity
                {
                    TenantId = quote.TenantId,
                    DealId = deal.Id,
                    ActivityType = "RevisionRequested",
                    Title = "Teklif İçin Müşteri Revizyon İstedi",
                    Description = $"Müşteri {quote.QuoteNumber} R{quote.RevisionNumber} teklifine revizyon talebi iletti: {request.Feedback}",
                    CreatedAt = DateTime.UtcNow
                });

                await customersDbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class PublicQuoteEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/public/quotes/{token}", async (
            string token,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetPublicQuoteQuery(token), ct);
            return Results.Ok(ApiResponse<PublicQuoteViewDto>.Ok(result.Value));
        })
        .AllowAnonymous()
        .WithName("GetPublicQuote")
        .WithTags("Public Quotes");

        app.MapPost("/api/public/quotes/{token}/accept", async (
            string token,
            PublicAcceptQuoteRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new PublicAcceptQuoteCommand(token, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .AllowAnonymous()
        .WithName("PublicAcceptQuote")
        .WithTags("Public Quotes");

        app.MapPost("/api/public/quotes/{token}/request-revision", async (
            string token,
            string feedback,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new PublicRequestRevisionCommand(token, feedback), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .AllowAnonymous()
        .WithName("PublicRequestRevision")
        .WithTags("Public Quotes");
    }
}
