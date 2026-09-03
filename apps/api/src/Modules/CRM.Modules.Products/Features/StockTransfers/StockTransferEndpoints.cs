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

namespace CRM.Modules.Products.Features.StockTransfers;

public record StockTransferItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string? ProductSKU,
    Guid? VariantId,
    string? VariantName,
    decimal Quantity,
    string? Notes
);

public record StockTransferListDto(
    Guid Id,
    string TransferNumber,
    Guid SourceWarehouseId,
    string SourceWarehouseName,
    Guid TargetWarehouseId,
    string TargetWarehouseName,
    string Status,
    DateTime TransferDate,
    DateTime? DispatchDate,
    DateTime? ReceivedDate,
    int TotalItemCount,
    decimal TotalQuantity,
    string? Notes
);

public record StockTransferDetailDto(
    Guid Id,
    string TransferNumber,
    Guid SourceWarehouseId,
    string SourceWarehouseName,
    Guid TargetWarehouseId,
    string TargetWarehouseName,
    string Status,
    DateTime TransferDate,
    DateTime? DispatchDate,
    DateTime? ReceivedDate,
    string? Notes,
    List<StockTransferItemDto> Items
);

public record CreateStockTransferItemRequest(
    Guid ProductId,
    Guid? VariantId,
    decimal Quantity,
    string? Notes
);

public record CreateStockTransferRequest(
    Guid SourceWarehouseId,
    Guid TargetWarehouseId,
    string? Notes,
    List<CreateStockTransferItemRequest> Items
);

public class StockTransferEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/inventory/transfers")
            .WithTags("Inventory - Stock Transfers");

        group.MapGet("", GetTransfers);
        group.MapGet("{id:guid}", GetTransferById);
        group.MapPost("", CreateTransfer);
        group.MapPost("{id:guid}/dispatch", DispatchTransfer);
        group.MapPost("{id:guid}/receive", ReceiveTransfer);
        group.MapPost("{id:guid}/cancel", CancelTransfer);
    }

    private static async Task<IResult> GetTransfers(
        [FromQuery] string? status,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var query = db.StockTransfers
            .AsNoTracking()
            .Include(t => t.SourceWarehouse)
            .Include(t => t.TargetWarehouse)
            .Include(t => t.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            query = query.Where(t => t.Status == status);
        }

        var list = await query
            .OrderByDescending(t => t.TransferDate)
            .Select(t => new StockTransferListDto(
                t.Id,
                t.TransferNumber,
                t.SourceWarehouseId,
                t.SourceWarehouse != null ? t.SourceWarehouse.Name : "Kaynak Depo",
                t.TargetWarehouseId,
                t.TargetWarehouse != null ? t.TargetWarehouse.Name : "Hedef Depo",
                t.Status,
                t.TransferDate,
                t.DispatchDate,
                t.ReceivedDate,
                t.Items.Count,
                t.Items.Sum(i => i.Quantity),
                t.Notes
            ))
            .ToListAsync(ct);

        return Results.Ok(ApiResponse<List<StockTransferListDto>>.Ok(list));
    }

    private static async Task<IResult> GetTransferById(
        Guid id,
        ProductsDbContext db,
        CancellationToken ct)
    {
        var t = await db.StockTransfers
            .AsNoTracking()
            .Include(x => x.SourceWarehouse)
            .Include(x => x.TargetWarehouse)
            .Include(x => x.Items)
                .ThenInclude(i => i.Product)
            .Include(x => x.Items)
                .ThenInclude(i => i.Variant)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (t == null)
            return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Transfer fişi bulunamadı."));

        var detail = new StockTransferDetailDto(
            t.Id,
            t.TransferNumber,
            t.SourceWarehouseId,
            t.SourceWarehouse != null ? t.SourceWarehouse.Name : "Kaynak",
            t.TargetWarehouseId,
            t.TargetWarehouse != null ? t.TargetWarehouse.Name : "Hedef",
            t.Status,
            t.TransferDate,
            t.DispatchDate,
            t.ReceivedDate,
            t.Notes,
            t.Items.Select(i => new StockTransferItemDto(
                i.Id,
                i.ProductId,
                i.Product != null ? i.Product.Name : "Ürün",
                i.Product != null ? i.Product.SKU : null,
                i.VariantId,
                i.Variant != null ? i.Variant.Name : null,
                i.Quantity,
                i.Notes
            )).ToList()
        );

        return Results.Ok(ApiResponse<StockTransferDetailDto>.Ok(detail));
    }

    private static async Task<IResult> CreateTransfer(
        [FromBody] CreateStockTransferRequest request,
        ProductsDbContext db,
        ICurrentTenant currentTenant,
        CancellationToken ct)
    {
        if (request.SourceWarehouseId == request.TargetWarehouseId)
            return Results.BadRequest(ApiResponse<string>.Fail("SAME_WAREHOUSE", "Kaynak ve hedef depo aynı olamaz."));

        if (request.Items == null || request.Items.Count == 0)
            return Results.BadRequest(ApiResponse<string>.Fail("NO_ITEMS", "En az bir ürün kalemi eklemelisiniz."));

        var transferCount = await db.StockTransfers.CountAsync(ct) + 1;
        var transferNumber = $"TRF-{DateTime.UtcNow:yyyyMMdd}-{transferCount:D4}";

        var transfer = new StockTransfer
        {
            TenantId = currentTenant.Id ?? Guid.Empty,
            TransferNumber = transferNumber,
            SourceWarehouseId = request.SourceWarehouseId,
            TargetWarehouseId = request.TargetWarehouseId,
            Status = "Draft",
            TransferDate = DateTime.UtcNow,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var item in request.Items)
        {
            transfer.Items.Add(new StockTransferItem
            {
                TenantId = currentTenant.Id ?? Guid.Empty,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                Quantity = item.Quantity,
                Notes = item.Notes,
                CreatedAt = DateTime.UtcNow
            });
        }

        db.StockTransfers.Add(transfer);
        await db.SaveChangesAsync(ct);

        return Results.Ok(ApiResponse<Guid>.Ok(transfer.Id, "Transfer fişi taslak olarak oluşturuldu."));
    }

    private static async Task<IResult> DispatchTransfer(
        Guid id,
        IInventoryService inventoryService,
        CancellationToken ct)
    {
        var res = await inventoryService.DispatchTransferAsync(id, null, ct);
        if (res.IsFailure)
            return Results.BadRequest(ApiResponse<string>.Fail(res.Error.Code, res.Error.Description));

        return Results.Ok(ApiResponse<bool>.Ok(true, "Transfer sevk edildi ve kaynak depodan stok düşüldü."));
    }

    private static async Task<IResult> ReceiveTransfer(
        Guid id,
        IInventoryService inventoryService,
        CancellationToken ct)
    {
        var res = await inventoryService.ReceiveTransferAsync(id, null, ct);
        if (res.IsFailure)
            return Results.BadRequest(ApiResponse<string>.Fail(res.Error.Code, res.Error.Description));

        return Results.Ok(ApiResponse<bool>.Ok(true, "Transfer kabul edildi ve hedef depo stoğuna eklendi."));
    }

    private static async Task<IResult> CancelTransfer(
        Guid id,
        IInventoryService inventoryService,
        CancellationToken ct)
    {
        var res = await inventoryService.CancelTransferAsync(id, null, ct);
        if (res.IsFailure)
            return Results.BadRequest(ApiResponse<string>.Fail(res.Error.Code, res.Error.Description));

        return Results.Ok(ApiResponse<bool>.Ok(true, "Transfer iptal edildi."));
    }
}
