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

namespace CRM.Modules.Orders.Features.Quotes.RejectQuote;

public record RejectQuoteCommand(Guid Id, RejectQuoteRequest Request) : ICommand<bool>;
public record DeleteQuoteCommand(Guid Id) : ICommand<bool>;

public class RejectQuoteHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<RejectQuoteCommand, bool>, ICommandHandler<DeleteQuoteCommand, bool>
{
    public async Task<Result<bool>> Handle(RejectQuoteCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var quote = await dbContext.Quotes
            .Include(q => q.Activities)
            .FirstOrDefaultAsync(q => q.Id == request.Id && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{request.Id}' was not found.");
        }

        quote.Status = "Rejected";
        quote.RejectedAt = DateTime.UtcNow;
        quote.RejectionReason = request.Request.Reason?.Trim();
        quote.UpdatedAt = DateTime.UtcNow;

        quote.Activities.Add(new QuoteActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            QuoteId = quote.Id,
            ActivityType = "Rejected",
            Title = "Teklif Reddedildi",
            Description = $"Teklif reddedildi. Gerekçe: {request.Request.Reason ?? "Belirtilmedi"}",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }

    public async Task<Result<bool>> Handle(DeleteQuoteCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var quote = await dbContext.Quotes
            .FirstOrDefaultAsync(q => q.Id == request.Id && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{request.Id}' was not found.");
        }

        if (quote.ConvertedOrderId.HasValue)
        {
            throw new BadRequestException("Siparişe dönüştürülmüş teklifler silinemez.");
        }

        // Soft delete
        quote.IsActive = false;
        quote.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class RejectQuoteEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes/{id:guid}/reject", async (
            Guid id,
            RejectQuoteRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new RejectQuoteCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Update")
        .WithName("RejectQuote")
        .WithTags("Quotes");

        app.MapDelete("/api/quotes/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteQuoteCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Delete")
        .WithName("DeleteQuote")
        .WithTags("Quotes");
    }
}
