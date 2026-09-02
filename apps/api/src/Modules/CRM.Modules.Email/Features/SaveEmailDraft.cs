using System.Text.RegularExpressions;
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

public record SaveEmailDraftCommand(
    Guid? Id,
    Guid AccountId,
    string[]? To = null,
    string[]? Cc = null,
    string? Subject = null,
    string? HtmlBody = null,
    string? TextBody = null,
    Guid? CustomerId = null,
    Guid? QuoteId = null,
    Guid? TicketId = null,
    List<EmailAttachmentInputDto>? Attachments = null
) : ICommand<EmailMessageDto>;

public class SaveEmailDraftHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<SaveEmailDraftCommand, EmailMessageDto>
{
    public async Task<Result<EmailMessageDto>> Handle(SaveEmailDraftCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<EmailMessageDto>(Error.Unauthorized);
        }

        EmailAccount? account = await dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

        if (account == null)
        {
            return Result.Failure<EmailMessageDto>("Account.NotFound", "E-posta hesabı bulunamadı.");
        }

        EmailMessage? message = null;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            message = await dbContext.Messages
                .Include(m => m.Attachments)
                .FirstOrDefaultAsync(m => m.Id == request.Id.Value && m.Status == "Draft", cancellationToken);
        }

        if (message == null)
        {
            message = new EmailMessage
            {
                Id = request.Id ?? Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                AccountId = account.Id,
                Direction = "Outbound",
                Status = "Draft",
                FromAddress = account.Email,
                CreatedAt = DateTime.UtcNow
            };
            dbContext.Messages.Add(message);
        }

        message.ToAddresses = request.To?.Select(t => t.Trim()).ToArray() ?? [];
        message.CcAddresses = request.Cc?.Select(c => c.Trim()).ToArray();
        message.Subject = request.Subject?.Trim();
        message.HtmlBody = request.HtmlBody;
        message.TextBody = request.TextBody ?? (request.HtmlBody != null ? Regex.Replace(request.HtmlBody, "<[^>]+>", " ").Trim() : null);
        message.CustomerId = request.CustomerId;
        message.QuoteId = request.QuoteId;
        message.TicketId = request.TicketId;
        message.IsRead = true;

        if (request.Attachments != null)
        {
            message.Attachments.Clear();
            foreach (var att in request.Attachments)
            {
                message.Attachments.Add(new EmailAttachment
                {
                    Id = Guid.NewGuid(),
                    TenantId = currentTenant.Id.Value,
                    MessageId = message.Id,
                    Filename = att.Filename,
                    MimeType = att.MimeType,
                    SizeBytes = att.SizeBytes,
                    StoragePath = att.StoragePath,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        EmailMessageDto dto = new EmailMessageDto
        {
            Id = message.Id,
            TenantId = message.TenantId,
            AccountId = message.AccountId,
            ThreadId = message.ThreadId,
            Direction = message.Direction,
            Status = message.Status,
            FromAddress = message.FromAddress,
            ToAddresses = message.ToAddresses,
            CcAddresses = message.CcAddresses,
            Subject = message.Subject,
            HtmlBody = message.HtmlBody,
            TextBody = message.TextBody,
            CustomerId = message.CustomerId,
            QuoteId = message.QuoteId,
            TicketId = message.TicketId,
            IsRead = message.IsRead,
            HasAttachments = message.Attachments.Count > 0,
            Attachments = message.Attachments.Select(a => new EmailAttachmentDto
            {
                Id = a.Id,
                MessageId = a.MessageId,
                Filename = a.Filename,
                MimeType = a.MimeType,
                SizeBytes = a.SizeBytes,
                StoragePath = a.StoragePath,
                CreatedAt = a.CreatedAt
            }).ToList(),
            CreatedAt = message.CreatedAt
        };

        return Result.Success(dto);
    }
}

public class SaveEmailDraftEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/email/messages/draft", async (SaveEmailDraftCommand command, ISender sender, CancellationToken ct) =>
        {
            Result<EmailMessageDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<EmailMessageDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<EmailMessageDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("SaveEmailDraft")
        .WithTags("Email")
        .RequirePermission("Emails.Send");
    }
}
