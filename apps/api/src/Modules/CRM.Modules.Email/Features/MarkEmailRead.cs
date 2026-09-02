using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Email.Features;

public record MarkEmailReadCommand(Guid Id, bool IsRead = true) : ICommand<bool>;

public class MarkEmailReadHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<MarkEmailReadCommand, bool>
{
    public async Task<Result<bool>> Handle(MarkEmailReadCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<bool>(Error.Unauthorized);
        }

        EmailMessage? message = await dbContext.Messages
            .FirstOrDefaultAsync(m => m.Id == request.Id, cancellationToken);

        if (message == null)
        {
            return Result.Failure<bool>("Message.NotFound", "E-posta iletisi bulunamadı.");
        }

        message.IsRead = request.IsRead;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class MarkEmailReadEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/email/messages/{id:guid}/read", async (Guid id, [Microsoft.AspNetCore.Mvc.FromBody] MarkEmailReadRequest? body, ISender sender, CancellationToken ct) =>
        {
            bool isRead = body?.IsRead ?? true;
            Result<bool> result = await sender.Send(new MarkEmailReadCommand(id, isRead), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(true))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("MarkEmailRead")
        .WithTags("Email")
        .RequirePermission("Emails.View");
    }
}

public class MarkEmailReadRequest
{
    public bool IsRead { get; set; } = true;
}
