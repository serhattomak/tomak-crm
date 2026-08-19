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

namespace CRM.Modules.Customers.Features.Notes.AddCustomerNote;

public record AddCustomerNoteRequest(string Content, bool IsPinned = false);

public record AddCustomerNoteCommand(Guid CustomerId, AddCustomerNoteRequest Request) : ICommand<Guid>;

public class AddCustomerNoteValidator : AbstractValidator<AddCustomerNoteCommand>
{
    public AddCustomerNoteValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Request.Content).NotEmpty().MaximumLength(5000);
    }
}

public class AddCustomerNoteHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AddCustomerNoteCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddCustomerNoteCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var customer = await dbContext.Customers
            .Where(c => c.Id == request.CustomerId && c.TenantId == currentTenant.Id.Value)
            .FirstOrDefaultAsync(cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException($"Customer '{request.CustomerId}' not found.");
        }

        var note = new CustomerNote
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            CustomerId = request.CustomerId,
            Content = request.Request.Content.Trim(),
            IsPinned = request.Request.IsPinned,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        customer.NotesCount += 1;
        dbContext.CustomerNotes.Add(note);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(note.Id);
    }
}

public class AddCustomerNoteEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/customers/{customerId:guid}/notes", async (
            Guid customerId,
            AddCustomerNoteRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AddCustomerNoteCommand(customerId, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.Update")
        .WithName("AddCustomerNote")
        .WithTags("Customers");
    }
}
