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

namespace CRM.Modules.Customers.Features.Customers.UpdateCustomer;

public record UpdateCustomerRequest(
    string Type,
    string Name,
    string? Email,
    string? Phone,
    string? Website,
    string Status,
    string Tier,
    string? Industry,
    string[]? Tags,
    string? TaxOffice,
    string? TaxNumber,
    string? AddressLine,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    Guid? AssignedEmployeeId);

public record UpdateCustomerCommand(Guid Id, UpdateCustomerRequest Request) : ICommand;

public class UpdateCustomerValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Type).NotEmpty().Must(t => t is "Company" or "Individual");
        RuleFor(x => x.Request.Status).NotEmpty().Must(s => s is "Lead" or "Active" or "Passive" or "Churned");
        RuleFor(x => x.Request.Tier).NotEmpty().Must(t => t is "VIP" or "Enterprise" or "SME" or "Standard");
    }
}

public class UpdateCustomerHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateCustomerCommand>
{
    public async Task<Result> Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
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

        var req = request.Request;
        var previousStatus = customer.Status;

        customer.Type = req.Type;
        customer.Name = req.Name.Trim();
        customer.Email = req.Email?.Trim();
        customer.Phone = req.Phone?.Trim();
        customer.Website = req.Website?.Trim();
        customer.Status = req.Status;
        customer.Tier = req.Tier;
        customer.Industry = req.Industry?.Trim();
        customer.Tags = req.Tags;
        customer.TaxOffice = req.TaxOffice?.Trim();
        customer.TaxNumber = req.TaxNumber?.Trim();
        customer.AddressLine = req.AddressLine?.Trim();
        customer.City = req.City?.Trim();
        customer.State = req.State?.Trim();
        customer.PostalCode = req.PostalCode?.Trim();
        customer.Country = req.Country?.Trim() ?? "Türkiye";
        customer.AssignedEmployeeId = req.AssignedEmployeeId;
        customer.UpdatedAt = DateTime.UtcNow;

        if (previousStatus != req.Status)
        {
            dbContext.CustomerActivities.Add(new CustomerActivity
            {
                Id = Guid.NewGuid(),
                TenantId = currentTenant.Id.Value,
                CustomerId = customer.Id,
                ActivityType = "StatusChange",
                Title = "Statü Değişikliği",
                Description = $"Müşteri statüsü '{previousStatus}' -> '{req.Status}' olarak güncellendi.",
                PerformedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class UpdateCustomerEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/customers/{id:guid}", async (
            Guid id,
            UpdateCustomerRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            await sender.Send(new UpdateCustomerCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(true));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.Update")
        .WithName("UpdateCustomer")
        .WithTags("Customers");
    }
}
