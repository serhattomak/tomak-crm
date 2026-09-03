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

namespace CRM.Modules.Products.Features.Variants.UpdateProductVariant;

public record UpdateProductVariantRequest(
    string? Name,
    string? SKU,
    string? Barcode,
    decimal? AdditionalPrice,
    decimal? StockQuantity,
    string? Attributes,
    string[]? Images,
    bool? IsActive);

public record UpdateProductVariantCommand(Guid ProductId, Guid VariantId, UpdateProductVariantRequest Request) : ICommand<bool>;

public class UpdateProductVariantValidator : AbstractValidator<UpdateProductVariantCommand>
{
    public UpdateProductVariantValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.VariantId).NotEmpty();
        RuleFor(x => x.Request.Name).MaximumLength(150);
    }
}

public class UpdateProductVariantHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateProductVariantCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateProductVariantCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var variant = await dbContext.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == request.VariantId && v.ProductId == request.ProductId && v.TenantId == tenantId, cancellationToken);

        if (variant == null)
        {
            throw new NotFoundException($"Variant '{request.VariantId}' not found.");
        }

        var req = request.Request;

        if (!string.IsNullOrWhiteSpace(req.Name))
        {
            variant.Name = req.Name.Trim();
        }

        if (req.SKU is not null)
        {
            variant.SKU = string.IsNullOrWhiteSpace(req.SKU) ? null : req.SKU.Trim();
        }

        if (req.Barcode is not null)
        {
            variant.Barcode = string.IsNullOrWhiteSpace(req.Barcode) ? null : req.Barcode.Trim();
        }

        if (req.AdditionalPrice.HasValue)
        {
            variant.AdditionalPrice = req.AdditionalPrice.Value;
        }

        if (req.StockQuantity.HasValue)
        {
            variant.StockQuantity = req.StockQuantity.Value;
        }

        if (req.Attributes is not null)
        {
            variant.Attributes = req.Attributes;
        }

        if (req.Images is not null)
        {
            variant.Images = req.Images;
        }

        if (req.IsActive.HasValue)
        {
            variant.IsActive = req.IsActive.Value;
        }

        variant.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class UpdateProductVariantEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/products/{id:guid}/variants/{variantId:guid}", async (
            Guid id,
            Guid variantId,
            UpdateProductVariantRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateProductVariantCommand(id, variantId, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Update")
        .WithName("UpdateProductVariant")
        .WithTags("Products");
    }
}
