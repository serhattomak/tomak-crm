using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Orders.DeleteOrder;

public record DeleteOrderCommand(Guid Id) : ICommand<bool>;

public class DeleteOrderHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteOrderCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteOrderCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == request.Id && o.TenantId == currentTenant.Id.Value, cancellationToken);

        if (order == null)
        {
            throw new NotFoundException($"Order '{request.Id}' not found.");
        }

        dbContext.Orders.Remove(order);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteOrderEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/orders/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteOrderCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.Delete")
        .WithName("DeleteOrder")
        .WithTags("Orders");
    }
}
