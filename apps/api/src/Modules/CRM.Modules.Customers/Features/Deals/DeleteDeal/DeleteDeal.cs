using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Deals.DeleteDeal;

public record DeleteDealCommand(Guid Id) : ICommand<bool>;

public class DeleteDealHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteDealCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteDealCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var deal = await dbContext.Deals
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == request.Id, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException($"Deal {request.Id} not found.");
        }

        var customerId = deal.CustomerId;

        dbContext.Deals.Remove(deal);

        if (customerId.HasValue)
        {
            var customer = await dbContext.Customers.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == customerId.Value, cancellationToken);
            if (customer != null && customer.DealsCount > 0)
            {
                customer.DealsCount -= 1;
                customer.UpdatedAt = DateTime.UtcNow;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteDealEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/deals/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new DeleteDealCommand(id);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.Delete")
        .WithName("DeleteDeal")
        .WithTags("Deals");
    }
}
