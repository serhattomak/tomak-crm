using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Vehicles.Data;
using CRM.Modules.Vehicles.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Vehicles.Features.Vehicles;

// --- DTOs ---
public record VehicleSummaryDto(
    Guid Id,
    string Brand,
    string Model,
    string? Series,
    string? Generation,
    string? Platform,
    string? ProjectCode,
    string? InternalCode,
    int ModelYear,
    string Trim,
    string? Variant,
    string Segment,
    string BodyType,
    int Doors,
    int Seats,
    string DriveType,
    string Market,
    string Country,
    string? Plant,
    string? VinPrefix,
    string Engine,
    string Transmission,
    string Fuel,
    string Emission,
    string Status,
    string Icon,
    decimal PriceUsd,
    decimal PriceTry,
    string DimensionsJson,
    string WeightsJson,
    string EngineSpecJson,
    string PerformanceJson,
    string FuelEcoJson,
    string SuspensionJson,
    string BrakesJson,
    string? Tyres,
    string SafetyJson,
    string ComfortJson,
    string InfotainmentJson,
    string WarrantyJson,
    string EquipmentJson,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record VehicleListResponse(
    IReadOnlyList<VehicleSummaryDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);

public record CreateVehicleRequest(
    string Brand,
    string Model,
    string? Series,
    string? Generation,
    string? Platform,
    string? ProjectCode,
    string? InternalCode,
    int ModelYear,
    string Trim,
    string? Variant,
    string Segment,
    string BodyType,
    int Doors,
    int Seats,
    string DriveType,
    string Market,
    string Country,
    string? Plant,
    string? VinPrefix,
    string Engine,
    string Transmission,
    string Fuel,
    string Emission,
    string Status,
    string Icon,
    decimal PriceUsd,
    decimal PriceTry,
    string? DimensionsJson,
    string? WeightsJson,
    string? EngineSpecJson,
    string? PerformanceJson,
    string? FuelEcoJson,
    string? SuspensionJson,
    string? BrakesJson,
    string? Tyres,
    string? SafetyJson,
    string? ComfortJson,
    string? InfotainmentJson,
    string? WarrantyJson,
    string? EquipmentJson,
    string? Notes
);

public record UpdateVehicleRequest(
    string Brand,
    string Model,
    string? Series,
    string? Generation,
    string? Platform,
    string? ProjectCode,
    string? InternalCode,
    int ModelYear,
    string Trim,
    string? Variant,
    string Segment,
    string BodyType,
    int Doors,
    int Seats,
    string DriveType,
    string Market,
    string Country,
    string? Plant,
    string? VinPrefix,
    string Engine,
    string Transmission,
    string Fuel,
    string Emission,
    string Status,
    string Icon,
    decimal PriceUsd,
    decimal PriceTry,
    string? DimensionsJson,
    string? WeightsJson,
    string? EngineSpecJson,
    string? PerformanceJson,
    string? FuelEcoJson,
    string? SuspensionJson,
    string? BrakesJson,
    string? Tyres,
    string? SafetyJson,
    string? ComfortJson,
    string? InfotainmentJson,
    string? WarrantyJson,
    string? EquipmentJson,
    string? Notes
);

// --- CQRS Handlers ---
public record GetVehiclesQuery(
    string? Search,
    string? Brand,
    string? Segment,
    string? Status,
    int Page = 1,
    int PageSize = 50
) : IRequest<VehicleListResponse>;

public class GetVehiclesHandler(VehiclesDbContext db) : IRequestHandler<GetVehiclesQuery, VehicleListResponse>
{
    public async Task<VehicleListResponse> Handle(GetVehiclesQuery query, CancellationToken cancellationToken)
    {
        var q = db.Vehicles.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(v =>
                v.Brand.ToLower().Contains(s) ||
                v.Model.ToLower().Contains(s) ||
                (v.ProjectCode != null && v.ProjectCode.ToLower().Contains(s)) ||
                (v.VinPrefix != null && v.VinPrefix.ToLower().Contains(s)) ||
                v.Trim.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(query.Brand))
        {
            q = q.Where(v => v.Brand == query.Brand);
        }

        if (!string.IsNullOrWhiteSpace(query.Segment))
        {
            q = q.Where(v => v.Segment == query.Segment);
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            q = q.Where(v => v.Status == query.Status);
        }

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(v => v.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(v => new VehicleSummaryDto(
                v.Id,
                v.Brand,
                v.Model,
                v.Series,
                v.Generation,
                v.Platform,
                v.ProjectCode,
                v.InternalCode,
                v.ModelYear,
                v.Trim,
                v.Variant,
                v.Segment,
                v.BodyType,
                v.Doors,
                v.Seats,
                v.DriveType,
                v.Market,
                v.Country,
                v.Plant,
                v.VinPrefix,
                v.Engine,
                v.Transmission,
                v.Fuel,
                v.Emission,
                v.Status,
                v.Icon,
                v.PriceUsd,
                v.PriceTry,
                v.DimensionsJson,
                v.WeightsJson,
                v.EngineSpecJson,
                v.PerformanceJson,
                v.FuelEcoJson,
                v.SuspensionJson,
                v.BrakesJson,
                v.Tyres,
                v.SafetyJson,
                v.ComfortJson,
                v.InfotainmentJson,
                v.WarrantyJson,
                v.EquipmentJson,
                v.Notes,
                v.CreatedAt,
                v.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return new VehicleListResponse(items, total, query.Page, query.PageSize);
    }
}

public record GetVehicleByIdQuery(Guid Id) : IRequest<VehicleSummaryDto?>;

public class GetVehicleByIdHandler(VehiclesDbContext db) : IRequestHandler<GetVehicleByIdQuery, VehicleSummaryDto?>
{
    public async Task<VehicleSummaryDto?> Handle(GetVehicleByIdQuery query, CancellationToken cancellationToken)
    {
        var v = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == query.Id, cancellationToken);
        if (v == null) return null;

        return new VehicleSummaryDto(
            v.Id,
            v.Brand,
            v.Model,
            v.Series,
            v.Generation,
            v.Platform,
            v.ProjectCode,
            v.InternalCode,
            v.ModelYear,
            v.Trim,
            v.Variant,
            v.Segment,
            v.BodyType,
            v.Doors,
            v.Seats,
            v.DriveType,
            v.Market,
            v.Country,
            v.Plant,
            v.VinPrefix,
            v.Engine,
            v.Transmission,
            v.Fuel,
            v.Emission,
            v.Status,
            v.Icon,
            v.PriceUsd,
            v.PriceTry,
            v.DimensionsJson,
            v.WeightsJson,
            v.EngineSpecJson,
            v.PerformanceJson,
            v.FuelEcoJson,
            v.SuspensionJson,
            v.BrakesJson,
            v.Tyres,
            v.SafetyJson,
            v.ComfortJson,
            v.InfotainmentJson,
            v.WarrantyJson,
            v.EquipmentJson,
            v.Notes,
            v.CreatedAt,
            v.UpdatedAt
        );
    }
}

public record CreateVehicleCommand(CreateVehicleRequest Request) : IRequest<VehicleSummaryDto>;

public class CreateVehicleHandler(VehiclesDbContext db, ICurrentTenant currentTenant) : IRequestHandler<CreateVehicleCommand, VehicleSummaryDto>
{
    public async Task<VehicleSummaryDto> Handle(CreateVehicleCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var vehicle = new Vehicle
        {
            TenantId = currentTenant.Id.GetValueOrDefault(),
            Brand = req.Brand.Trim(),
            Model = req.Model.Trim(),
            Series = req.Series?.Trim(),
            Generation = req.Generation?.Trim(),
            Platform = req.Platform?.Trim(),
            ProjectCode = req.ProjectCode?.Trim(),
            InternalCode = req.InternalCode?.Trim() ?? req.ProjectCode?.Trim(),
            ModelYear = req.ModelYear,
            Trim = req.Trim.Trim(),
            Variant = req.Variant?.Trim(),
            Segment = req.Segment.Trim(),
            BodyType = req.BodyType.Trim(),
            Doors = req.Doors,
            Seats = req.Seats,
            DriveType = req.DriveType.Trim(),
            Market = req.Market.Trim(),
            Country = req.Country.Trim(),
            Plant = req.Plant?.Trim(),
            VinPrefix = req.VinPrefix?.Trim(),
            Engine = req.Engine.Trim(),
            Transmission = req.Transmission.Trim(),
            Fuel = req.Fuel.Trim(),
            Emission = req.Emission.Trim(),
            Status = req.Status.Trim(),
            Icon = string.IsNullOrWhiteSpace(req.Icon) ? "🚗" : req.Icon.Trim(),
            PriceUsd = req.PriceUsd,
            PriceTry = req.PriceTry,
            DimensionsJson = req.DimensionsJson ?? "{}",
            WeightsJson = req.WeightsJson ?? "{}",
            EngineSpecJson = req.EngineSpecJson ?? "{}",
            PerformanceJson = req.PerformanceJson ?? "{}",
            FuelEcoJson = req.FuelEcoJson ?? "{}",
            SuspensionJson = req.SuspensionJson ?? "{}",
            BrakesJson = req.BrakesJson ?? "{}",
            Tyres = req.Tyres?.Trim(),
            SafetyJson = req.SafetyJson ?? "{}",
            ComfortJson = req.ComfortJson ?? "{}",
            InfotainmentJson = req.InfotainmentJson ?? "{}",
            WarrantyJson = req.WarrantyJson ?? "{}",
            EquipmentJson = req.EquipmentJson ?? "[]",
            Notes = req.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync(cancellationToken);

        return new VehicleSummaryDto(
            vehicle.Id,
            vehicle.Brand,
            vehicle.Model,
            vehicle.Series,
            vehicle.Generation,
            vehicle.Platform,
            vehicle.ProjectCode,
            vehicle.InternalCode,
            vehicle.ModelYear,
            vehicle.Trim,
            vehicle.Variant,
            vehicle.Segment,
            vehicle.BodyType,
            vehicle.Doors,
            vehicle.Seats,
            vehicle.DriveType,
            vehicle.Market,
            vehicle.Country,
            vehicle.Plant,
            vehicle.VinPrefix,
            vehicle.Engine,
            vehicle.Transmission,
            vehicle.Fuel,
            vehicle.Emission,
            vehicle.Status,
            vehicle.Icon,
            vehicle.PriceUsd,
            vehicle.PriceTry,
            vehicle.DimensionsJson,
            vehicle.WeightsJson,
            vehicle.EngineSpecJson,
            vehicle.PerformanceJson,
            vehicle.FuelEcoJson,
            vehicle.SuspensionJson,
            vehicle.BrakesJson,
            vehicle.Tyres,
            vehicle.SafetyJson,
            vehicle.ComfortJson,
            vehicle.InfotainmentJson,
            vehicle.WarrantyJson,
            vehicle.EquipmentJson,
            vehicle.Notes,
            vehicle.CreatedAt,
            vehicle.UpdatedAt
        );
    }
}

public record UpdateVehicleCommand(Guid Id, UpdateVehicleRequest Request) : IRequest<VehicleSummaryDto?>;

public class UpdateVehicleHandler(VehiclesDbContext db) : IRequestHandler<UpdateVehicleCommand, VehicleSummaryDto?>
{
    public async Task<VehicleSummaryDto?> Handle(UpdateVehicleCommand command, CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == command.Id, cancellationToken);
        if (vehicle == null) return null;

        var req = command.Request;
        vehicle.Brand = req.Brand.Trim();
        vehicle.Model = req.Model.Trim();
        vehicle.Series = req.Series?.Trim();
        vehicle.Generation = req.Generation?.Trim();
        vehicle.Platform = req.Platform?.Trim();
        vehicle.ProjectCode = req.ProjectCode?.Trim();
        vehicle.InternalCode = req.InternalCode?.Trim() ?? req.ProjectCode?.Trim();
        vehicle.ModelYear = req.ModelYear;
        vehicle.Trim = req.Trim.Trim();
        vehicle.Variant = req.Variant?.Trim();
        vehicle.Segment = req.Segment.Trim();
        vehicle.BodyType = req.BodyType.Trim();
        vehicle.Doors = req.Doors;
        vehicle.Seats = req.Seats;
        vehicle.DriveType = req.DriveType.Trim();
        vehicle.Market = req.Market.Trim();
        vehicle.Country = req.Country.Trim();
        vehicle.Plant = req.Plant?.Trim();
        vehicle.VinPrefix = req.VinPrefix?.Trim();
        vehicle.Engine = req.Engine.Trim();
        vehicle.Transmission = req.Transmission.Trim();
        vehicle.Fuel = req.Fuel.Trim();
        vehicle.Emission = req.Emission.Trim();
        vehicle.Status = req.Status.Trim();
        vehicle.Icon = string.IsNullOrWhiteSpace(req.Icon) ? "🚗" : req.Icon.Trim();
        vehicle.PriceUsd = req.PriceUsd;
        vehicle.PriceTry = req.PriceTry;
        if (req.DimensionsJson != null) vehicle.DimensionsJson = req.DimensionsJson;
        if (req.WeightsJson != null) vehicle.WeightsJson = req.WeightsJson;
        if (req.EngineSpecJson != null) vehicle.EngineSpecJson = req.EngineSpecJson;
        if (req.PerformanceJson != null) vehicle.PerformanceJson = req.PerformanceJson;
        if (req.FuelEcoJson != null) vehicle.FuelEcoJson = req.FuelEcoJson;
        if (req.SuspensionJson != null) vehicle.SuspensionJson = req.SuspensionJson;
        if (req.BrakesJson != null) vehicle.BrakesJson = req.BrakesJson;
        if (req.Tyres != null) vehicle.Tyres = req.Tyres.Trim();
        if (req.SafetyJson != null) vehicle.SafetyJson = req.SafetyJson;
        if (req.ComfortJson != null) vehicle.ComfortJson = req.ComfortJson;
        if (req.InfotainmentJson != null) vehicle.InfotainmentJson = req.InfotainmentJson;
        if (req.WarrantyJson != null) vehicle.WarrantyJson = req.WarrantyJson;
        if (req.EquipmentJson != null) vehicle.EquipmentJson = req.EquipmentJson;
        vehicle.Notes = req.Notes;
        vehicle.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        return new VehicleSummaryDto(
            vehicle.Id,
            vehicle.Brand,
            vehicle.Model,
            vehicle.Series,
            vehicle.Generation,
            vehicle.Platform,
            vehicle.ProjectCode,
            vehicle.InternalCode,
            vehicle.ModelYear,
            vehicle.Trim,
            vehicle.Variant,
            vehicle.Segment,
            vehicle.BodyType,
            vehicle.Doors,
            vehicle.Seats,
            vehicle.DriveType,
            vehicle.Market,
            vehicle.Country,
            vehicle.Plant,
            vehicle.VinPrefix,
            vehicle.Engine,
            vehicle.Transmission,
            vehicle.Fuel,
            vehicle.Emission,
            vehicle.Status,
            vehicle.Icon,
            vehicle.PriceUsd,
            vehicle.PriceTry,
            vehicle.DimensionsJson,
            vehicle.WeightsJson,
            vehicle.EngineSpecJson,
            vehicle.PerformanceJson,
            vehicle.FuelEcoJson,
            vehicle.SuspensionJson,
            vehicle.BrakesJson,
            vehicle.Tyres,
            vehicle.SafetyJson,
            vehicle.ComfortJson,
            vehicle.InfotainmentJson,
            vehicle.WarrantyJson,
            vehicle.EquipmentJson,
            vehicle.Notes,
            vehicle.CreatedAt,
            vehicle.UpdatedAt
        );
    }
}

public record DeleteVehicleCommand(Guid Id) : IRequest<bool>;

public class DeleteVehicleHandler(VehiclesDbContext db) : IRequestHandler<DeleteVehicleCommand, bool>
{
    public async Task<bool> Handle(DeleteVehicleCommand command, CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == command.Id, cancellationToken);
        if (vehicle == null) return false;

        db.Vehicles.Remove(vehicle);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

// --- Endpoints ---
public static class VehicleEndpoints
{
    public static void MapVehicleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vehicles")
            .WithTags("Vehicles");

        group.MapGet("/", async (
            string? search,
            string? brand,
            string? segment,
            string? status,
            int? page,
            int? pageSize,
            ISender sender) =>
        {
            var res = await sender.Send(new GetVehiclesQuery(search, brand, segment, status, page ?? 1, pageSize ?? 50));
            return Results.Ok(ApiResponse<VehicleListResponse>.Ok(res));
        });

        group.MapGet("/{id:guid}", async (Guid id, ISender sender) =>
        {
            var res = await sender.Send(new GetVehicleByIdQuery(id));
            if (res == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Araç bulunamadı."));
            return Results.Ok(ApiResponse<VehicleSummaryDto>.Ok(res));
        });

        group.MapPost("/", async (CreateVehicleRequest req, ISender sender) =>
        {
            var res = await sender.Send(new CreateVehicleCommand(req));
            return Results.Ok(ApiResponse<VehicleSummaryDto>.Ok(res, "Araç başarıyla eklendi."));
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateVehicleRequest req, ISender sender) =>
        {
            var res = await sender.Send(new UpdateVehicleCommand(id, req));
            if (res == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Araç bulunamadı."));
            return Results.Ok(ApiResponse<VehicleSummaryDto>.Ok(res, "Araç güncellendi."));
        });

        group.MapDelete("/{id:guid}", async (Guid id, ISender sender) =>
        {
            var res = await sender.Send(new DeleteVehicleCommand(id));
            if (!res) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Araç bulunamadı."));
            return Results.Ok(ApiResponse<bool>.Ok(true, "Araç silindi."));
        });
    }
}
