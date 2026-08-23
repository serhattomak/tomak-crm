using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Pipelines.DeletePipeline;

public record DeletePipelineCommand(Guid Id) : ICommand<bool>;

public class DeletePipelineHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeletePipelineCommand, bool>
{
    public async Task<Result<bool>> Handle(DeletePipelineCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var pipeline = await dbContext.Pipelines
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.Id, cancellationToken);

        if (pipeline == null)
        {
            throw new NotFoundException($"Pipeline {request.Id} not found.");
        }

        var hasDeals = await dbContext.Deals
            .AnyAsync(d => d.TenantId == tenantId && d.PipelineId == request.Id, cancellationToken);

        if (hasDeals)
        {
            throw new BadRequestException("Bu pipeline'a ait fırsat kartları bulunmaktadır. Önce kartları başka bir pipeline'a aktarın veya silin.");
        }

        dbContext.Pipelines.Remove(pipeline);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeletePipelineEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/pipelines/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new DeletePipelineCommand(id);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Pipelines.Manage")
        .WithName("DeletePipeline")
        .WithTags("Pipelines");
    }
}
