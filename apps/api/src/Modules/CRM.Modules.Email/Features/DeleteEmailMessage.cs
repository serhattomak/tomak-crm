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

public record DeleteEmailMessageCommand(Guid Id) : ICommand<bool>;

public class DeleteEmailMessageHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteEmailMessageCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteEmailMessageCommand request, CancellationToken cancellationToken)
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

        dbContext.Messages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteEmailMessageEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/email/messages/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            Result<bool> result = await sender.Send(new DeleteEmailMessageCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(true))
                : Results.NotFound(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("DeleteEmailMessage")
        .WithTags("Email")
        .RequirePermission("Emails.Send");
    }
}
