using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Brands.DeleteBrand;

public record DeleteBrandCommand(Guid Id) : ICommand<bool>;

public class DeleteBrandHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteBrandCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteBrandCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var brand = await dbContext.Brands
            .FirstOrDefaultAsync(b => b.Id == request.Id && b.TenantId == currentTenant.Id.Value, cancellationToken)
            ?? throw new NotFoundException($"Brand ''{request.Id}'' not found.");

        dbContext.Brands.Remove(brand);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteBrandEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/brands/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteBrandCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Delete")
        .WithName("DeleteBrand")
        .WithTags("Brands");
    }
}
