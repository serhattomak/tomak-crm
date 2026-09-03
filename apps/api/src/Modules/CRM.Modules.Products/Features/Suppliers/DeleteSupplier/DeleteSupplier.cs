using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Suppliers.DeleteSupplier;

public record DeleteSupplierCommand(Guid Id) : ICommand<bool>;

public class DeleteSupplierHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteSupplierCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteSupplierCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var supplier = await dbContext.Suppliers
            .FirstOrDefaultAsync(s => s.Id == request.Id && s.TenantId == currentTenant.Id.Value, cancellationToken)
            ?? throw new NotFoundException($"Supplier '{request.Id}' not found.");

        dbContext.Suppliers.Remove(supplier);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteSupplierEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/suppliers/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteSupplierCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Delete")
        .WithName("DeleteSupplier")
        .WithTags("Suppliers");
    }
}
