using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.GetQuoteById;

public record GetQuoteByIdQuery(Guid Id) : IQuery<QuoteDetailDto>;

public class GetQuoteByIdHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetQuoteByIdQuery, QuoteDetailDto>
{
    public async Task<Result<QuoteDetailDto>> Handle(GetQuoteByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var quote = await dbContext.Quotes
            .Include(q => q.Items)
            .Include(q => q.Activities)
            .Include(q => q.ParentQuote)
            .Include(q => q.ConvertedOrder)
            .Include(q => q.Deal)
            .FirstOrDefaultAsync(q => q.Id == request.Id && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{request.Id}' was not found.");
        }

        // Fetch revision tree
        // Finds all quotes sharing the same base QuoteNumber or parent
        var revisions = await dbContext.Quotes
            .Where(q => q.TenantId == tenantId && q.QuoteNumber == quote.QuoteNumber)
            .OrderBy(q => q.RevisionNumber)
            .Select(r => new QuoteRevisionSummaryDto(
                r.Id,
                r.QuoteNumber,
                r.RevisionNumber,
                r.Status,
                r.TotalAmount,
                r.Currency,
                r.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        var dto = new QuoteDetailDto(
            quote.Id,
            quote.TenantId,
            quote.QuoteNumber,
            quote.RevisionNumber,
            quote.ParentQuoteId,
            quote.ParentQuote?.QuoteNumber,
            quote.Title,
            quote.CustomerId,
            quote.CustomerName,
            quote.DealId,
            quote.Deal?.Title,
            quote.AssignedUserId,
            quote.AssignedUserName,
            quote.Status,
            quote.Currency,
            quote.ExchangeRate,
            quote.Subtotal,
            quote.DiscountType,
            quote.DiscountRate,
            quote.DiscountAmount,
            quote.TaxAmount,
            quote.TotalAmount,
            quote.ValidUntil,
            quote.SentAt,
            quote.AcceptedAt,
            quote.RejectedAt,
            quote.RejectionReason,
            quote.ApprovalNotes,
            quote.ApprovedByUserId,
            quote.ApprovedAt,
            quote.TermsAndConditions,
            quote.PaymentTerms,
            quote.DeliveryTerms,
            quote.BankDetails,
            quote.Notes,
            quote.PublicViewToken,
            quote.ConvertedOrderId,
            quote.ConvertedOrder?.OrderNumber,
            quote.CreatedAt,
            quote.UpdatedAt,
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
            )).ToList(),
            quote.Activities.OrderByDescending(a => a.CreatedAt).Select(a => new QuoteActivityDto(
                a.Id,
                a.UserId,
                a.UserName,
                a.ActivityType,
                a.Title,
                a.Description,
                a.OldValue,
                a.NewValue,
                a.CreatedAt
            )).ToList(),
            revisions
        );

        return Result.Success(dto);
    }
}

public class GetQuoteByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/quotes/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetQuoteByIdQuery(id), ct);
            return Results.Ok(ApiResponse<QuoteDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.View")
        .WithName("GetQuoteById")
        .WithTags("Quotes");
    }
}
