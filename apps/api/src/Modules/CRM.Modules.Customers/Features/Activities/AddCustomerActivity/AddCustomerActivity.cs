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

namespace CRM.Modules.Customers.Features.Activities.AddCustomerActivity;

public record AddCustomerActivityRequest(
    string ActivityType,
    string Title,
    string? Description,
    DateTime? PerformedAt);

public record AddCustomerActivityCommand(Guid CustomerId, AddCustomerActivityRequest Request) : ICommand<Guid>;

public class AddCustomerActivityValidator : AbstractValidator<AddCustomerActivityCommand>
{
    public AddCustomerActivityValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Request.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.ActivityType).NotEmpty().Must(t => t is "Call" or "Meeting" or "Email" or "Note" or "StatusChange" or "DealCreated");
    }
}

public class AddCustomerActivityHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AddCustomerActivityCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddCustomerActivityCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var customerExists = await dbContext.Customers
            .AnyAsync(c => c.Id == request.CustomerId && c.TenantId == currentTenant.Id.Value, cancellationToken);

        if (!customerExists)
        {
            throw new NotFoundException($"Customer '{request.CustomerId}' not found.");
        }

        var req = request.Request;

        var activity = new CustomerActivity
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            CustomerId = request.CustomerId,
            ActivityType = req.ActivityType,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            PerformedAt = req.PerformedAt ?? DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.CustomerActivities.Add(activity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(activity.Id);
    }
}

public class AddCustomerActivityEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/customers/{customerId:guid}/activities", async (
            Guid customerId,
            AddCustomerActivityRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AddCustomerActivityCommand(customerId, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.Update")
        .WithName("AddCustomerActivity")
        .WithTags("Customers");
    }
}
