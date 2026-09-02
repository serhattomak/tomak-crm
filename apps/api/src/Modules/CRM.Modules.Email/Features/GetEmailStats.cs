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

public record GetEmailStatsQuery : IQuery<EmailStatsDto>;

public class GetEmailStatsHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmailStatsQuery, EmailStatsDto>
{
    public async Task<Result<EmailStatsDto>> Handle(GetEmailStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<EmailStatsDto>(Error.Unauthorized);
        }

        DateTime todayUtc = DateTime.UtcNow.Date;

        int inboxTotal = await dbContext.Messages
            .CountAsync(m => m.Direction == "Inbound", cancellationToken);

        int unreadCount = await dbContext.Messages
            .CountAsync(m => m.Direction == "Inbound" && !m.IsRead, cancellationToken);

        int sentToday = await dbContext.Messages
            .CountAsync(m => m.Direction == "Outbound" && m.Status == "Sent" && m.CreatedAt >= todayUtc, cancellationToken);

        EmailStatsDto stats = new EmailStatsDto
        {
            InboxTotal = inboxTotal,
            UnreadCount = unreadCount,
            SentToday = sentToday
        };

        return Result.Success(stats);
    }
}

public class GetEmailStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/email/stats", async (ISender sender, CancellationToken ct) =>
        {
            Result<EmailStatsDto> result = await sender.Send(new GetEmailStatsQuery(), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<EmailStatsDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<EmailStatsDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetEmailStats")
        .WithTags("Email")
        .RequirePermission("Emails.View");
    }
}
