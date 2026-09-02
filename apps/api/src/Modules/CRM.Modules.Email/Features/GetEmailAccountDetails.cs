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

public record GetEmailAccountDetailsQuery(Guid Id) : IQuery<EmailAccountDetailDto>;

public class GetEmailAccountDetailsHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmailAccountDetailsQuery, EmailAccountDetailDto>
{
    public async Task<Result<EmailAccountDetailDto>> Handle(GetEmailAccountDetailsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<EmailAccountDetailDto>(Error.Unauthorized);
        }

        EmailAccount? account = await dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

        if (account == null)
        {
            return Result.Failure<EmailAccountDetailDto>("Account.NotFound", "E-posta hesabı bulunamadı.");
        }

        int totalMessages = await dbContext.Messages
            .CountAsync(m => m.AccountId == account.Id, cancellationToken);

        int unreadMessages = await dbContext.Messages
            .CountAsync(m => m.AccountId == account.Id && !m.IsRead && m.Direction == "Inbound", cancellationToken);

        EmailAccountDetailDto dto = new EmailAccountDetailDto
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
            UpdatedAt = account.UpdatedAt,
            TotalMessagesCount = totalMessages,
            UnreadMessagesCount = unreadMessages
        };

        return Result.Success(dto);
    }
}

public class GetEmailAccountDetailsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/email/accounts/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            Result<EmailAccountDetailDto> result = await sender.Send(new GetEmailAccountDetailsQuery(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<EmailAccountDetailDto>.Ok(result.Value))
                : Results.NotFound(ApiResponse<EmailAccountDetailDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetEmailAccountDetails")
        .WithTags("Email")
        .RequirePermission("Emails.View");
    }
}
