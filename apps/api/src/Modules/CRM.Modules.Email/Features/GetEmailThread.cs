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

public record GetEmailThreadQuery(Guid ThreadId) : IQuery<EmailThreadDto>;

public class GetEmailThreadHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmailThreadQuery, EmailThreadDto>
{
    public async Task<Result<EmailThreadDto>> Handle(GetEmailThreadQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<EmailThreadDto>(Error.Unauthorized);
        }

        var messages = await dbContext.Messages
            .Include(m => m.Attachments)
            .Where(m => m.ThreadId == request.ThreadId)
            .OrderBy(m => m.CreatedAt)
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

        string? threadSubject = messages.FirstOrDefault()?.Subject;

        EmailThreadDto dto = new EmailThreadDto
        {
            ThreadId = request.ThreadId,
            Subject = threadSubject,
            Messages = messages
        };

        return Result.Success(dto);
    }
}

public class GetEmailThreadEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/email/threads/{threadId:guid}", async (Guid threadId, ISender sender, CancellationToken ct) =>
        {
            Result<EmailThreadDto> result = await sender.Send(new GetEmailThreadQuery(threadId), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<EmailThreadDto>.Ok(result.Value))
                : Results.NotFound(ApiResponse<EmailThreadDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetEmailThread")
        .WithTags("Email")
        .RequirePermission("Emails.View");
    }
}
