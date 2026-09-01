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

namespace CRM.Modules.Vehicles.Features.EPC;

// --- DTOs ---
public record EpcSubsystemDto(
    Guid Id,
    Guid SystemId,
    string Code,
    string Name,
    int DisplayOrder,
    int PartsCount
);

public record EpcSystemDto(
    Guid Id,
    string Code,
    string Name,
    string Icon,
    int DisplayOrder,
    int TotalPartsCount,
    IReadOnlyList<EpcSubsystemDto> Subsystems
);

public record VehiclePartDto(
    Guid Id,
    Guid? SystemId,
    string? SystemName,
    Guid? SubsystemId,
    string? SubsystemName,
    string PartNumber,
    string? OemNumber,
    string NameTr,
    string NameEn,
    string? NameCn,
    int QtyPerAssembly,
    string? Location,
    int StockQuantity,
    decimal UnitPrice,
    string? Supersession,
    string CompatibleModelsJson,
    int? HotspotCoordX,
    int? HotspotCoordY,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreatePartRequest(
    Guid? SystemId,
    Guid? SubsystemId,
    string PartNumber,
    string? OemNumber,
    string NameTr,
    string NameEn,
    string? NameCn,
    int QtyPerAssembly,
    string? Location,
    int StockQuantity,
    decimal UnitPrice,
    string? Supersession,
    string? CompatibleModelsJson,
    int? HotspotCoordX,
    int? HotspotCoordY,
    string? Notes
);

public record UpdatePartRequest(
    Guid? SystemId,
    Guid? SubsystemId,
    string PartNumber,
    string? OemNumber,
    string NameTr,
    string NameEn,
    string? NameCn,
    int QtyPerAssembly,
    string? Location,
    int StockQuantity,
    decimal UnitPrice,
    string? Supersession,
    string? CompatibleModelsJson,
    int? HotspotCoordX,
    int? HotspotCoordY,
    string? Notes
);

// --- Handlers ---
public record GetEpcSystemsQuery() : IRequest<IReadOnlyList<EpcSystemDto>>;

public class GetEpcSystemsHandler(VehiclesDbContext db, ICurrentTenant currentTenant) : IRequestHandler<GetEpcSystemsQuery, IReadOnlyList<EpcSystemDto>>
{
    public async Task<IReadOnlyList<EpcSystemDto>> Handle(GetEpcSystemsQuery query, CancellationToken cancellationToken)
    {
        // Auto-seed default automotive systems if none exist for tenant
        var existingCount = await db.VehicleSystems.CountAsync(cancellationToken);
        if (existingCount == 0 && currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            await SeedDefaultSystemsAsync(currentTenant.Id.Value, cancellationToken);
        }

        var systems = await db.VehicleSystems
            .AsNoTracking()
            .Include(s => s.Subsystems)
            .Include(s => s.Parts)
            .OrderBy(s => s.DisplayOrder)
            .ToListAsync(cancellationToken);

        return systems.Select(s => new EpcSystemDto(
            s.Id,
            s.Code,
            s.Name,
            s.Icon,
            s.DisplayOrder,
            s.Parts.Count,
            s.Subsystems.OrderBy(sub => sub.DisplayOrder).Select(sub => new EpcSubsystemDto(
                sub.Id,
                sub.SystemId,
                sub.Code,
                sub.Name,
                sub.DisplayOrder,
                s.Parts.Count(p => p.SubsystemId == sub.Id)
            )).ToList()
        )).ToList();
    }

    private async Task SeedDefaultSystemsAsync(Guid tenantId, CancellationToken ct)
    {
        var defaults = new List<(string Code, string Name, string Icon, List<(string SubCode, string SubName)> Subs)>
        {
            ("SYS_ENGINE", "Motor / Engine", "⚙️", new() { ("SUB_BLOCK", "Silindir Bloğu & Kapağı"), ("SUB_FUEL", "Yakıt Enjeksiyon Sistemi"), ("SUB_COOLING", "Soğutma & Radyatör") }),
            ("SYS_TRANS", "Şanzıman / Transmission", "🔧", new() { ("SUB_GEAR", "Vites Kutusu & Dişliler"), ("SUB_CLUTCH", "Debriyaj & Tork Konvertörü") }),
            ("SYS_BRAKE", "Fren Sistemi / Brakes", "🛑", new() { ("SUB_FRONT_BRK", "Ön Fren Disk & Balata"), ("SUB_REAR_BRK", "Arka Fren Grubu"), ("SUB_ABS", "ABS & ESP Hidrolik Ünitesi") }),
            ("SYS_SUSP", "Süspansiyon & Yürür Aksam", "🔩", new() { ("SUB_FRONT_SUSP", "Ön Amortisör & Salıncak"), ("SUB_REAR_SUSP", "Arka Aks & Yaylar") }),
            ("SYS_ELEC", "Elektrik & Elektronik", "🔌", new() { ("SUB_WIRING", "Motor & Kabin Tesisatı"), ("SUB_SENSORS", "Sensörler & Aktüatörler"), ("SUB_ECU", "Motor & Gövde Kontrol ECU") }),
            ("SYS_BODY", "Kaporta & Dış Donanım", "🚪", new() { ("SUB_DOORS", "Kapılar & Cam Krikoları"), ("SUB_HOOD", "Kaput & Bagaj Kapağı"), ("SUB_BUMPER", "Ön & Arka Tampon Grubu") }),
            ("SYS_INTERIOR", "İç Donanım & Trim", "💺", new() { ("SUB_SEATS", "Koltuklar & Emniyet Kemeri"), ("SUB_DASH", "Ön Konsol & Gösterge Paneli") })
        };

        var order = 1;
        foreach (var def in defaults)
        {
            var sys = new VehicleSystem
            {
                TenantId = tenantId,
                Code = def.Code,
                Name = def.Name,
                Icon = def.Icon,
                DisplayOrder = order++,
                CreatedAt = DateTime.UtcNow
            };
            db.VehicleSystems.Add(sys);

            var subOrder = 1;
            foreach (var sub in def.Subs)
            {
                db.VehicleSubsystems.Add(new VehicleSubsystem
                {
                    TenantId = tenantId,
                    SystemId = sys.Id,
                    Code = sub.SubCode,
                    Name = sub.SubName,
                    DisplayOrder = subOrder++,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }
}

public record GetEpcPartsQuery(
    Guid? SystemId,
    Guid? SubsystemId,
    string? Search,
    int Page = 1,
    int PageSize = 100
) : IRequest<IReadOnlyList<VehiclePartDto>>;

public class GetEpcPartsHandler(VehiclesDbContext db) : IRequestHandler<GetEpcPartsQuery, IReadOnlyList<VehiclePartDto>>
{
    public async Task<IReadOnlyList<VehiclePartDto>> Handle(GetEpcPartsQuery query, CancellationToken cancellationToken)
    {
        var q = db.VehicleParts
            .AsNoTracking()
            .Include(p => p.System)
            .Include(p => p.Subsystem)
            .AsQueryable();

        if (query.SystemId.HasValue)
        {
            q = q.Where(p => p.SystemId == query.SystemId.Value);
        }

        if (query.SubsystemId.HasValue)
        {
            q = q.Where(p => p.SubsystemId == query.SubsystemId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(p =>
                p.PartNumber.ToLower().Contains(s) ||
                (p.OemNumber != null && p.OemNumber.ToLower().Contains(s)) ||
                p.NameTr.ToLower().Contains(s) ||
                p.NameEn.ToLower().Contains(s) ||
                (p.NameCn != null && p.NameCn.ToLower().Contains(s)) ||
                (p.Location != null && p.Location.ToLower().Contains(s)));
        }

        var parts = await q
            .OrderBy(p => p.NameTr)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => new VehiclePartDto(
                p.Id,
                p.SystemId,
                p.System != null ? p.System.Name : null,
                p.SubsystemId,
                p.Subsystem != null ? p.Subsystem.Name : null,
                p.PartNumber,
                p.OemNumber,
                p.NameTr,
                p.NameEn,
                p.NameCn,
                p.QtyPerAssembly,
                p.Location,
                p.StockQuantity,
                p.UnitPrice,
                p.Supersession,
                p.CompatibleModelsJson,
                p.HotspotCoordX,
                p.HotspotCoordY,
                p.Notes,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return parts;
    }
}

public record CreatePartCommand(CreatePartRequest Request) : IRequest<VehiclePartDto>;

public class CreatePartHandler(VehiclesDbContext db, ICurrentTenant currentTenant) : IRequestHandler<CreatePartCommand, VehiclePartDto>
{
    public async Task<VehiclePartDto> Handle(CreatePartCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var part = new VehiclePart
        {
            TenantId = currentTenant.Id.GetValueOrDefault(),
            SystemId = req.SystemId,
            SubsystemId = req.SubsystemId,
            PartNumber = req.PartNumber.Trim(),
            OemNumber = req.OemNumber?.Trim(),
            NameTr = req.NameTr.Trim(),
            NameEn = req.NameEn.Trim(),
            NameCn = req.NameCn?.Trim(),
            QtyPerAssembly = req.QtyPerAssembly > 0 ? req.QtyPerAssembly : 1,
            Location = req.Location?.Trim(),
            StockQuantity = req.StockQuantity,
            UnitPrice = req.UnitPrice,
            Supersession = req.Supersession?.Trim() ?? "—",
            CompatibleModelsJson = req.CompatibleModelsJson ?? "[]",
            HotspotCoordX = req.HotspotCoordX,
            HotspotCoordY = req.HotspotCoordY,
            Notes = req.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.VehicleParts.Add(part);
        await db.SaveChangesAsync(cancellationToken);

        return new VehiclePartDto(
            part.Id,
            part.SystemId,
            null,
            part.SubsystemId,
            null,
            part.PartNumber,
            part.OemNumber,
            part.NameTr,
            part.NameEn,
            part.NameCn,
            part.QtyPerAssembly,
            part.Location,
            part.StockQuantity,
            part.UnitPrice,
            part.Supersession,
            part.CompatibleModelsJson,
            part.HotspotCoordX,
            part.HotspotCoordY,
            part.Notes,
            part.CreatedAt,
            part.UpdatedAt
        );
    }
}

public record UpdatePartCommand(Guid Id, UpdatePartRequest Request) : IRequest<VehiclePartDto?>;

public class UpdatePartHandler(VehiclesDbContext db) : IRequestHandler<UpdatePartCommand, VehiclePartDto?>
{
    public async Task<VehiclePartDto?> Handle(UpdatePartCommand command, CancellationToken cancellationToken)
    {
        var part = await db.VehicleParts.FirstOrDefaultAsync(x => x.Id == command.Id, cancellationToken);
        if (part == null) return null;

        var req = command.Request;
        part.SystemId = req.SystemId;
        part.SubsystemId = req.SubsystemId;
        part.PartNumber = req.PartNumber.Trim();
        part.OemNumber = req.OemNumber?.Trim();
        part.NameTr = req.NameTr.Trim();
        part.NameEn = req.NameEn.Trim();
        part.NameCn = req.NameCn?.Trim();
        part.QtyPerAssembly = req.QtyPerAssembly > 0 ? req.QtyPerAssembly : 1;
        part.Location = req.Location?.Trim();
        part.StockQuantity = req.StockQuantity;
        part.UnitPrice = req.UnitPrice;
        part.Supersession = req.Supersession?.Trim() ?? "—";
        if (req.CompatibleModelsJson != null) part.CompatibleModelsJson = req.CompatibleModelsJson;
        part.HotspotCoordX = req.HotspotCoordX;
        part.HotspotCoordY = req.HotspotCoordY;
        part.Notes = req.Notes;
        part.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        return new VehiclePartDto(
            part.Id,
            part.SystemId,
            null,
            part.SubsystemId,
            null,
            part.PartNumber,
            part.OemNumber,
            part.NameTr,
            part.NameEn,
            part.NameCn,
            part.QtyPerAssembly,
            part.Location,
            part.StockQuantity,
            part.UnitPrice,
            part.Supersession,
            part.CompatibleModelsJson,
            part.HotspotCoordX,
            part.HotspotCoordY,
            part.Notes,
            part.CreatedAt,
            part.UpdatedAt
        );
    }
}

public record DeletePartCommand(Guid Id) : IRequest<bool>;

public class DeletePartHandler(VehiclesDbContext db) : IRequestHandler<DeletePartCommand, bool>
{
    public async Task<bool> Handle(DeletePartCommand command, CancellationToken cancellationToken)
    {
        var part = await db.VehicleParts.FirstOrDefaultAsync(x => x.Id == command.Id, cancellationToken);
        if (part == null) return false;

        db.VehicleParts.Remove(part);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

// --- Endpoints ---
public static class EpcEndpoints
{
    public static void MapEpcEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vehicles/epc")
            .WithTags("EPC");

        group.MapGet("/systems", async (ISender sender) =>
        {
            var res = await sender.Send(new GetEpcSystemsQuery());
            return Results.Ok(ApiResponse<IReadOnlyList<EpcSystemDto>>.Ok(res));
        });

        group.MapGet("/parts", async (
            Guid? systemId,
            Guid? subsystemId,
            string? search,
            int? page,
            int? pageSize,
            ISender sender) =>
        {
            var res = await sender.Send(new GetEpcPartsQuery(systemId, subsystemId, search, page ?? 1, pageSize ?? 100));
            return Results.Ok(ApiResponse<IReadOnlyList<VehiclePartDto>>.Ok(res));
        });

        group.MapPost("/parts", async (CreatePartRequest req, ISender sender) =>
        {
            var res = await sender.Send(new CreatePartCommand(req));
            return Results.Ok(ApiResponse<VehiclePartDto>.Ok(res, "Parça başarıyla eklendi."));
        });

        group.MapPut("/parts/{id:guid}", async (Guid id, UpdatePartRequest req, ISender sender) =>
        {
            var res = await sender.Send(new UpdatePartCommand(id, req));
            if (res == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Parça bulunamadı."));
            return Results.Ok(ApiResponse<VehiclePartDto>.Ok(res, "Parça güncellendi."));
        });

        group.MapDelete("/parts/{id:guid}", async (Guid id, ISender sender) =>
        {
            var res = await sender.Send(new DeletePartCommand(id));
            if (!res) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Parça bulunamadı."));
            return Results.Ok(ApiResponse<bool>.Ok(true, "Parça silindi."));
        });
    }
}
