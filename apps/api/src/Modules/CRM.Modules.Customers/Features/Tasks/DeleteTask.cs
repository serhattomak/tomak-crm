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

public record DeleteTaskCommand(Guid Id) : ICommand<bool>;

public class DeleteTaskHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteTaskCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteTaskCommand request, CancellationToken cancellationToken)
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

        dbContext.Tasks.Remove(task);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteTaskEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/tasks/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new DeleteTaskCommand(id);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("DeleteTask")
        .WithTags("Tasks");
    }
}
