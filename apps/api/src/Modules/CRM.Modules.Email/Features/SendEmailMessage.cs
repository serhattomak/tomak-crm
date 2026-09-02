using System.Text.RegularExpressions;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Realtime;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Dtos;
using CRM.Modules.Email.Entities;
using CRM.Modules.Email.Services;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Email.Features;

public record SendEmailMessageCommand(
    Guid AccountId,
    string[] To,
    string[]? Cc = null,
    string Subject = "",
    string HtmlBody = "",
    string? TextBody = null,
    Guid? TemplateId = null,
    Guid? CustomerId = null,
    Guid? QuoteId = null,
    Guid? TicketId = null,
    List<EmailAttachmentInputDto>? Attachments = null,
    bool IsSimulation = false
) : ICommand<EmailMessageDto>;

public class SendEmailMessageValidator : AbstractValidator<SendEmailMessageCommand>
{
    public SendEmailMessageValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty().WithMessage("Gönderici e-posta hesabı seçilmelidir.");
        RuleFor(x => x.To)
            .NotEmpty().WithMessage("En az bir alıcı adresi belirtilmelidir.")
            .Must(to => to != null && to.All(IsValidEmail)).WithMessage("Geçersiz alıcı e-posta adresi formatı.");
        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("E-posta konusu boş bırakılamaz.")
            .MaximumLength(500).WithMessage("Konu en fazla 500 karakter olabilir.");
        RuleFor(x => x.HtmlBody)
            .NotEmpty().WithMessage("E-posta içeriği boş bırakılamaz.");
    }

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        return Regex.IsMatch(email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
    }
}

public class SendEmailMessageHandler(
    EmailDbContext dbContext,
    IEmailService emailService,
    ICrmNotificationService notificationService,
    ICurrentTenant currentTenant,
    ILogger<SendEmailMessageHandler> logger) : ICommandHandler<SendEmailMessageCommand, EmailMessageDto>
{
    public async Task<Result<EmailMessageDto>> Handle(SendEmailMessageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<EmailMessageDto>(Error.Unauthorized);
        }

        EmailAccount? account = await dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

        if (account == null)
        {
            return Result.Failure<EmailMessageDto>("Account.NotFound", "Gönderici e-posta hesabı bulunamadı.");
        }

        if (!account.IsActive)
        {
            return Result.Failure<EmailMessageDto>("Account.Inactive", "Seçilen e-posta hesabı aktif değil.");
        }

        Guid messageId = Guid.NewGuid();
        Guid threadId = emailService.ComputeThreadId(request.Subject, account.Id);

        // Send via IEmailService
        (bool sent, string? error) = await emailService.SendAsync(
            account.Id,
            request.To,
            request.Cc,
            request.Subject,
            request.HtmlBody,
            null, // Attachments byte stream handled if provided or referenced by storage_path
            request.IsSimulation,
            cancellationToken);

        string status = sent ? "Sent" : "Failed";

        EmailMessage message = new EmailMessage
        {
            Id = messageId,
            TenantId = currentTenant.Id.Value,
            AccountId = account.Id,
            ThreadId = threadId,
            Direction = "Outbound",
            Status = status,
            FromAddress = account.Email,
            ToAddresses = request.To.Select(t => t.Trim()).ToArray(),
            CcAddresses = request.Cc?.Select(c => c.Trim()).ToArray(),
            Subject = request.Subject.Trim(),
            HtmlBody = request.HtmlBody,
            TextBody = request.TextBody ?? Regex.Replace(request.HtmlBody, "<[^>]+>", " ").Trim(),
            CustomerId = request.CustomerId,
            QuoteId = request.QuoteId,
            TicketId = request.TicketId,
            IsRead = true,
            CreatedAt = DateTime.UtcNow
        };

        if (request.Attachments != null)
        {
            foreach (var att in request.Attachments)
            {
                message.Attachments.Add(new EmailAttachment
                {
                    Id = Guid.NewGuid(),
                    TenantId = currentTenant.Id.Value,
                    MessageId = messageId,
                    Filename = att.Filename,
                    MimeType = att.MimeType,
                    SizeBytes = att.SizeBytes,
                    StoragePath = att.StoragePath,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Real-time notification to tenant
        await notificationService.SendToTenantAsync(
            currentTenant.Id.Value,
            "ReceiveEmail",
            new
            {
                accountId = account.Id,
                messageId = message.Id,
                threadId = message.ThreadId,
                fromAddress = message.FromAddress,
                subject = message.Subject,
                status = message.Status,
                createdAt = message.CreatedAt
            },
            cancellationToken);

        if (!sent)
        {
            logger.LogWarning("Email delivery failed for account {AccountId}: {Error}", account.Id, error);
            return Result.Failure<EmailMessageDto>("Email.SendFailed", error ?? "E-posta gönderimi başarısız oldu.");
        }

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

public class SendEmailMessageEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/email/messages/send", async (SendEmailMessageCommand command, ISender sender, CancellationToken ct) =>
        {
            Result<EmailMessageDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<EmailMessageDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<EmailMessageDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("SendEmailMessage")
        .WithTags("Email")
        .RequirePermission("Emails.Send");
    }
}
