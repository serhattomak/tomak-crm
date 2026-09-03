using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Suppliers.UpdateSupplier;

public record UpdateSupplierRequest(
    string Name,
    string? ContactName,
    string? Email,
    string? Phone,
    string? Address,
    bool? IsActive);

public record UpdateSupplierCommand(Guid Id, UpdateSupplierRequest Request) : ICommand<bool>;

public class UpdateSupplierValidator : AbstractValidator<UpdateSupplierCommand>
{
    public UpdateSupplierValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Request.Email));
    }
}

public class UpdateSupplierHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateSupplierCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateSupplierCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var supplier = await dbContext.Suppliers
            .FirstOrDefaultAsync(s => s.Id == request.Id && s.TenantId == currentTenant.Id.Value, cancellationToken)
            ?? throw new NotFoundException($"Supplier '{request.Id}' not found.");

        var req = request.Request;
        supplier.Name = req.Name.Trim();
        supplier.ContactName = req.ContactName?.Trim();
        supplier.Email = req.Email?.Trim();
        supplier.Phone = req.Phone?.Trim();
        supplier.Address = req.Address?.Trim();
        if (req.IsActive.HasValue) supplier.IsActive = req.IsActive.Value;
        supplier.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class UpdateSupplierEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/suppliers/{id:guid}", async (
            Guid id,
            UpdateSupplierRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateSupplierCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Update")
        .WithName("UpdateSupplier")
        .WithTags("Suppliers");
    }
}
