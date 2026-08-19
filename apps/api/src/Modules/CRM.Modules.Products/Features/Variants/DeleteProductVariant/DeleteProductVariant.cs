using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Variants.DeleteProductVariant;

public record DeleteProductVariantCommand(Guid ProductId, Guid VariantId) : ICommand<bool>;

public class DeleteProductVariantHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteProductVariantCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteProductVariantCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var variant = await dbContext.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == request.VariantId && v.ProductId == request.ProductId && v.TenantId == currentTenant.Id.Value, cancellationToken);

        if (variant == null)
        {
            throw new NotFoundException($"ProductVariant '{request.VariantId}' not found.");
        }

        dbContext.ProductVariants.Remove(variant);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteProductVariantEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/products/{productId:guid}/variants/{variantId:guid}", async (
            Guid productId,
            Guid variantId,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteProductVariantCommand(productId, variantId), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Delete")
        .WithName("DeleteProductVariant")
        .WithTags("Products");
    }
}
