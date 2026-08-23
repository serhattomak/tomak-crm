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

namespace CRM.Modules.Orders.Features.Quotes.ApproveQuote;

public record ApproveQuoteCommand(Guid Id, ApproveQuoteRequest Request) : ICommand<bool>;
public record SendQuoteCommand(Guid Id) : ICommand<bool>;

public class ApproveQuoteHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ApproveQuoteCommand, bool>, ICommandHandler<SendQuoteCommand, bool>
{
    public async Task<Result<bool>> Handle(ApproveQuoteCommand request, CancellationToken cancellationToken)
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

        if (request.Request.IsApproved)
        {
            quote.Status = "Approved";
            quote.ApprovedAt = DateTime.UtcNow;
            quote.ApprovalNotes = request.Request.ApprovalNotes;
            quote.UpdatedAt = DateTime.UtcNow;

            quote.Activities.Add(new QuoteActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = quote.Id,
                ActivityType = "Approved",
                Title = "Yönetici İskonto Onayı Verildi",
                Description = $"Teklif yönetici tarafından onaylandı. Not: {request.Request.ApprovalNotes ?? "Onaylandı"}",
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            quote.Status = "Draft";
            quote.ApprovalNotes = request.Request.ApprovalNotes;
            quote.UpdatedAt = DateTime.UtcNow;

            quote.Activities.Add(new QuoteActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                QuoteId = quote.Id,
                ActivityType = "RejectedApproval",
                Title = "Yönetici Onayı Reddedildi / Revizyon İstendi",
                Description = $"Teklif onayı reddedildi, taslak durumuna çekildi. Gerekçe: {request.Request.ApprovalNotes ?? "İskonto oranı uygun bulunmadı"}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }

    public async Task<Result<bool>> Handle(SendQuoteCommand request, CancellationToken cancellationToken)
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

        if (quote.Status == "PendingApproval")
        {
            throw new BadRequestException("Bu teklif yönetici onayı beklemektedir. Onaylanmadan müşteriye gönderilemez.");
        }

        quote.Status = "Sent";
        quote.SentAt = DateTime.UtcNow;
        quote.UpdatedAt = DateTime.UtcNow;

        quote.Activities.Add(new QuoteActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            QuoteId = quote.Id,
            ActivityType = "Sent",
            Title = "Müşteriye İletildi",
            Description = "Teklif müşteriye gönderildi ve dijital erişim bağlantısı aktif edildi.",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class ApproveQuoteEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes/{id:guid}/approve", async (
            Guid id,
            ApproveQuoteRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ApproveQuoteCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Approve")
        .WithName("ApproveQuote")
        .WithTags("Quotes");

        app.MapPost("/api/quotes/{id:guid}/send", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new SendQuoteCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Update")
        .WithName("SendQuote")
        .WithTags("Quotes");
    }
}
