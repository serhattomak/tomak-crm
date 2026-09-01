using System.Text.RegularExpressions;
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
    string? Slug,
    string? SeoTitle,
    bool? IsPublished,
    bool? IsFeatured,
    int? SortOrder,
    decimal? WeightKg);

public record UpdateProductCommand(Guid Id, UpdateProductRequest Request) : ICommand<bool>;

public class UpdateProductValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.SellingPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.CostPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.Slug).MaximumLength(255).When(x => x.Request.Slug != null);
        RuleFor(x => x.Request.SeoTitle).MaximumLength(255).When(x => x.Request.SeoTitle != null);
        RuleFor(x => x.Request.WeightKg).GreaterThanOrEqualTo(0).When(x => x.Request.WeightKg.HasValue);
        RuleFor(x => x.Request.SortOrder).GreaterThanOrEqualTo(0).When(x => x.Request.SortOrder.HasValue);
    }
}

public class UpdateProductHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateProductCommand, bool>
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

        // E-commerce extensions
        if (req.Slug != null || !string.IsNullOrWhiteSpace(product.Name))
        {
            // Normalize: if explicit slug provided use it, otherwise keep existing or slugify name
            var raw = req.Slug;
            // When slug is explicitly provided (even empty string) we normalize; when null keep existing if present otherwise derive from name
            string normalized;
            if (raw != null)
            {
                normalized = Slugify(string.IsNullOrWhiteSpace(raw) ? product.Name : raw);
            }
            else
            {
                normalized = product.Slug != null ? product.Slug : Slugify(product.Name);
            }
            var unique = await EnsureUniqueSlugAsync(currentTenant.Id.Value, normalized, product.Id, cancellationToken);
            product.Slug = unique;
        }

        if (req.SeoTitle != null)
        {
            product.SeoTitle = string.IsNullOrWhiteSpace(req.SeoTitle) ? null : req.SeoTitle.Trim();
        }

        if (req.IsPublished.HasValue)
        {
            product.IsPublished = req.IsPublished.Value;
        }

        if (req.IsFeatured.HasValue)
        {
            product.IsFeatured = req.IsFeatured.Value;
        }

        if (req.SortOrder.HasValue)
        {
            product.SortOrder = req.SortOrder.Value;
        }

        if (req.WeightKg.HasValue)
        {
            product.WeightKg = req.WeightKg.Value;
        }
        else if (req.WeightKg == null && product.WeightKg != null)
        {
            // keep existing when not provided; only clear if explicitly wants null via separate API
            // no-op
        }

        product.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }

    private static string Slugify(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return "product";
        }

        var lower = input.Trim().ToLowerInvariant();
        lower = lower
            .Replace("ı", "i")
            .Replace("ğ", "g")
            .Replace("ü", "u")
            .Replace("ş", "s")
            .Replace("ö", "o")
            .Replace("ç", "c")
            .Replace("İ", "i")
            .Replace("Ğ", "g")
            .Replace("Ü", "u")
            .Replace("Ş", "s")
            .Replace("Ö", "o")
            .Replace("Ç", "c");
        lower = Regex.Replace(lower, @"[\s_]+", "-");
        lower = Regex.Replace(lower, @"[^a-z0-9\-]", string.Empty);
        lower = Regex.Replace(lower, @"\-{2,}", "-");
        lower = lower.Trim('-');
        if (string.IsNullOrWhiteSpace(lower))
        {
            return "product";
        }
        if (lower.Length > 255)
        {
            lower = lower[..255].TrimEnd('-');
        }
        return lower;
    }

    private async Task<string> EnsureUniqueSlugAsync(Guid tenantId, string baseSlug, Guid excludeId, CancellationToken ct)
    {
        var candidate = baseSlug;
        var suffix = 1;
        while (await dbContext.Products.AnyAsync(p => p.TenantId == tenantId && p.Slug == candidate && p.Id != excludeId, ct))
        {
            var suffixStr = "-" + suffix;
            var allowedBase = 255 - suffixStr.Length;
            var truncated = baseSlug.Length > allowedBase ? baseSlug[..allowedBase].TrimEnd('-') : baseSlug;
            candidate = truncated + suffixStr;
            suffix++;
            if (suffix > 1000)
            {
                break;
            }
        }
        return candidate;
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
