using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Dtos;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Email.Features;

public record GetEmailAccountsQuery : IQuery<IReadOnlyList<EmailAccountDto>>;

public class GetEmailAccountsHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmailAccountsQuery, IReadOnlyList<EmailAccountDto>>
{
    public async Task<Result<IReadOnlyList<EmailAccountDto>>> Handle(GetEmailAccountsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<IReadOnlyList<EmailAccountDto>>(Error.Unauthorized);
        }

        var accounts = await dbContext.Accounts
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new EmailAccountDto
            {
                Id = a.Id,
                TenantId = a.TenantId,
                Email = a.Email,
                Provider = a.Provider,
                ImapHost = a.ImapHost,
                ImapPort = a.ImapPort,
                SmtpHost = a.SmtpHost,
                SmtpPort = a.SmtpPort,
                IsActive = a.IsActive,
                Description = a.Description,
                SecretMasked = a.GetSecretMasked(),
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<EmailAccountDto>>(accounts);
    }
}

public class GetEmailAccountsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/email/accounts", async (ISender sender, CancellationToken ct) =>
        {
            Result<IReadOnlyList<EmailAccountDto>> result = await sender.Send(new GetEmailAccountsQuery(), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<IReadOnlyList<EmailAccountDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<IReadOnlyList<EmailAccountDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetEmailAccounts")
        .WithTags("Email")
        .RequirePermission("Emails.View");
    }
}
