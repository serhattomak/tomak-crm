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

namespace CRM.Modules.Products.Features.Products.CreateProduct;

public record CreateProductRequest(
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
    decimal? InitialStock,
    decimal? MinStockLevel,
    string? Status,
    string[]? Images,
    string[]? Tags,
    string? Attributes,
    string? Description);

public record CreateProductCommand(CreateProductRequest Request) : ICommand<Guid>;

public class CreateProductValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductValidator()
    {
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Request.Type).NotEmpty().Must(t => t is "Physical" or "Service" or "Digital" or "Subscription");
        RuleFor(x => x.Request.SellingPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Request.CostPrice).GreaterThanOrEqualTo(0);
    }
}

public class CreateProductHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateProductCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = request.Request;

        var isPhysical = req.Type == "Physical";
        var trackInventory = isPhysical && (req.TrackInventory ?? true);
        var initialStock = trackInventory ? (req.InitialStock ?? 0.00m) : 0.00m;

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CategoryId = req.CategoryId,
            Type = req.Type,
            Name = req.Name.Trim(),
            SKU = req.SKU?.Trim(),
            Barcode = req.Barcode?.Trim(),
            Brand = req.Brand?.Trim(),
            Unit = !string.IsNullOrWhiteSpace(req.Unit) ? req.Unit.Trim() : "Adet",
            CostPrice = req.CostPrice,
            SellingPrice = req.SellingPrice,
            Currency = !string.IsNullOrWhiteSpace(req.Currency) ? req.Currency.Trim() : "TRY",
            TaxRate = req.TaxRate ?? 20.00m,
            DiscountRate = req.DiscountRate ?? 0.00m,
            TrackInventory = trackInventory,
            CurrentStock = initialStock,
            ReservedStock = 0.00m,
            MinStockLevel = req.MinStockLevel ?? 5.00m,
            Status = !string.IsNullOrWhiteSpace(req.Status) ? req.Status : "Active",
            Images = req.Images,
            Tags = req.Tags,
            Attributes = req.Attributes,
            Description = req.Description?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (initialStock > 0)
        {
            product.StockMovements.Add(new ProductStockMovement
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ProductId = product.Id,
                MovementType = "In",
                Quantity = initialStock,
                PreviousStock = 0.00m,
                NewStock = initialStock,
                UnitCost = req.CostPrice,
                Reason = "Açılış / İlk Stok Girişi",
                CreatedAt = DateTime.UtcNow
            });
        }

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(product.Id);
    }
}

public class CreateProductEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/products", async (
            CreateProductRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CreateProductCommand(request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Create")
        .WithName("CreateProduct")
        .WithTags("Products");
    }
}
