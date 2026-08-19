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
    string? Description);

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
        product.UpdatedAt = DateTime.UtcNow;

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
