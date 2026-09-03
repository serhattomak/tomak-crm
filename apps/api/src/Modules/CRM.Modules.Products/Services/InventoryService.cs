using CRM.BuildingBlocks.CQRS;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Services;

public class InventoryService(ProductsDbContext dbContext) : IInventoryService
{
    public async Task<Result> DispatchTransferAsync(Guid transferId, Guid? userId, CancellationToken ct = default)
    {
        var transfer = await dbContext.StockTransfers
            .Include(t => t.Items)
            .Include(t => t.SourceWarehouse)
            .Include(t => t.TargetWarehouse)
            .FirstOrDefaultAsync(t => t.Id == transferId, ct);

        if (transfer == null)
            return Result.Failure("NOT_FOUND", "Transfer bulunamadı.");

        if (transfer.Status != "Draft")
            return Result.Failure("INVALID_STATUS", "Yalnızca taslak durumundaki transferler sevk edilebilir.");

        if (transfer.Items.Count == 0)
            return Result.Failure("NO_ITEMS", "Transfer fişinde ürün kalemi bulunmuyor.");

        // Check and deduct source stocks
        foreach (var item in transfer.Items)
        {
            var sourceStock = await dbContext.WarehouseStocks
                .FirstOrDefaultAsync(ws => ws.WarehouseId == transfer.SourceWarehouseId &&
                                           ws.ProductId == item.ProductId &&
                                           ws.VariantId == item.VariantId, ct);

            if (sourceStock == null || sourceStock.Quantity < item.Quantity)
            {
                var prod = await dbContext.Products.FindAsync([item.ProductId], ct);
                return Result.Failure("INSUFFICIENT_STOCK", $"Kaynak depoda '{prod?.Name ?? "Ürün"}' için yetersiz stok! Mevcut: {sourceStock?.Quantity ?? 0}, İstenen: {item.Quantity}");
            }

            sourceStock.Quantity -= item.Quantity;
            sourceStock.UpdatedAt = DateTime.UtcNow;

            // Log stock movement
            dbContext.ProductStockMovements.Add(new ProductStockMovement
            {
                TenantId = transfer.TenantId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                MovementType = "Out",
                Quantity = item.Quantity,
                PreviousStock = sourceStock.Quantity + item.Quantity,
                NewStock = sourceStock.Quantity,
                ReferenceNumber = transfer.TransferNumber,
                Reason = $"Depo Sevk: {transfer.SourceWarehouse?.Name} -> {transfer.TargetWarehouse?.Name}",
                Notes = item.Notes,
                PerformedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            });
        }

        transfer.Status = "Dispatched";
        transfer.DispatchDate = DateTime.UtcNow;
        transfer.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> ReceiveTransferAsync(Guid transferId, Guid? userId, CancellationToken ct = default)
    {
        var transfer = await dbContext.StockTransfers
            .Include(t => t.Items)
            .Include(t => t.SourceWarehouse)
            .Include(t => t.TargetWarehouse)
            .FirstOrDefaultAsync(t => t.Id == transferId, ct);

        if (transfer == null)
            return Result.Failure("NOT_FOUND", "Transfer bulunamadı.");

        if (transfer.Status != "Dispatched")
            return Result.Failure("INVALID_STATUS", "Yalnızca sevk edilmiş (yolda) olan transferler teslim alınabilir.");

        // Add stocks to target warehouse
        foreach (var item in transfer.Items)
        {
            var targetStock = await dbContext.WarehouseStocks
                .FirstOrDefaultAsync(ws => ws.WarehouseId == transfer.TargetWarehouseId &&
                                           ws.ProductId == item.ProductId &&
                                           ws.VariantId == item.VariantId, ct);

            if (targetStock == null)
            {
                targetStock = new WarehouseStock
                {
                    TenantId = transfer.TenantId,
                    WarehouseId = transfer.TargetWarehouseId,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    Quantity = item.Quantity,
                    ReservedQuantity = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                dbContext.WarehouseStocks.Add(targetStock);
            }
            else
            {
                targetStock.Quantity += item.Quantity;
                targetStock.UpdatedAt = DateTime.UtcNow;
            }

            // Log stock movement
            dbContext.ProductStockMovements.Add(new ProductStockMovement
            {
                TenantId = transfer.TenantId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                MovementType = "In",
                Quantity = item.Quantity,
                PreviousStock = targetStock.Quantity - item.Quantity,
                NewStock = targetStock.Quantity,
                ReferenceNumber = transfer.TransferNumber,
                Reason = $"Depo Kabul: {transfer.SourceWarehouse?.Name} -> {transfer.TargetWarehouse?.Name}",
                Notes = item.Notes,
                PerformedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            });
        }

        transfer.Status = "Received";
        transfer.ReceivedDate = DateTime.UtcNow;
        transfer.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> CancelTransferAsync(Guid transferId, Guid? userId, CancellationToken ct = default)
    {
        var transfer = await dbContext.StockTransfers
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == transferId, ct);

        if (transfer == null)
            return Result.Failure("NOT_FOUND", "Transfer bulunamadı.");

        if (transfer.Status == "Received")
            return Result.Failure("INVALID_STATUS", "Teslim alınmış transferler iptal edilemez.");

        // If it was already dispatched, return stocks back to source
        if (transfer.Status == "Dispatched")
        {
            foreach (var item in transfer.Items)
            {
                var sourceStock = await dbContext.WarehouseStocks
                    .FirstOrDefaultAsync(ws => ws.WarehouseId == transfer.SourceWarehouseId &&
                                               ws.ProductId == item.ProductId &&
                                               ws.VariantId == item.VariantId, ct);

                if (sourceStock != null)
                {
                    sourceStock.Quantity += item.Quantity;
                    sourceStock.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        transfer.Status = "Cancelled";
        transfer.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> ReconcileStockCountAsync(Guid countId, Guid? userId, CancellationToken ct = default)
    {
        var count = await dbContext.StockCounts
            .Include(c => c.Items)
            .Include(c => c.Warehouse)
            .FirstOrDefaultAsync(c => c.Id == countId, ct);

        if (count == null)
            return Result.Failure("NOT_FOUND", "Sayım fişi bulunamadı.");

        if (count.Status == "Completed")
            return Result.Failure("ALREADY_COMPLETED", "Bu sayım zaten mutabakatı tamamlanmış.");

        foreach (var item in count.Items)
        {
            var diff = item.CountedQuantity - item.SystemQuantity;
            item.Difference = diff;

            if (diff != 0)
            {
                // 1. Update Warehouse Stock
                var whStock = await dbContext.WarehouseStocks
                    .FirstOrDefaultAsync(ws => ws.WarehouseId == count.WarehouseId &&
                                               ws.ProductId == item.ProductId &&
                                               ws.VariantId == item.VariantId, ct);

                if (whStock == null)
                {
                    whStock = new WarehouseStock
                    {
                        TenantId = count.TenantId,
                        WarehouseId = count.WarehouseId,
                        ProductId = item.ProductId,
                        VariantId = item.VariantId,
                        Quantity = item.CountedQuantity,
                        ReservedQuantity = 0,
                        UpdatedAt = DateTime.UtcNow
                    };
                    dbContext.WarehouseStocks.Add(whStock);
                }
                else
                {
                    whStock.Quantity = item.CountedQuantity;
                    whStock.UpdatedAt = DateTime.UtcNow;
                }

                // 2. Update overall Product CurrentStock
                var product = await dbContext.Products.FindAsync([item.ProductId], ct);
                if (product != null)
                {
                    var prevStock = product.CurrentStock;
                    product.CurrentStock += diff;
                    product.UpdatedAt = DateTime.UtcNow;

                    // 3. Log stock adjustment movement
                    dbContext.ProductStockMovements.Add(new ProductStockMovement
                    {
                        TenantId = count.TenantId,
                        ProductId = item.ProductId,
                        VariantId = item.VariantId,
                        MovementType = "Adjustment",
                        Quantity = Math.Abs(diff),
                        PreviousStock = prevStock,
                        NewStock = product.CurrentStock,
                        ReferenceNumber = count.CountNumber,
                        Reason = diff > 0
                            ? $"Sayım Fazlası Mutabakatı ({count.Warehouse?.Name})"
                            : $"Sayım Eksiği / Fire Mutabakatı ({count.Warehouse?.Name})",
                        Notes = item.Notes,
                        PerformedByUserId = userId,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            item.IsReconciled = true;
        }

        count.Status = "Completed";
        count.CompletedDate = DateTime.UtcNow;
        count.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(ct);
        return Result.Success();
    }
}
