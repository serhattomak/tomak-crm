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
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Variants.AddProductVariant;

public record AddProductVariantRequest(
    string Name,
    string? SKU,
    string? Barcode,
    decimal? AdditionalPrice,
    decimal? StockQuantity,
    string? Attributes);

public record AddProductVariantCommand(Guid ProductId, AddProductVariantRequest Request) : ICommand<Guid>;

public class AddProductVariantValidator : AbstractValidator<AddProductVariantCommand>
{
    public AddProductVariantValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(150);
    }
}

public class AddProductVariantHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AddProductVariantCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddProductVariantCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var product = await dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId && p.TenantId == tenantId, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product '{request.ProductId}' not found.");
        }

        var req = request.Request;

        var variant = new ProductVariant
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProductId = product.Id,
            Name = req.Name.Trim(),
            SKU = req.SKU?.Trim(),
            Barcode = req.Barcode?.Trim(),
            AdditionalPrice = req.AdditionalPrice ?? 0.00m,
            StockQuantity = req.StockQuantity ?? 0.00m,
            Attributes = req.Attributes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.ProductVariants.Add(variant);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(variant.Id);
    }
}

public class AddProductVariantEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/products/{id:guid}/variants", async (
            Guid id,
            AddProductVariantRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AddProductVariantCommand(id, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Create")
        .WithName("AddProductVariant")
        .WithTags("Products");
    }
}
