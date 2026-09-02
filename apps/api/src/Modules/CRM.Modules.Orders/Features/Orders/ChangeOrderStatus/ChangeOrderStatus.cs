using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Orders.ChangeOrderStatus;

public record ChangeOrderStatusRequest(
    string NewStatus, // Draft, PendingApproval, Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded
    string? Notes);

public record ChangeOrderStatusCommand(Guid Id, ChangeOrderStatusRequest Request) : ICommand<bool>;

public class ChangeOrderStatusValidator : AbstractValidator<ChangeOrderStatusCommand>
{
    public ChangeOrderStatusValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.NewStatus).NotEmpty().Must(s => s is
            "Draft" or "PendingApproval" or "Confirmed" or "Processing" or "Shipped" or "Delivered" or "Cancelled" or "Refunded");
    }
}

public class ChangeOrderStatusHandler(
    OrdersDbContext dbContext,
    ProductsDbContext productsDbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ChangeOrderStatusCommand, bool>
{
    public async Task<Result<bool>> Handle(ChangeOrderStatusCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var order = await dbContext.Orders
            .Include(o => o.Items)
            .Include(o => o.Activities)
            .FirstOrDefaultAsync(o => o.Id == request.Id && o.TenantId == tenantId, cancellationToken);

        if (order == null)
        {
            throw new NotFoundException($"Order '{request.Id}' not found.");
        }

        var oldStatus = order.Status;
        var newStatus = request.Request.NewStatus;

        if (oldStatus == newStatus)
        {
            return Result.Success(true);
        }

        // 1. Stock Adjustments on Status Transition
        var wasStockDeducted = oldStatus is "Confirmed" or "Processing" or "Shipped" or "Delivered";
        var willStockBeDeducted = newStatus is "Confirmed" or "Processing" or "Shipped" or "Delivered";

        // Transition from Draft/Pending -> Confirmed (Deduct Stock)
        if (!wasStockDeducted && willStockBeDeducted)
        {
            foreach (var item in order.Items.Where(i => i.ProductId.HasValue))
            {
                var prod = await productsDbContext.Products
                    .Include(p => p.Variants)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId!.Value && p.TenantId == tenantId, cancellationToken);

                if (prod != null && prod.TrackInventory && prod.Type == "Physical")
                {
                    var prevStock = prod.CurrentStock;
                    var newStock = Math.Max(0, prevStock - item.Quantity);
                    prod.CurrentStock = newStock;
                    prod.UpdatedAt = DateTime.UtcNow;

                    if (item.VariantId.HasValue)
                    {
                        var variant = prod.Variants.FirstOrDefault(v => v.Id == item.VariantId.Value);
                        if (variant != null)
                        {
                            variant.StockQuantity = Math.Max(0, variant.StockQuantity - item.Quantity);
                            variant.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    productsDbContext.ProductStockMovements.Add(new ProductStockMovement
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        ProductId = prod.Id,
                        VariantId = item.VariantId,
                        MovementType = "Out",
                        Quantity = item.Quantity,
                        PreviousStock = prevStock,
                        NewStock = newStock,
                        UnitCost = item.UnitCost,
                        ReferenceNumber = order.OrderNumber,
                        Reason = $"Sipariş Onaylandı ({order.OrderNumber})",
                        Notes = $"Durum: {oldStatus} -> {newStatus}",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            await productsDbContext.SaveChangesAsync(cancellationToken);
        }
        // Transition from Confirmed/Processing/Shipped -> Cancelled/Refunded (Restore Stock)
        else if (wasStockDeducted && !willStockBeDeducted)
        {
            foreach (var item in order.Items.Where(i => i.ProductId.HasValue))
            {
                var prod = await productsDbContext.Products
                    .Include(p => p.Variants)
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId!.Value && p.TenantId == tenantId, cancellationToken);

                if (prod != null && prod.TrackInventory && prod.Type == "Physical")
                {
                    var prevStock = prod.CurrentStock;
                    var newStock = prevStock + item.Quantity;
                    prod.CurrentStock = newStock;
                    prod.UpdatedAt = DateTime.UtcNow;

                    if (item.VariantId.HasValue)
                    {
                        var variant = prod.Variants.FirstOrDefault(v => v.Id == item.VariantId.Value);
                        if (variant != null)
                        {
                            variant.StockQuantity = variant.StockQuantity + item.Quantity;
                            variant.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    productsDbContext.ProductStockMovements.Add(new ProductStockMovement
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        ProductId = prod.Id,
                        VariantId = item.VariantId,
                        MovementType = newStatus == "Refunded" ? "Return" : "In",
                        Quantity = item.Quantity,
                        PreviousStock = prevStock,
                        NewStock = newStock,
                        UnitCost = item.UnitCost,
                        ReferenceNumber = order.OrderNumber,
                        Reason = newStatus == "Refunded" ? $"Sipariş İadesi ({order.OrderNumber})" : $"Sipariş İptali ({order.OrderNumber})",
                        Notes = request.Request.Notes,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            await productsDbContext.SaveChangesAsync(cancellationToken);
        }

        // 2. Update Order Status
        order.Status = newStatus;
        order.UpdatedAt = DateTime.UtcNow;

        // 3. Activity Logging
        order.Activities.Add(new OrderActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            OrderId = order.Id,
            ActivityType = "StatusChange",
            Title = $"Sipariş Durumu: {GetStatusLabel(newStatus)}",
            Description = $"Sipariş durumu '{GetStatusLabel(oldStatus)}' aşamasından '{GetStatusLabel(newStatus)}' aşamasına güncellendi. {(string.IsNullOrWhiteSpace(request.Request.Notes) ? "" : $"Not: {request.Request.Notes}")}",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }

    private static string GetStatusLabel(string status) => status switch
    {
        "Draft" => "Taslak",
        "PendingApproval" => "Onay Bekliyor",
        "Confirmed" => "Onaylandı",
        "Processing" => "Hazırlanıyor",
        "Shipped" => "Kargoda / Yolda",
        "Delivered" => "Teslim Edildi",
        "Cancelled" => "İptal Edildi",
        "Refunded" => "İade Edildi",
        _ => status
    };
}

public class ChangeOrderStatusEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/orders/{id:guid}/status", async (
            Guid id,
            ChangeOrderStatusRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ChangeOrderStatusCommand(id, request), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Orders.Update")
        .WithName("ChangeOrderStatus")
        .WithTags("Orders");
    }
}
