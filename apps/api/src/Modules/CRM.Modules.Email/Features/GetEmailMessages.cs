using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Dtos;
using CRM.Modules.Email.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Email.Features;

public record GetEmailMessagesQuery(
    Guid? AccountId = null,
    string? Direction = null,
    string? Status = null,
    Guid? CustomerId = null,
    bool? IsRead = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 20
) : IQuery<PagedResult<EmailMessageDto>>;

public class GetEmailMessagesHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmailMessagesQuery, PagedResult<EmailMessageDto>>
{
    public async Task<Result<PagedResult<EmailMessageDto>>> Handle(GetEmailMessagesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<PagedResult<EmailMessageDto>>(Error.Unauthorized);
        }

        int pageNumber = request.Page < 1 ? 1 : request.Page;
        int pageSize = request.PageSize < 1 ? 20 : (request.PageSize > 100 ? 100 : request.PageSize);

        IQueryable<EmailMessage> query = dbContext.Messages
            .Include(m => m.Attachments)
            .AsNoTracking();

        if (request.AccountId.HasValue)
        {
            query = query.Where(m => m.AccountId == request.AccountId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Direction))
        {
            query = query.Where(m => m.Direction == request.Direction);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(m => m.Status == request.Status);
        }

        if (request.CustomerId.HasValue)
        {
            query = query.Where(m => m.CustomerId == request.CustomerId.Value);
        }

        if (request.IsRead.HasValue)
        {
            query = query.Where(m => m.IsRead == request.IsRead.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            string term = request.Search.Trim().ToLower();
            query = query.Where(m =>
                (m.Subject != null && m.Subject.ToLower().Contains(term)) ||
                m.FromAddress.ToLower().Contains(term) ||
                (m.TextBody != null && m.TextBody.ToLower().Contains(term)));
        }

        int totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new EmailMessageDto
            {
                Id = m.Id,
                TenantId = m.TenantId,
                AccountId = m.AccountId,
                ThreadId = m.ThreadId,
                Direction = m.Direction,
                Status = m.Status,
                FromAddress = m.FromAddress,
                ToAddresses = m.ToAddresses,
                CcAddresses = m.CcAddresses,
                Subject = m.Subject,
                HtmlBody = m.HtmlBody,
                TextBody = m.TextBody,
                ExternalId = m.ExternalId,
                CustomerId = m.CustomerId,
                QuoteId = m.QuoteId,
                TicketId = m.TicketId,
                IsRead = m.IsRead,
                HasAttachments = m.Attachments.Count > 0,
                Attachments = m.Attachments.Select(a => new EmailAttachmentDto
                {
                    Id = a.Id,
                    MessageId = a.MessageId,
                    Filename = a.Filename,
                    MimeType = a.MimeType,
                    SizeBytes = a.SizeBytes,
                    StoragePath = a.StoragePath,
                    CreatedAt = a.CreatedAt
                }).ToList(),
                CreatedAt = m.CreatedAt
            })
            .ToListAsync(cancellationToken);

        PagedResult<EmailMessageDto> pagedResult = new PagedResult<EmailMessageDto>(items, totalCount, pageNumber, pageSize);
        return Result.Success(pagedResult);
    }
}

public class GetEmailMessagesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/email/messages", async (
            [Microsoft.AspNetCore.Mvc.FromQuery] Guid? accountId,
            [Microsoft.AspNetCore.Mvc.FromQuery] string? direction,
            [Microsoft.AspNetCore.Mvc.FromQuery] string? status,
            [Microsoft.AspNetCore.Mvc.FromQuery] Guid? customerId,
            [Microsoft.AspNetCore.Mvc.FromQuery] bool? isRead,
            [Microsoft.AspNetCore.Mvc.FromQuery] string? search,
            [Microsoft.AspNetCore.Mvc.FromQuery] int? page,
            [Microsoft.AspNetCore.Mvc.FromQuery] int? pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetEmailMessagesQuery(
                accountId,
                direction,
                status,
                customerId,
                isRead,
                search,
                page ?? 1,
                pageSize ?? 20
            );

            Result<PagedResult<EmailMessageDto>> result = await sender.Send(query, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<PagedResult<EmailMessageDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<PagedResult<EmailMessageDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetEmailMessages")
        .WithTags("Email")
        .RequirePermission("Emails.View");
    }
}
