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

namespace CRM.Modules.Customers.Features.Customers.CreateCustomer;

public record CreateCustomerRequest(
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
    Guid? AssignedEmployeeId,
    string? InitialContactFirstName,
    string? InitialContactLastName,
    string? InitialContactEmail,
    string? InitialContactPhone,
    string? InitialContactTitle);

public record CreateCustomerCommand(CreateCustomerRequest Request) : ICommand<Guid>;

public class CreateCustomerValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerValidator()
    {
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Type).NotEmpty().Must(t => t is "Company" or "Individual");
        RuleFor(x => x.Request.Status).NotEmpty().Must(s => s is "Lead" or "Active" or "Passive" or "Churned");
        RuleFor(x => x.Request.Tier).NotEmpty().Must(t => t is "VIP" or "Enterprise" or "SME" or "Standard");
    }
}

public class CreateCustomerHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateCustomerCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = request.Request;

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Type = req.Type,
            Name = req.Name.Trim(),
            Email = req.Email?.Trim(),
            Phone = req.Phone?.Trim(),
            Website = req.Website?.Trim(),
            Status = req.Status,
            Tier = req.Tier,
            Industry = req.Industry?.Trim(),
            Tags = req.Tags,
            TaxOffice = req.TaxOffice?.Trim(),
            TaxNumber = req.TaxNumber?.Trim(),
            AddressLine = req.AddressLine?.Trim(),
            City = req.City?.Trim(),
            State = req.State?.Trim(),
            PostalCode = req.PostalCode?.Trim(),
            Country = req.Country?.Trim() ?? "Türkiye",
            AssignedEmployeeId = req.AssignedEmployeeId,
            Currency = "TRY",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add primary contact if provided
        if (!string.IsNullOrWhiteSpace(req.InitialContactFirstName) || !string.IsNullOrWhiteSpace(req.InitialContactLastName))
        {
            var contact = new CustomerContact
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CustomerId = customer.Id,
                FirstName = req.InitialContactFirstName?.Trim() ?? string.Empty,
                LastName = req.InitialContactLastName?.Trim() ?? string.Empty,
                Email = req.InitialContactEmail?.Trim() ?? req.Email?.Trim(),
                Phone = req.InitialContactPhone?.Trim() ?? req.Phone?.Trim(),
                Title = req.InitialContactTitle?.Trim() ?? "Yetkili",
                IsPrimary = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            customer.Contacts.Add(contact);
        }

        // Add initial creation activity log
        customer.Activities.Add(new CustomerActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customer.Id,
            ActivityType = "Note",
            Title = "Müşteri Kaydı Oluşturuldu",
            Description = $"{customer.Name} ({customer.Type}) sisteme başarıyla kaydedildi.",
            PerformedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });

        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(customer.Id);
    }
}

public class CreateCustomerEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/customers", async (
            CreateCustomerRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CreateCustomerCommand(request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.Create")
        .WithName("CreateCustomer")
        .WithTags("Customers");
    }
}
