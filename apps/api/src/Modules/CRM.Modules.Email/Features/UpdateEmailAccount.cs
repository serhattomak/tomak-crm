using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Dtos;
using CRM.Modules.Email.Entities;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Email.Features;

public record UpdateEmailAccountCommand(
    Guid Id,
    string Email,
    string Provider = "generic_imap",
    string? ImapHost = null,
    int ImapPort = 993,
    string? SmtpHost = null,
    int SmtpPort = 587,
    string? Password = null,
    string? Description = null,
    bool IsActive = true
) : ICommand<EmailAccountDto>;

public class UpdateEmailAccountValidator : AbstractValidator<UpdateEmailAccountCommand>
{
    public UpdateEmailAccountValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi boş bırakılamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
            .MaximumLength(255).WithMessage("E-posta adresi en fazla 255 karakter olabilir.");

        RuleFor(x => x.Provider)
            .NotEmpty().WithMessage("Sağlayıcı türü seçilmelidir.")
            .Must(p => p is "generic_imap" or "resend")
            .WithMessage("Geçerli sağlayıcı türleri: generic_imap veya resend.");

        RuleFor(x => x.ImapHost)
            .NotEmpty().WithMessage("IMAP sunucu adresi generic_imap için zorunludur.")
            .When(x => x.Provider == "generic_imap");

        RuleFor(x => x.SmtpHost)
            .NotEmpty().WithMessage("SMTP sunucu adresi generic_imap için zorunludur.")
            .When(x => x.Provider == "generic_imap");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Açıklama en fazla 500 karakter olabilir.");
    }
}

public class UpdateEmailAccountHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateEmailAccountCommand, EmailAccountDto>
{
    public async Task<Result<EmailAccountDto>> Handle(UpdateEmailAccountCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<EmailAccountDto>(Error.Unauthorized);
        }

        EmailAccount? account = await dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

        if (account == null)
        {
            return Result.Failure<EmailAccountDto>("Account.NotFound", "E-posta hesabı bulunamadı.");
        }

        account.Email = request.Email.Trim().ToLowerInvariant();
        account.Provider = request.Provider.Trim().ToLowerInvariant();
        account.ImapHost = request.ImapHost?.Trim();
        account.ImapPort = request.ImapPort;
        account.SmtpHost = request.SmtpHost?.Trim();
        account.SmtpPort = request.SmtpPort;
        account.Description = request.Description?.Trim();
        account.IsActive = request.IsActive;
        account.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(request.Password))
        {
            account.SetEncryptedPassword(request.Password);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        EmailAccountDto dto = new EmailAccountDto
        {
            Id = account.Id,
            TenantId = account.TenantId,
            Email = account.Email,
            Provider = account.Provider,
            ImapHost = account.ImapHost,
            ImapPort = account.ImapPort,
            SmtpHost = account.SmtpHost,
            SmtpPort = account.SmtpPort,
            IsActive = account.IsActive,
            Description = account.Description,
            SecretMasked = account.GetSecretMasked(),
            CreatedAt = account.CreatedAt,
            UpdatedAt = account.UpdatedAt
        };

        return Result.Success(dto);
    }
}

public class UpdateEmailAccountEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/email/accounts/{id:guid}", async (Guid id, UpdateEmailAccountCommand command, ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<EmailAccountDto>.Fail("IdMismatch", "URL'deki kimlik ile gövdedeki uyuşmuyor."));
            }

            Result<EmailAccountDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<EmailAccountDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<EmailAccountDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("UpdateEmailAccount")
        .WithTags("Email")
        .RequirePermission("Emails.ManageAccounts");
    }
}
