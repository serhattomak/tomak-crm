using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Automations.Data;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Automations.Features;

public record DeleteWorkflowCommand(Guid Id) : ICommand<bool>;

public class DeleteWorkflowHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteWorkflowCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteWorkflowCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<bool>(Error.Unauthorized);
        }

        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);
        if (workflow == null)
        {
            return Result.Failure<bool>(Error.NotFound);
        }

        dbContext.Workflows.Remove(workflow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteWorkflowEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/automations/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteWorkflowCommand(id), ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<bool>.Ok(true))
                                    : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("DeleteWorkflow")
        .WithTags("Automations")
        .RequirePermission("Automations.Delete");
    }
}
