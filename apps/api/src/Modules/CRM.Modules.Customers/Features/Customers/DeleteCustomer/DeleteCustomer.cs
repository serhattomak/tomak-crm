using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Customers.DeleteCustomer;

public record DeleteCustomerCommand(Guid Id) : ICommand;

public class DeleteCustomerHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteCustomerCommand>
{
    public async Task<Result> Handle(DeleteCustomerCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var customer = await dbContext.Customers
            .Where(c => c.Id == request.Id && c.TenantId == currentTenant.Id.Value)
            .FirstOrDefaultAsync(cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException($"Customer '{request.Id}' not found.");
        }

        dbContext.Customers.Remove(customer);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class DeleteCustomerEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/customers/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            await sender.Send(new DeleteCustomerCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(true));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.Delete")
        .WithName("DeleteCustomer")
        .WithTags("Customers");
    }
}
