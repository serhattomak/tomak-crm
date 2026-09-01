using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Tasks;

public record ToggleTaskStatusRequest(bool? IsCompleted = null);

public record ToggleTaskStatusCommand(Guid Id, bool? IsCompleted = null) : ICommand<bool>;

public class ToggleTaskStatusHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ToggleTaskStatusCommand, bool>
{
    public async Task<Result<bool>> Handle(ToggleTaskStatusCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var task = await dbContext.Tasks
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (task == null)
        {
            throw new NotFoundException($"Task {request.Id} not found.");
        }

        if (task.TenantId != currentTenant.Id.Value)
        {
            throw new ForbiddenException("Unauthorized access to task.");
        }

        bool newStatus = request.IsCompleted ?? !task.IsCompleted;
        task.IsCompleted = newStatus;
        task.Status = newStatus ? "Completed" : "Pending";
        task.CompletedAt = newStatus ? DateTime.UtcNow : null;
        task.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(task.IsCompleted);
    }
}

public class ToggleTaskStatusEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/tasks/{id:guid}/toggle", async (
            Guid id,
            ToggleTaskStatusRequest? body,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new ToggleTaskStatusCommand(id, body?.IsCompleted);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("ToggleTaskStatus")
        .WithTags("Tasks");
    }
}
