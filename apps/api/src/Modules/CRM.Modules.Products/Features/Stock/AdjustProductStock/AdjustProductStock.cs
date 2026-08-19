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

namespace CRM.Modules.Products.Features.Stock.AdjustProductStock;

public record AdjustProductStockRequest(
    Guid? VariantId,
    string MovementType, // "In", "Out", "Adjustment", "Return"
    decimal Quantity,
    decimal? UnitCost,
    string? ReferenceNumber,
    string? Reason,
    string? Notes);

public record AdjustProductStockCommand(Guid ProductId, AdjustProductStockRequest Request) : ICommand<Guid>;

public class AdjustProductStockValidator : AbstractValidator<AdjustProductStockCommand>
{
    public AdjustProductStockValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Request.MovementType).NotEmpty().Must(m => m is "In" or "Out" or "Adjustment" or "Return");
        RuleFor(x => x.Request.Quantity).GreaterThan(0);
    }
}

public class AdjustProductStockHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AdjustProductStockCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AdjustProductStockCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var product = await dbContext.Products
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId && p.TenantId == tenantId, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product '{request.ProductId}' not found.");
        }

        if (!product.TrackInventory)
        {
            throw new AppException("This product does not track inventory.");
        }

        var req = request.Request;
        var previousStock = product.CurrentStock;
        decimal newStock;

        switch (req.MovementType)
        {
            case "In":
            case "Return":
                newStock = previousStock + req.Quantity;
                break;
            case "Out":
                newStock = Math.Max(0, previousStock - req.Quantity);
                break;
            case "Adjustment":
                newStock = req.Quantity; // In adjustment, quantity is the counted target stock
                break;
            default:
                newStock = previousStock;
                break;
        }

        product.CurrentStock = newStock;
        product.UpdatedAt = DateTime.UtcNow;

        if (req.UnitCost.HasValue && req.UnitCost.Value > 0)
        {
            product.CostPrice = req.UnitCost.Value;
        }

        // If variant adjustment
        if (req.VariantId.HasValue)
        {
            var variant = product.Variants.FirstOrDefault(v => v.Id == req.VariantId.Value);
            if (variant != null)
            {
                var prevVarStock = variant.StockQuantity;
                decimal newVarStock;
                switch (req.MovementType)
                {
                    case "In":
                    case "Return":
                        newVarStock = prevVarStock + req.Quantity;
                        break;
                    case "Out":
                        newVarStock = Math.Max(0, prevVarStock - req.Quantity);
                        break;
                    case "Adjustment":
                        newVarStock = req.Quantity;
                        break;
                    default:
                        newVarStock = prevVarStock;
                        break;
                }
                variant.StockQuantity = newVarStock;
                variant.UpdatedAt = DateTime.UtcNow;
            }
        }

        var movement = new ProductStockMovement
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProductId = product.Id,
            VariantId = req.VariantId,
            MovementType = req.MovementType,
            Quantity = req.Quantity,
            PreviousStock = previousStock,
            NewStock = newStock,
            UnitCost = req.UnitCost ?? product.CostPrice,
            ReferenceNumber = req.ReferenceNumber?.Trim(),
            Reason = req.Reason?.Trim(),
            Notes = req.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ProductStockMovements.Add(movement);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(movement.Id);
    }
}

public class AdjustProductStockEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/products/{id:guid}/stock-adjustments", async (
            Guid id,
            AdjustProductStockRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AdjustProductStockCommand(id, request), ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.StockAdjust")
        .WithName("AdjustProductStock")
        .WithTags("Products");
    }
}
