using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using CRM.Modules.Products.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.StockCounts;

public record StockCountItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string? ProductSKU,
    string? ProductBarcode,
    Guid? VariantId,
    string? VariantName,
    decimal SystemQuantity,
    decimal CountedQuantity,
    decimal Difference,
    bool IsReconciled,
    string? Notes
);

public record StockCountListDto(
    Guid Id,
    string CountNumber,
    Guid WarehouseId,
    string WarehouseName,
    string Status,
    DateTime CountDate,
    DateTime? CompletedDate,
    int TotalItemsCount,
    decimal TotalDiscrepancy,
    string? Notes
);

public record StockCountDetailDto(
    Guid Id,
    string CountNumber,
    Guid WarehouseId,
    string WarehouseName,
    string Status,
    DateTime CountDate,
    DateTime? CompletedDate,
    string? Notes,
    List<StockCountItemDto> Items
);

public record CreateStockCountRequest(
    Guid WarehouseId,
    string? Notes
);

public record UpdateCountItemPayload(
    Guid ItemId,
    decimal CountedQuantity,
    string? Notes
);

public record UpdateStockCountItemsRequest(
    List<UpdateCountItemPayload> Items
);

public class StockCountEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/inventory/counts")
            .WithTags("Inventory - Stock Counts");

        group.MapGet("", GetStockCounts);
        group.MapGet("{id:guid}", GetStockCountById);
        group.MapPost("", CreateStockCount);
        group.MapPut("{id:guid}/items", UpdateCountItems);
        group.MapPost("{id:guid}/reconcile", ReconcileStockCount);
    }

    private static async Task<IResult> GetStockCounts(
        [FromQuery] string? status,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var query = db.StockCounts
            .AsNoTracking()
            .Include(c => c.Warehouse)
            .Include(c => c.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            query = query.Where(c => c.Status == status);
        }

        var list = await query
            .OrderByDescending(c => c.CountDate)
            .Select(c => new StockCountListDto(
                c.Id,
                c.CountNumber,
                c.WarehouseId,
                c.Warehouse != null ? c.Warehouse.Name : "Depo",
                c.Status,
                c.CountDate,
                c.CompletedDate,
                c.Items.Count,
                c.Items.Sum(i => Math.Abs(i.Difference)),
                c.Notes
            ))
            .ToListAsync(ct);

        return Results.Ok(ApiResponse<List<StockCountListDto>>.Ok(list));
    }

    private static async Task<IResult> GetStockCountById(
        Guid id,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var c = await db.StockCounts
            .AsNoTracking()
            .Include(x => x.Warehouse)
            .Include(x => x.Items)
                .ThenInclude(i => i.Product)
            .Include(x => x.Items)
                .ThenInclude(i => i.Variant)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (c == null)
            return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Sayım fişi bulunamadı."));

        var detail = new StockCountDetailDto(
            c.Id,
            c.CountNumber,
            c.WarehouseId,
            c.Warehouse != null ? c.Warehouse.Name : "Depo",
            c.Status,
            c.CountDate,
            c.CompletedDate,
            c.Notes,
            c.Items.Select(i => new StockCountItemDto(
                i.Id,
                i.ProductId,
                i.Product != null ? i.Product.Name : "Ürün",
                i.Product != null ? i.Product.SKU : null,
                i.Product != null ? i.Product.Barcode : null,
                i.VariantId,
                i.Variant != null ? i.Variant.Name : null,
                i.SystemQuantity,
                i.CountedQuantity,
                i.Difference,
                i.IsReconciled,
                i.Notes
            )).ToList()
        );

        return Results.Ok(ApiResponse<StockCountDetailDto>.Ok(detail));
    }

    private static async Task<IResult> CreateStockCount(
        [FromBody] CreateStockCountRequest request,
        ProductsDbContext db,
        ICurrentTenant currentTenant,
        CancellationToken ct)
    {
        var warehouse = await db.Warehouses.FindAsync([request.WarehouseId], ct);
        if (warehouse == null)
            return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Depo bulunamadı."));

        var countIndex = await db.StockCounts.CountAsync(ct) + 1;
        var countNumber = $"CNT-{DateTime.UtcNow:yyyyMMdd}-{countIndex:D4}";

        var count = new StockCount
        {
            TenantId = currentTenant.Id ?? Guid.Empty,
            CountNumber = countNumber,
            WarehouseId = request.WarehouseId,
            Status = "InProgress",
            CountDate = DateTime.UtcNow,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Populate items from physical products in the warehouse (or all physical products if warehouse has no stock records yet)
        var physicalProducts = await db.Products
            .AsNoTracking()
            .Where(p => p.Type == "Physical" && p.Status == "Active")
            .ToListAsync(ct);

        var existingWarehouseStocks = await db.WarehouseStocks
            .AsNoTracking()
            .Where(ws => ws.WarehouseId == request.WarehouseId)
            .ToDictionaryAsync(ws => (ws.ProductId, ws.VariantId), ct);

        foreach (var p in physicalProducts)
        {
            existingWarehouseStocks.TryGetValue((p.Id, null), out var ws);
            var sysQty = ws != null ? ws.Quantity : p.CurrentStock; // fallback to product current stock

            count.Items.Add(new StockCountItem
            {
                TenantId = currentTenant.Id ?? Guid.Empty,
                ProductId = p.Id,
                VariantId = null,
                SystemQuantity = sysQty,
                CountedQuantity = sysQty, // default to system quantity
                Difference = 0,
                IsReconciled = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        db.StockCounts.Add(count);
        await db.SaveChangesAsync(ct);

        return Results.Ok(ApiResponse<Guid>.Ok(count.Id, "Stok sayımı başlatıldı ve ürünler listelendi."));
    }

    private static async Task<IResult> UpdateCountItems(
        Guid id,
        [FromBody] UpdateStockCountItemsRequest request,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var count = await db.StockCounts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (count == null)
            return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Sayım fişi bulunamadı."));

        if (count.Status == "Completed")
            return Results.BadRequest(ApiResponse<string>.Fail("ALREADY_COMPLETED", "Tamamlanmış sayım düzenlenemez."));

        var itemMap = count.Items.ToDictionary(i => i.Id);

        foreach (var reqItem in request.Items)
        {
            if (itemMap.TryGetValue(reqItem.ItemId, out var item))
            {
                item.CountedQuantity = reqItem.CountedQuantity;
                item.Difference = reqItem.CountedQuantity - item.SystemQuantity;
                item.Notes = reqItem.Notes;
            }
        }

        count.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(ApiResponse<bool>.Ok(true, "Sayım miktarları kaydedildi."));
    }

    private static async Task<IResult> ReconcileStockCount(
        Guid id,
        IInventoryService inventoryService,
        CancellationToken ct)
    {
        var res = await inventoryService.ReconcileStockCountAsync(id, null, ct);
        if (res.IsFailure)
            return Results.BadRequest(ApiResponse<string>.Fail(res.Error.Code, res.Error.Description));

        return Results.Ok(ApiResponse<bool>.Ok(true, "Sayım mutabakatı tamamlandı ve stoklar otomatik düzeltildi."));
    }
}
