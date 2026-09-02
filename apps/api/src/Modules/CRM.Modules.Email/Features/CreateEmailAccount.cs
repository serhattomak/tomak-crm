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

namespace CRM.Modules.Email.Features;

public record CreateEmailAccountCommand(
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

public class CreateEmailAccountValidator : AbstractValidator<CreateEmailAccountCommand>
{
    public CreateEmailAccountValidator()
    {
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

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre (veya Resend API anahtarı) zorunludur.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Açıklama en fazla 500 karakter olabilir.");
    }
}

public class CreateEmailAccountHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateEmailAccountCommand, EmailAccountDto>
{
    public async Task<Result<EmailAccountDto>> Handle(CreateEmailAccountCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<EmailAccountDto>(Error.Unauthorized);
        }

        EmailAccount account = new EmailAccount
        {
            TenantId = currentTenant.Id.Value,
            Email = request.Email.Trim().ToLowerInvariant(),
            Provider = request.Provider.Trim().ToLowerInvariant(),
            ImapHost = request.ImapHost?.Trim(),
            ImapPort = request.ImapPort,
            SmtpHost = request.SmtpHost?.Trim(),
            SmtpPort = request.SmtpPort,
            Description = request.Description?.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (!string.IsNullOrEmpty(request.Password))
        {
            account.SetEncryptedPassword(request.Password);
        }

        dbContext.Accounts.Add(account);
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

public class CreateEmailAccountEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/email/accounts", async (CreateEmailAccountCommand command, ISender sender, CancellationToken ct) =>
        {
            Result<EmailAccountDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Created($"/api/email/accounts/{result.Value.Id}", ApiResponse<EmailAccountDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<EmailAccountDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("CreateEmailAccount")
        .WithTags("Email")
        .RequirePermission("Emails.ManageAccounts");
    }
}
