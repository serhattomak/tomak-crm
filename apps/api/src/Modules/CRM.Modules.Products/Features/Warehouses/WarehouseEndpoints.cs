using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Warehouses;

public record WarehouseDto(
    Guid Id,
    string Code,
    string Name,
    string Type,
    string? Address,
    string? City,
    string? ManagerName,
    string? Phone,
    bool IsDefault,
    bool IsActive,
    int TotalDistinctProducts,
    decimal TotalStockQuantity,
    DateTime CreatedAt
);

public record WarehouseStockDto(
    Guid Id,
    Guid WarehouseId,
    Guid ProductId,
    string ProductName,
    string? ProductSKU,
    string? ProductBarcode,
    Guid? VariantId,
    string? VariantName,
    decimal Quantity,
    decimal ReservedQuantity,
    decimal AvailableQuantity,
    string? BinLocation,
    decimal SellingPrice,
    string Currency
);

public record CreateWarehouseRequest(
    string Code,
    string Name,
    string Type,
    string? Address,
    string? City,
    string? ManagerName,
    string? Phone,
    bool IsDefault
);

public record UpdateWarehouseStockLocationRequest(
    string? BinLocation
);

public class WarehouseEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/inventory/warehouses")
            .WithTags("Inventory - Warehouses");

        group.MapGet("", GetWarehouses);
        group.MapGet("{id:guid}/stocks", GetWarehouseStocks);
        group.MapPost("", CreateWarehouse);
        group.MapPut("{id:guid}", UpdateWarehouse);
        group.MapPut("stocks/{stockId:guid}/location", UpdateStockLocation);
    }

    private static async Task<IResult> GetWarehouses(
        ProductsDbContext db,
        CancellationToken ct)
    {
        var warehouses = await db.Warehouses
            .AsNoTracking()
            .Include(w => w.Stocks)
            .OrderByDescending(w => w.IsDefault)
            .ThenBy(w => w.Name)
            .Select(w => new WarehouseDto(
                w.Id,
                w.Code,
                w.Name,
                w.Type,
                w.Address,
                w.City,
                w.ManagerName,
                w.Phone,
                w.IsDefault,
                w.IsActive,
                w.Stocks.Count,
                w.Stocks.Sum(s => s.Quantity),
                w.CreatedAt
            ))
            .ToListAsync(ct);

        return Results.Ok(ApiResponse<List<WarehouseDto>>.Ok(warehouses));
    }

    private static async Task<IResult> GetWarehouseStocks(
        Guid id,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var stocks = await db.WarehouseStocks
            .AsNoTracking()
            .Include(ws => ws.Product)
            .Include(ws => ws.Variant)
            .Where(ws => ws.WarehouseId == id)
            .OrderBy(ws => ws.Product!.Name)
            .Select(ws => new WarehouseStockDto(
                ws.Id,
                ws.WarehouseId,
                ws.ProductId,
                ws.Product != null ? ws.Product.Name : "Ürün",
                ws.Product != null ? ws.Product.SKU : null,
                ws.Product != null ? ws.Product.Barcode : null,
                ws.VariantId,
                ws.Variant != null ? ws.Variant.Name : null,
                ws.Quantity,
                ws.ReservedQuantity,
                ws.Quantity - ws.ReservedQuantity,
                ws.BinLocation,
                ws.Product != null ? ws.Product.SellingPrice : 0,
                ws.Product != null ? ws.Product.Currency : "TRY"
            ))
            .ToListAsync(ct);

        return Results.Ok(ApiResponse<List<WarehouseStockDto>>.Ok(stocks));
    }

    private static async Task<IResult> CreateWarehouse(
        [FromBody] CreateWarehouseRequest request,
        ProductsDbContext db,
        ICurrentTenant currentTenant,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
            return Results.BadRequest(ApiResponse<string>.Fail("VALIDATION_ERROR", "Depo adı ve kodu zorunludur."));

        var exists = await db.Warehouses.AnyAsync(w => w.Code.ToUpper() == request.Code.ToUpper(), ct);
        if (exists)
            return Results.BadRequest(ApiResponse<string>.Fail("DUPLICATE_CODE", "Bu depo kodu zaten kullanılmaktadır."));

        var warehouse = new Warehouse
        {
            TenantId = currentTenant.Id ?? Guid.Empty,
            Code = request.Code.ToUpperInvariant(),
            Name = request.Name,
            Type = request.Type,
            Address = request.Address,
            City = request.City,
            ManagerName = request.ManagerName,
            Phone = request.Phone,
            IsDefault = request.IsDefault,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Warehouses.Add(warehouse);
        await db.SaveChangesAsync(ct);

        return Results.Ok(ApiResponse<Guid>.Ok(warehouse.Id, "Depo başarıyla oluşturuldu."));
    }

    private static async Task<IResult> UpdateWarehouse(
        Guid id,
        [FromBody] CreateWarehouseRequest request,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var warehouse = await db.Warehouses.FindAsync([id], ct);
        if (warehouse == null)
            return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Depo bulunamadı."));

        warehouse.Name = request.Name;
        warehouse.Type = request.Type;
        warehouse.Address = request.Address;
        warehouse.City = request.City;
        warehouse.ManagerName = request.ManagerName;
        warehouse.Phone = request.Phone;
        warehouse.IsDefault = request.IsDefault;
        warehouse.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Results.Ok(ApiResponse<bool>.Ok(true, "Depo güncellendi."));
    }

    private static async Task<IResult> UpdateStockLocation(
        Guid stockId,
        [FromBody] UpdateWarehouseStockLocationRequest request,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var stock = await db.WarehouseStocks.FindAsync([stockId], ct);
        if (stock == null)
            return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Stok kaydı bulunamadı."));

        stock.BinLocation = request.BinLocation;
        stock.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(ApiResponse<bool>.Ok(true, "Raf konumu güncellendi."));
    }
}
