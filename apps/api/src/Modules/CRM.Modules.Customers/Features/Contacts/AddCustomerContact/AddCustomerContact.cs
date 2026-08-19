using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Contacts.AddCustomerContact;

public record AddCustomerContactRequest(
    string FirstName,
    string LastName,
    string? Title,
    string? Department,
    string? Email,
    string? Phone,
    string? Mobile,
    bool IsPrimary,
    string? Notes);

public record AddCustomerContactCommand(Guid CustomerId, AddCustomerContactRequest Request) : ICommand<Guid>;

public class AddCustomerContactValidator : AbstractValidator<AddCustomerContactCommand>
{
    public AddCustomerContactValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Request.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Request.LastName).NotEmpty().MaximumLength(100);
    }
}

public class AddCustomerContactHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AddCustomerContactCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddCustomerContactCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var customerExists = await dbContext.Customers
            .AnyAsync(c => c.Id == request.CustomerId && c.TenantId == tenantId, cancellationToken);

        if (!customerExists)
        {
            throw new NotFoundException($"Customer '{request.CustomerId}' not found.");
        }

        var req = request.Request;

        if (req.IsPrimary)
        {
            // Reset other primary contacts for this customer
            var existingPrimaries = await dbContext.CustomerContacts
                .Where(c => c.CustomerId == request.CustomerId && c.TenantId == tenantId && c.IsPrimary)
                .ToListAsync(cancellationToken);

            foreach (var p in existingPrimaries)
            {
                p.IsPrimary = false;
            }
        }

        var contact = new CustomerContact
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = request.CustomerId,
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            Title = req.Title?.Trim(),
            Department = req.Department?.Trim(),
            Email = req.Email?.Trim(),
            Phone = req.Phone?.Trim(),
            Mobile = req.Mobile?.Trim(),
            IsPrimary = req.IsPrimary,
            Notes = req.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.CustomerContacts.Add(contact);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(contact.Id);
    }
}

public class AddCustomerContactEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/customers/{customerId:guid}/contacts", async (
            Guid customerId,
            AddCustomerContactRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AddCustomerContactCommand(customerId, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.Update")
        .WithName("AddCustomerContact")
        .WithTags("Customers");
    }
}
