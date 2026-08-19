using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Categories.DeleteProductCategory;

public record DeleteProductCategoryCommand(Guid Id) : ICommand<bool>;

public class DeleteProductCategoryHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteProductCategoryCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteProductCategoryCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var category = await dbContext.ProductCategories
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.TenantId == currentTenant.Id.Value, cancellationToken);

        if (category == null)
        {
            throw new NotFoundException($"ProductCategory '{request.Id}' not found.");
        }

        dbContext.ProductCategories.Remove(category);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeleteProductCategoryEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/products/categories/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteProductCategoryCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Delete")
        .WithName("DeleteProductCategory")
        .WithTags("Products");
    }
}
