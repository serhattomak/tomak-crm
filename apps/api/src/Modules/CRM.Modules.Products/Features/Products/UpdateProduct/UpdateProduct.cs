using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Products.UpdateProduct;

public record UpdateProductRequest(
    Guid? CategoryId,
    string Type,
    string Name,
    string? SKU,
    string? Barcode,
    string? Brand,
    string Unit,
    decimal CostPrice,
    decimal SellingPrice,
    string? Currency,
    decimal? TaxRate,
    decimal? DiscountRate,
    bool? TrackInventory,
    decimal? MinStockLevel,
    string? Status,
    string[]? Images,
    string[]? Tags,
    string? Attributes,
    string? Description,
    // F2-4 SEO
    string? Slug,
    string? SeoTitle,
    string? SeoDescription,
    string? RichDescription,
    bool? IsPublished,
    bool? IsFeatured,
    int? SortOrder,
    decimal? WeightKg,
    string? Dimensions);

public record UpdateProductCommand(Guid Id, UpdateProductRequest Request) : ICommand<bool>;

public class UpdateProductValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.SellingPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.CostPrice).GreaterThanOrEqualTo(0);
    }
}

public class UpdateProductHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant,
    ICurrentUser currentUser) : ICommandHandler<UpdateProductCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var product = await dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.TenantId == currentTenant.Id.Value, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product '{request.Id}' not found.");
        }

        var req = request.Request;

        // F2-3: capture old prices before mutation for price-history ledger
        var oldCostPrice = product.CostPrice;
        var oldSellingPrice = product.SellingPrice;
        var oldCurrency = product.Currency;

        product.CategoryId = req.CategoryId;
        product.Type = req.Type;
        product.Name = req.Name.Trim();
        product.SKU = req.SKU?.Trim();
        product.Barcode = req.Barcode?.Trim();
        product.Brand = req.Brand?.Trim();
        product.Unit = !string.IsNullOrWhiteSpace(req.Unit) ? req.Unit.Trim() : "Adet";
        product.CostPrice = req.CostPrice;
        product.SellingPrice = req.SellingPrice;
        product.Currency = !string.IsNullOrWhiteSpace(req.Currency) ? req.Currency.Trim() : "TRY";
        product.TaxRate = req.TaxRate ?? 20.00m;
        product.DiscountRate = req.DiscountRate ?? 0.00m;
        product.TrackInventory = req.Type == "Physical" && (req.TrackInventory ?? product.TrackInventory);
        product.MinStockLevel = req.MinStockLevel ?? product.MinStockLevel;
        product.Status = !string.IsNullOrWhiteSpace(req.Status) ? req.Status : product.Status;
        product.Images = req.Images;
        product.Tags = req.Tags;
        product.Attributes = req.Attributes;
        product.Description = req.Description?.Trim();
        // F2-4 SEO - slug boşsa DB trigger otomatik üretir
        if (req.Slug is not null) product.Slug = req.Slug.Trim().Length > 0 ? req.Slug.Trim() : null;
        if (req.SeoTitle is not null) product.SeoTitle = req.SeoTitle.Trim().Length > 0 ? req.SeoTitle.Trim() : null;
        if (req.SeoDescription is not null) product.SeoDescription = req.SeoDescription.Trim().Length > 0 ? req.SeoDescription.Trim() : null;
        if (req.RichDescription is not null) product.RichDescription = req.RichDescription.Trim().Length > 0 ? req.RichDescription.Trim() : null;
        if (req.IsPublished.HasValue) product.IsPublished = req.IsPublished.Value;
        if (req.IsFeatured.HasValue) product.IsFeatured = req.IsFeatured.Value;
        if (req.SortOrder.HasValue) product.SortOrder = req.SortOrder.Value;
        if (req.WeightKg.HasValue) product.WeightKg = req.WeightKg.Value;
        if (req.Dimensions is not null) product.Dimensions = req.Dimensions.Trim().Length > 0 ? req.Dimensions.Trim() : null;
        product.UpdatedAt = DateTime.UtcNow;

        // F2-3: append price-history row only when a price actually changed
        if (oldCostPrice != product.CostPrice || oldSellingPrice != product.SellingPrice)
        {
            dbContext.ProductPriceHistory.Add(new ProductPriceHistory
            {
                TenantId = product.TenantId,
                ProductId = product.Id,
                OldCostPrice = oldCostPrice,
                NewCostPrice = product.CostPrice,
                OldSellingPrice = oldSellingPrice,
                NewSellingPrice = product.SellingPrice,
                Currency = product.Currency ?? oldCurrency ?? "TRY",
                ChangedByUserId = currentUser.Id,
                CreatedAt = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class UpdateProductEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/products/{id:guid}", async (
            Guid id,
            UpdateProductRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateProductCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Update")
        .WithName("UpdateProduct")
        .WithTags("Products");
    }
}
