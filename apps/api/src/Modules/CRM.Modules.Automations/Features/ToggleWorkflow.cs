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

public record ToggleWorkflowCommand(Guid Id, bool? IsActive = null) : ICommand<bool>;

public class ToggleWorkflowHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ToggleWorkflowCommand, bool>
{
    public async Task<Result<bool>> Handle(ToggleWorkflowCommand request, CancellationToken cancellationToken)
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

        workflow.IsActive = request.IsActive ?? !workflow.IsActive;
        workflow.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(workflow.IsActive);
    }
}

public class ToggleWorkflowEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/automations/{id:guid}/toggle", async (Guid id, ToggleWorkflowCommand? body, ISender sender, CancellationToken ct) =>
        {
            var command = new ToggleWorkflowCommand(id, body?.IsActive);
            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("ToggleWorkflow")
        .WithTags("Automations")
        .RequirePermission("Automations.Manage");
    }
}
