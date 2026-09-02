using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Webhooks.Data;
using CRM.Modules.Webhooks.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Webhooks.Features;

public record DeleteWebhookCommand(Guid Id) : ICommand<bool>;

public class DeleteWebhookHandler(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteWebhookCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteWebhookCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<bool>(Error.Unauthorized);
        }

        WebhookEndpoint? endpoint = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);

        if (endpoint == null)
        {
            return Result.Failure<bool>(Error.NotFound);
        }

        if (endpoint.TenantId != currentTenant.Id.Value)
        {
            return Result.Failure<bool>(Error.NotFound);
        }

        // Explicitly remove deliveries before removing endpoint to ensure cascade even if DB cascade not configured.
        // EF Core cascade will handle it, but we also do RemoveRange for explicitness as per acceptance.
        List<WebhookDelivery> deliveries = await dbContext.WebhookDeliveries
            .Where(d => d.EndpointId == endpoint.Id)
            .ToListAsync(cancellationToken);

        if (deliveries.Count > 0)
        {
            dbContext.WebhookDeliveries.RemoveRange(deliveries);
        }

        dbContext.WebhookEndpoints.Remove(endpoint);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteWebhookEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/webhooks/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            Result<bool> result = await sender.Send(new DeleteWebhookCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(true))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("DeleteWebhook")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.Delete");
    }
}
