using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Contacts.DeleteCustomerContact;

public record DeleteCustomerContactCommand(Guid CustomerId, Guid ContactId) : ICommand;

public class DeleteCustomerContactHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteCustomerContactCommand>
{
    public async Task<Result> Handle(DeleteCustomerContactCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var contact = await dbContext.CustomerContacts
            .Where(c => c.Id == request.ContactId && c.CustomerId == request.CustomerId && c.TenantId == currentTenant.Id.Value)
            .FirstOrDefaultAsync(cancellationToken);

        if (contact == null)
        {
            throw new NotFoundException($"CustomerContact '{request.ContactId}' not found.");
        }

        dbContext.CustomerContacts.Remove(contact);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class DeleteCustomerContactEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/customers/{customerId:guid}/contacts/{contactId:guid}", async (
            Guid customerId,
            Guid contactId,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            await sender.Send(new DeleteCustomerContactCommand(customerId, contactId), ct);
            return Results.Ok(ApiResponse<bool>.Ok(true));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.Update")
        .WithName("DeleteCustomerContact")
        .WithTags("Customers");
    }
}
