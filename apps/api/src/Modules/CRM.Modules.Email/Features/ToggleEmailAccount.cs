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

public record ToggleEmailAccountCommand(Guid Id, bool? IsActive = null) : ICommand<EmailAccountDto>;

public class ToggleEmailAccountHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ToggleEmailAccountCommand, EmailAccountDto>
{
    public async Task<Result<EmailAccountDto>> Handle(ToggleEmailAccountCommand request, CancellationToken cancellationToken)
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

        account.IsActive = request.IsActive ?? !account.IsActive;
        account.UpdatedAt = DateTime.UtcNow;

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

public class ToggleEmailAccountEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/email/accounts/{id:guid}/toggle", async (Guid id, ToggleEmailAccountCommand? command, ISender sender, CancellationToken ct) =>
        {
            bool? targetStatus = command?.IsActive;
            Result<EmailAccountDto> result = await sender.Send(new ToggleEmailAccountCommand(id, targetStatus), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<EmailAccountDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<EmailAccountDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("ToggleEmailAccount")
        .WithTags("Email")
        .RequirePermission("Emails.ManageAccounts");
    }
}
