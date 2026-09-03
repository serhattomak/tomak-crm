using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Products.Features.Suppliers.CreateSupplier;

public record CreateSupplierRequest(
    string Name,
    string? ContactName,
    string? Email,
    string? Phone,
    string? Address,
    bool? IsActive);

public record CreateSupplierCommand(CreateSupplierRequest Request) : ICommand<Guid>;

public class CreateSupplierValidator : AbstractValidator<CreateSupplierCommand>
{
    public CreateSupplierValidator()
    {
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Request.Email));
    }
}

public class CreateSupplierHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateSupplierCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateSupplierCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var req = request.Request;
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            Name = req.Name.Trim(),
            ContactName = req.ContactName?.Trim(),
            Email = req.Email?.Trim(),
            Phone = req.Phone?.Trim(),
            Address = req.Address?.Trim(),
            IsActive = req.IsActive ?? true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Suppliers.Add(supplier);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(supplier.Id);
    }
}

public class CreateSupplierEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/suppliers", async (
            CreateSupplierRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CreateSupplierCommand(request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Create")
        .WithName("CreateSupplier")
        .WithTags("Suppliers");
    }
}
