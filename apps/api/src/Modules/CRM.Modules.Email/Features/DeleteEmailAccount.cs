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

public record DeleteEmailAccountCommand(Guid Id) : ICommand<bool>;

public class DeleteEmailAccountHandler(
    EmailDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteEmailAccountCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteEmailAccountCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<bool>(Error.Unauthorized);
        }

        EmailAccount? account = await dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

        if (account == null)
        {
            return Result.Failure<bool>("Account.NotFound", "E-posta hesabı bulunamadı.");
        }

        dbContext.Accounts.Remove(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteEmailAccountEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/email/accounts/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            Result<bool> result = await sender.Send(new DeleteEmailAccountCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(true))
                : Results.NotFound(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("DeleteEmailAccount")
        .WithTags("Email")
        .RequirePermission("Emails.ManageAccounts");
    }
}
