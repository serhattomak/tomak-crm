using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.CreateQuoteRevision;

public record CreateQuoteRevisionCommand(Guid Id, CreateRevisionRequest Request) : ICommand<Guid>;

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

        var parentQuote = await dbContext.Quotes
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == request.Id && q.TenantId == tenantId, cancellationToken);

        if (parentQuote == null)
        {
            throw new NotFoundException($"Quote with ID '{request.Id}' was not found.");
        }

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
            Description = $"Teklif revize edildi ve yeni versiyon oluşturuldu. Not: {request.Request.RevisionNotes ?? "Pazarlık / Güncelleme"}",
            CreatedAt = DateTime.UtcNow
        });

        var newRevisionNumber = parentQuote.RevisionNumber + 1;
        var newQuoteId = Guid.NewGuid();
        var newPublicToken = Guid.NewGuid().ToString("N");

        var newItems = parentQuote.Items.Select(item => new QuoteItem
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

        var newQuote = new Quote
        {
            Id = newQuoteId,
            TenantId = tenantId,
            QuoteNumber = parentQuote.QuoteNumber,
            RevisionNumber = newRevisionNumber,
            ParentQuoteId = parentQuote.Id,
            Title = parentQuote.Title,
            CustomerId = parentQuote.CustomerId,
            CustomerName = parentQuote.CustomerName,
            DealId = parentQuote.DealId,
            AssignedUserId = parentQuote.AssignedUserId,
            AssignedUserName = parentQuote.AssignedUserName,
            Status = "Draft",
            Currency = parentQuote.Currency,
            ExchangeRate = parentQuote.ExchangeRate,
            Subtotal = parentQuote.Subtotal,
            DiscountType = parentQuote.DiscountType,
            DiscountRate = parentQuote.DiscountRate,
            DiscountAmount = parentQuote.DiscountAmount,
            TaxAmount = parentQuote.TaxAmount,
            TotalAmount = parentQuote.TotalAmount,
            ValidUntil = DateTime.UtcNow.AddDays(15),
            TermsAndConditions = parentQuote.TermsAndConditions,
            PaymentTerms = parentQuote.PaymentTerms,
            DeliveryTerms = parentQuote.DeliveryTerms,
            BankDetails = parentQuote.BankDetails,
            Notes = parentQuote.Notes,
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
            Description = $"{parentQuote.QuoteNumber} R{parentQuote.RevisionNumber} teklifinden türetildi. Not: {request.Request.RevisionNotes ?? "Pazarlık / Revizyon"}",
            CreatedAt = DateTime.UtcNow
        });

        dbContext.Quotes.Add(newQuote);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(newQuote.Id);
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
