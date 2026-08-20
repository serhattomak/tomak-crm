using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Shipping.Data;
using CRM.Modules.Shipping.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Shipping.Features.Shipments;

// DTOs
public record ShipmentItemDto(
    Guid Id,
    Guid? ProductId,
    string ProductName,
    string? Sku,
    int Quantity,
    string Unit
);

public record CreateShipmentItemDto(
    Guid? ProductId,
    string ProductName,
    string? Sku,
    int Quantity,
    string Unit = "Adet"
);

public record ShipmentStatusHistoryDto(
    Guid Id,
    string Status,
    string? Location,
    string? Description,
    Guid? ChangedByUserId,
    string? ChangedByName,
    DateTime CreatedAt
);

public record ShipmentDto(
    Guid Id,
    string ShipmentNumber,
    Guid? OrderId,
    string? OrderNumber,
    Guid? CustomerId,
    string CustomerName,
    Guid? CarrierId,
    string? CarrierName,
    string? TrackingNumber,
    string? TrackingUrl,
    string Type,
    string Status,
    int PackageCount,
    decimal TotalWeightKg,
    decimal TotalDesi,
    decimal ShippingCost,
    string RecipientName,
    string? RecipientPhone,
    string RecipientAddress,
    string? RecipientCity,
    string? RecipientDistrict,
    string? Notes,
    Guid? PreparedByUserId,
    string? PreparedByName,
    DateTime? DispatchedAt,
    DateTime? DeliveredAt,
    List<ShipmentItemDto> Items,
    List<ShipmentStatusHistoryDto> StatusHistories,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record ShippingStatsDto(
    int TotalShipments,
    int PreparingCount,
    int InTransitCount,
    int DeliveredTodayCount,
    int PendingReturnsCount,
    decimal DeliverySuccessRatePercentage
);

// 1. GetShipmentsQuery
public record GetShipmentsQuery(
    string? Status = null,
    string? Type = null,
    Guid? CarrierId = null,
    Guid? CustomerId = null,
    Guid? OrderId = null,
    string? Search = null
) : IQuery<List<ShipmentDto>>;

public class GetShipmentsHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetShipmentsQuery, List<ShipmentDto>>
{
    public async Task<Result<List<ShipmentDto>>> Handle(GetShipmentsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var query = dbContext.Shipments
            .Include(s => s.Carrier)
            .Include(s => s.Items)
            .Include(s => s.StatusHistories)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Status))
            query = query.Where(s => s.Status == request.Status);

        if (!string.IsNullOrWhiteSpace(request.Type))
            query = query.Where(s => s.Type == request.Type);

        if (request.CarrierId.HasValue)
            query = query.Where(s => s.CarrierId == request.CarrierId);

        if (request.CustomerId.HasValue)
            query = query.Where(s => s.CustomerId == request.CustomerId);

        if (request.OrderId.HasValue)
            query = query.Where(s => s.OrderId == request.OrderId);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.ToLower();
            query = query.Where(x =>
                x.ShipmentNumber.ToLower().Contains(s) ||
                (x.TrackingNumber != null && x.TrackingNumber.ToLower().Contains(s)) ||
                (x.OrderNumber != null && x.OrderNumber.ToLower().Contains(s)) ||
                x.CustomerName.ToLower().Contains(s) ||
                x.RecipientName.ToLower().Contains(s));
        }

        var list = await query
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = list.Select(s => new ShipmentDto(
            s.Id,
            s.ShipmentNumber,
            s.OrderId,
            s.OrderNumber,
            s.CustomerId,
            s.CustomerName,
            s.CarrierId,
            s.CarrierName ?? s.Carrier?.Name,
            s.TrackingNumber,
            s.TrackingUrl,
            s.Type,
            s.Status,
            s.PackageCount,
            s.TotalWeightKg,
            s.TotalDesi,
            s.ShippingCost,
            s.RecipientName,
            s.RecipientPhone,
            s.RecipientAddress,
            s.RecipientCity,
            s.RecipientDistrict,
            s.Notes,
            s.PreparedByUserId,
            s.PreparedByName,
            s.DispatchedAt,
            s.DeliveredAt,
            s.Items.Select(i => new ShipmentItemDto(i.Id, i.ProductId, i.ProductName, i.Sku, i.Quantity, i.Unit)).ToList(),
            s.StatusHistories.OrderByDescending(h => h.CreatedAt).Select(h => new ShipmentStatusHistoryDto(h.Id, h.Status, h.Location, h.Description, h.ChangedByUserId, h.ChangedByName, h.CreatedAt)).ToList(),
            s.CreatedAt,
            s.UpdatedAt
        )).ToList();

        return Result<List<ShipmentDto>>.Success(dtos);
    }
}

// 2. GetShipmentByIdQuery
public record GetShipmentByIdQuery(Guid Id) : IQuery<ShipmentDto>;

public class GetShipmentByIdHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetShipmentByIdQuery, ShipmentDto>
{
    public async Task<Result<ShipmentDto>> Handle(GetShipmentByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var shipment = await dbContext.Shipments
            .Include(s => s.Carrier)
            .Include(s => s.Items)
            .Include(s => s.StatusHistories)
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (shipment == null)
            return Result.Failure<ShipmentDto>(new Error("Shipping.NotFound", "Kargo sevkiyat kaydı bulunamadı."));

        return Result<ShipmentDto>.Success(new ShipmentDto(
            shipment.Id,
            shipment.ShipmentNumber,
            shipment.OrderId,
            shipment.OrderNumber,
            shipment.CustomerId,
            shipment.CustomerName,
            shipment.CarrierId,
            shipment.CarrierName ?? shipment.Carrier?.Name,
            shipment.TrackingNumber,
            shipment.TrackingUrl,
            shipment.Type,
            shipment.Status,
            shipment.PackageCount,
            shipment.TotalWeightKg,
            shipment.TotalDesi,
            shipment.ShippingCost,
            shipment.RecipientName,
            shipment.RecipientPhone,
            shipment.RecipientAddress,
            shipment.RecipientCity,
            shipment.RecipientDistrict,
            shipment.Notes,
            shipment.PreparedByUserId,
            shipment.PreparedByName,
            shipment.DispatchedAt,
            shipment.DeliveredAt,
            shipment.Items.Select(i => new ShipmentItemDto(i.Id, i.ProductId, i.ProductName, i.Sku, i.Quantity, i.Unit)).ToList(),
            shipment.StatusHistories.OrderByDescending(h => h.CreatedAt).Select(h => new ShipmentStatusHistoryDto(h.Id, h.Status, h.Location, h.Description, h.ChangedByUserId, h.ChangedByName, h.CreatedAt)).ToList(),
            shipment.CreatedAt,
            shipment.UpdatedAt
        ));
    }
}

// 3. CreateShipmentCommand (Support split shipment)
public record CreateShipmentCommand(
    Guid? OrderId,
    string? OrderNumber,
    Guid? CustomerId,
    string CustomerName,
    Guid? CarrierId,
    string? TrackingNumber,
    int PackageCount,
    decimal TotalWeightKg,
    decimal TotalDesi,
    decimal ShippingCost,
    string RecipientName,
    string? RecipientPhone,
    string RecipientAddress,
    string? RecipientCity,
    string? RecipientDistrict,
    string? Notes,
    Guid? PreparedByUserId,
    string? PreparedByName,
    List<CreateShipmentItemDto>? Items
) : ICommand<ShipmentDto>;

public class CreateShipmentValidator : AbstractValidator<CreateShipmentCommand>
{
    public CreateShipmentValidator()
    {
        RuleFor(x => x.CustomerName).NotEmpty();
        RuleFor(x => x.RecipientName).NotEmpty();
        RuleFor(x => x.RecipientAddress).NotEmpty();
    }
}

public class CreateShipmentHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateShipmentCommand, ShipmentDto>
{
    public async Task<Result<ShipmentDto>> Handle(CreateShipmentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var shipmentCountToday = await dbContext.Shipments
            .CountAsync(s => s.CreatedAt >= DateTime.UtcNow.Date, cancellationToken);

        var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        var shipmentNumber = $"SHP-{datePrefix}-{(shipmentCountToday + 1):D4}";

        string? carrierName = null;
        string? trackingUrl = null;

        if (request.CarrierId.HasValue)
        {
            var carrier = await dbContext.Carriers
                .FirstOrDefaultAsync(c => c.Id == request.CarrierId.Value, cancellationToken);

            if (carrier != null)
            {
                carrierName = carrier.Name;
                if (!string.IsNullOrWhiteSpace(request.TrackingNumber) && !string.IsNullOrWhiteSpace(carrier.TrackingUrlTemplate))
                {
                    trackingUrl = carrier.TrackingUrlTemplate.Replace("{tracking_number}", request.TrackingNumber.Trim());
                }
            }
        }

        var shipment = new Shipment
        {
            TenantId = currentTenant.Id.Value,
            ShipmentNumber = shipmentNumber,
            OrderId = request.OrderId,
            OrderNumber = request.OrderNumber,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            CarrierId = request.CarrierId,
            CarrierName = carrierName,
            TrackingNumber = request.TrackingNumber?.Trim(),
            TrackingUrl = trackingUrl,
            Type = "Outbound",
            Status = "Preparing",
            PackageCount = Math.Max(1, request.PackageCount),
            TotalWeightKg = request.TotalWeightKg,
            TotalDesi = request.TotalDesi,
            ShippingCost = request.ShippingCost,
            RecipientName = request.RecipientName.Trim(),
            RecipientPhone = request.RecipientPhone?.Trim(),
            RecipientAddress = request.RecipientAddress.Trim(),
            RecipientCity = request.RecipientCity?.Trim(),
            RecipientDistrict = request.RecipientDistrict?.Trim(),
            Notes = request.Notes?.Trim(),
            PreparedByUserId = request.PreparedByUserId,
            PreparedByName = request.PreparedByName?.Trim() ?? "Operasyon",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.Items != null)
        {
            foreach (var it in request.Items)
            {
                shipment.Items.Add(new ShipmentItem
                {
                    TenantId = currentTenant.Id.Value,
                    ProductId = it.ProductId,
                    ProductName = it.ProductName,
                    Sku = it.Sku,
                    Quantity = it.Quantity,
                    Unit = it.Unit,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        // Initial History
        shipment.StatusHistories.Add(new ShipmentStatusHistory
        {
            TenantId = currentTenant.Id.Value,
            Status = "Preparing",
            Location = "Merkez Depo / Paketleme Alanı",
            Description = "Kargo paketi hazırlandı ve etiketlendi.",
            ChangedByUserId = request.PreparedByUserId,
            ChangedByName = request.PreparedByName ?? "Operasyon",
            CreatedAt = DateTime.UtcNow
        });

        dbContext.Shipments.Add(shipment);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ShipmentDto>.Success(new ShipmentDto(
            shipment.Id,
            shipment.ShipmentNumber,
            shipment.OrderId,
            shipment.OrderNumber,
            shipment.CustomerId,
            shipment.CustomerName,
            shipment.CarrierId,
            shipment.CarrierName,
            shipment.TrackingNumber,
            shipment.TrackingUrl,
            shipment.Type,
            shipment.Status,
            shipment.PackageCount,
            shipment.TotalWeightKg,
            shipment.TotalDesi,
            shipment.ShippingCost,
            shipment.RecipientName,
            shipment.RecipientPhone,
            shipment.RecipientAddress,
            shipment.RecipientCity,
            shipment.RecipientDistrict,
            shipment.Notes,
            shipment.PreparedByUserId,
            shipment.PreparedByName,
            shipment.DispatchedAt,
            shipment.DeliveredAt,
            shipment.Items.Select(i => new ShipmentItemDto(i.Id, i.ProductId, i.ProductName, i.Sku, i.Quantity, i.Unit)).ToList(),
            shipment.StatusHistories.Select(h => new ShipmentStatusHistoryDto(h.Id, h.Status, h.Location, h.Description, h.ChangedByUserId, h.ChangedByName, h.CreatedAt)).ToList(),
            shipment.CreatedAt,
            shipment.UpdatedAt
        ));
    }
}

// 4. UpdateShipmentStatusCommand
public record UpdateShipmentStatusRequest(
    string Status, // Preparing, Dispatched, InTransit, Delivered, FailedDelivery, Cancelled
    string? Location,
    string? Description,
    Guid? ChangedByUserId,
    string? ChangedByName
);

public record UpdateShipmentStatusCommand(
    Guid Id,
    string Status,
    string? Location,
    string? Description,
    Guid? ChangedByUserId,
    string? ChangedByName
) : ICommand<ShipmentDto>;

public class UpdateShipmentStatusHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateShipmentStatusCommand, ShipmentDto>
{
    public async Task<Result<ShipmentDto>> Handle(UpdateShipmentStatusCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var s = await dbContext.Shipments
            .Include(x => x.Items)
            .Include(x => x.StatusHistories)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (s == null)
            return Result.Failure<ShipmentDto>(new Error("Shipping.ShipmentNotFound", "Kargo kaydı bulunamadı."));

        s.Status = request.Status;
        s.UpdatedAt = DateTime.UtcNow;

        if (request.Status == "Dispatched" && !s.DispatchedAt.HasValue)
            s.DispatchedAt = DateTime.UtcNow;

        if (request.Status == "Delivered" && !s.DeliveredAt.HasValue)
            s.DeliveredAt = DateTime.UtcNow;

        s.StatusHistories.Add(new ShipmentStatusHistory
        {
            TenantId = currentTenant.Id.Value,
            Status = request.Status,
            Location = request.Location ?? "Taşıyıcı / Dağıtım Merkezi",
            Description = request.Description ?? $"Kargo durumu '{request.Status}' olarak güncellendi.",
            ChangedByUserId = request.ChangedByUserId,
            ChangedByName = request.ChangedByName ?? "Operasyon",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ShipmentDto>.Success(new ShipmentDto(
            s.Id,
            s.ShipmentNumber,
            s.OrderId,
            s.OrderNumber,
            s.CustomerId,
            s.CustomerName,
            s.CarrierId,
            s.CarrierName,
            s.TrackingNumber,
            s.TrackingUrl,
            s.Type,
            s.Status,
            s.PackageCount,
            s.TotalWeightKg,
            s.TotalDesi,
            s.ShippingCost,
            s.RecipientName,
            s.RecipientPhone,
            s.RecipientAddress,
            s.RecipientCity,
            s.RecipientDistrict,
            s.Notes,
            s.PreparedByUserId,
            s.PreparedByName,
            s.DispatchedAt,
            s.DeliveredAt,
            s.Items.Select(i => new ShipmentItemDto(i.Id, i.ProductId, i.ProductName, i.Sku, i.Quantity, i.Unit)).ToList(),
            s.StatusHistories.OrderByDescending(h => h.CreatedAt).Select(h => new ShipmentStatusHistoryDto(h.Id, h.Status, h.Location, h.Description, h.ChangedByUserId, h.ChangedByName, h.CreatedAt)).ToList(),
            s.CreatedAt,
            s.UpdatedAt
        ));
    }
}

// 5. UpdateShipmentTrackingCommand
public record UpdateShipmentTrackingRequest(
    Guid? CarrierId,
    string? TrackingNumber
);

public record UpdateShipmentTrackingCommand(
    Guid Id,
    Guid? CarrierId,
    string? TrackingNumber
) : ICommand<ShipmentDto>;

public class UpdateShipmentTrackingHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateShipmentTrackingCommand, ShipmentDto>
{
    public async Task<Result<ShipmentDto>> Handle(UpdateShipmentTrackingCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var s = await dbContext.Shipments
            .Include(x => x.Items)
            .Include(x => x.StatusHistories)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (s == null)
            return Result.Failure<ShipmentDto>(new Error("Shipping.ShipmentNotFound", "Kargo kaydı bulunamadı."));

        if (request.CarrierId.HasValue)
        {
            var carrier = await dbContext.Carriers.FirstOrDefaultAsync(c => c.Id == request.CarrierId.Value, cancellationToken);
            if (carrier != null)
            {
                s.CarrierId = carrier.Id;
                s.CarrierName = carrier.Name;
                if (!string.IsNullOrWhiteSpace(request.TrackingNumber) && !string.IsNullOrWhiteSpace(carrier.TrackingUrlTemplate))
                {
                    s.TrackingUrl = carrier.TrackingUrlTemplate.Replace("{tracking_number}", request.TrackingNumber.Trim());
                }
            }
        }

        s.TrackingNumber = request.TrackingNumber?.Trim();
        s.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ShipmentDto>.Success(new ShipmentDto(
            s.Id,
            s.ShipmentNumber,
            s.OrderId,
            s.OrderNumber,
            s.CustomerId,
            s.CustomerName,
            s.CarrierId,
            s.CarrierName,
            s.TrackingNumber,
            s.TrackingUrl,
            s.Type,
            s.Status,
            s.PackageCount,
            s.TotalWeightKg,
            s.TotalDesi,
            s.ShippingCost,
            s.RecipientName,
            s.RecipientPhone,
            s.RecipientAddress,
            s.RecipientCity,
            s.RecipientDistrict,
            s.Notes,
            s.PreparedByUserId,
            s.PreparedByName,
            s.DispatchedAt,
            s.DeliveredAt,
            s.Items.Select(i => new ShipmentItemDto(i.Id, i.ProductId, i.ProductName, i.Sku, i.Quantity, i.Unit)).ToList(),
            s.StatusHistories.OrderByDescending(h => h.CreatedAt).Select(h => new ShipmentStatusHistoryDto(h.Id, h.Status, h.Location, h.Description, h.ChangedByUserId, h.ChangedByName, h.CreatedAt)).ToList(),
            s.CreatedAt,
            s.UpdatedAt
        ));
    }
}

// 6. GetShippingStatsQuery
public record GetShippingStatsQuery : IQuery<ShippingStatsDto>;

public class GetShippingStatsHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetShippingStatsQuery, ShippingStatsDto>
{
    public async Task<Result<ShippingStatsDto>> Handle(GetShippingStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var total = await dbContext.Shipments.CountAsync(cancellationToken);
        var preparing = await dbContext.Shipments.CountAsync(s => s.Status == "Preparing", cancellationToken);
        var inTransit = await dbContext.Shipments.CountAsync(s => s.Status == "Dispatched" || s.Status == "InTransit", cancellationToken);

        var today = DateTime.UtcNow.Date;
        var deliveredToday = await dbContext.Shipments.CountAsync(s => s.Status == "Delivered" && s.DeliveredAt >= today, cancellationToken);
        var pendingReturns = await dbContext.ReturnShipments.CountAsync(r => r.Status != "Received" && r.Status != "Restocked" && r.Status != "Rejected", cancellationToken);

        var deliveredTotal = await dbContext.Shipments.CountAsync(s => s.Status == "Delivered", cancellationToken);
        var failedOrCancelled = await dbContext.Shipments.CountAsync(s => s.Status == "FailedDelivery" || s.Status == "Cancelled", cancellationToken);

        var completedTotal = deliveredTotal + failedOrCancelled;
        var successRate = completedTotal > 0 ? (decimal)deliveredTotal / completedTotal * 100m : 100m;

        return Result<ShippingStatsDto>.Success(new ShippingStatsDto(
            total,
            preparing,
            inTransit,
            deliveredToday,
            pendingReturns,
            Math.Round(successRate, 1)
        ));
    }
}

// 7. FastEndpoints Mapping
public class ShipmentEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shipping/shipments").WithTags("Shipping - Shipments");

        group.MapGet("/", async (string? status, string? type, Guid? carrierId, Guid? customerId, Guid? orderId, string? search, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetShipmentsQuery(status, type, carrierId, customerId, orderId, search), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<ShipmentDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<ShipmentDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.View");

        group.MapGet("/stats", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetShippingStatsQuery(), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShippingStatsDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ShippingStatsDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.View");

        group.MapGet("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetShipmentByIdQuery(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShipmentDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ShipmentDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.View");

        group.MapPost("/", async (CreateShipmentCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShipmentDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ShipmentDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Manage");

        group.MapPost("/{id:guid}/status", async (Guid id, UpdateShipmentStatusRequest req, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateShipmentStatusCommand(id, req.Status, req.Location, req.Description, req.ChangedByUserId, req.ChangedByName), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShipmentDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ShipmentDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Dispatch");

        group.MapPost("/{id:guid}/tracking", async (Guid id, UpdateShipmentTrackingRequest req, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new UpdateShipmentTrackingCommand(id, req.CarrierId, req.TrackingNumber), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShipmentDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ShipmentDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Manage");

        group.MapDelete("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteShipmentCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Shipment.Manage");
    }
}

// 8. DeleteShipmentCommand
public record DeleteShipmentCommand(Guid Id) : ICommand<bool>;

public class DeleteShipmentHandler(
    ShippingDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteShipmentCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteShipmentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var shipment = await dbContext.Shipments
            .Include(s => s.Items)
            .Include(s => s.StatusHistories)
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (shipment == null)
            return Result.Failure<bool>(new Error("Shipping.NotFound", "Silinecek kargo sevkiyat kaydı bulunamadı."));

        dbContext.Shipments.Remove(shipment);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}

