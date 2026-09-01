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

namespace CRM.Modules.Vehicles.Features.Documents;

// --- DTOs ---
public record VehicleDocumentDto(
    Guid Id,
    Guid? VehicleId,
    string? VehicleName,
    Guid? PartId,
    string? PartName,
    string Name,
    string DocumentType,
    string Category,
    string FileSize,
    string? FileUrl,
    string TagsJson,
    DateTime CreatedAt
);

public record CreateVehicleDocumentRequest(
    Guid? VehicleId,
    Guid? PartId,
    string Name,
    string DocumentType,
    string Category,
    string FileSize,
    string? FileUrl,
    string? TagsJson
);

// --- Handlers ---
public record GetVehicleDocumentsQuery(
    Guid? VehicleId,
    Guid? PartId,
    string? DocumentType,
    string? Category,
    string? Search
) : IRequest<IReadOnlyList<VehicleDocumentDto>>;

public class GetVehicleDocumentsHandler(VehiclesDbContext db) : IRequestHandler<GetVehicleDocumentsQuery, IReadOnlyList<VehicleDocumentDto>>
{
    public async Task<IReadOnlyList<VehicleDocumentDto>> Handle(GetVehicleDocumentsQuery query, CancellationToken cancellationToken)
    {
        var q = db.VehicleDocuments
            .AsNoTracking()
            .Include(d => d.Vehicle)
            .AsQueryable();

        if (query.VehicleId.HasValue)
        {
            q = q.Where(d => d.VehicleId == query.VehicleId.Value);
        }

        if (query.PartId.HasValue)
        {
            q = q.Where(d => d.PartId == query.PartId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.DocumentType))
        {
            q = q.Where(d => d.DocumentType == query.DocumentType);
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            q = q.Where(d => d.Category == query.Category);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(d => d.Name.ToLower().Contains(s) || d.Category.ToLower().Contains(s));
        }

        var docs = await q
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new VehicleDocumentDto(
                d.Id,
                d.VehicleId,
                d.Vehicle != null ? d.Vehicle.Brand + " " + d.Vehicle.Model : null,
                d.PartId,
                null,
                d.Name,
                d.DocumentType,
                d.Category,
                d.FileSize,
                d.FileUrl,
                d.TagsJson,
                d.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return docs;
    }
}

public record CreateVehicleDocumentCommand(CreateVehicleDocumentRequest Request) : IRequest<VehicleDocumentDto>;

public class CreateVehicleDocumentHandler(VehiclesDbContext db, ICurrentTenant currentTenant) : IRequestHandler<CreateVehicleDocumentCommand, VehicleDocumentDto>
{
    public async Task<VehicleDocumentDto> Handle(CreateVehicleDocumentCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        var doc = new VehicleDocument
        {
            TenantId = currentTenant.Id.GetValueOrDefault(),
            VehicleId = req.VehicleId,
            PartId = req.PartId,
            Name = req.Name.Trim(),
            DocumentType = req.DocumentType.Trim(),
            Category = req.Category.Trim(),
            FileSize = req.FileSize.Trim(),
            FileUrl = req.FileUrl,
            TagsJson = req.TagsJson ?? "[]",
            CreatedAt = DateTime.UtcNow
        };

        db.VehicleDocuments.Add(doc);
        await db.SaveChangesAsync(cancellationToken);

        return new VehicleDocumentDto(
            doc.Id,
            doc.VehicleId,
            null,
            doc.PartId,
            null,
            doc.Name,
            doc.DocumentType,
            doc.Category,
            doc.FileSize,
            doc.FileUrl,
            doc.TagsJson,
            doc.CreatedAt
        );
    }
}

public record DeleteVehicleDocumentCommand(Guid Id) : IRequest<bool>;

public class DeleteVehicleDocumentHandler(VehiclesDbContext db) : IRequestHandler<DeleteVehicleDocumentCommand, bool>
{
    public async Task<bool> Handle(DeleteVehicleDocumentCommand command, CancellationToken cancellationToken)
    {
        var doc = await db.VehicleDocuments.FirstOrDefaultAsync(x => x.Id == command.Id, cancellationToken);
        if (doc == null) return false;

        db.VehicleDocuments.Remove(doc);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

// --- Endpoints ---
public static class VehicleDocEndpoints
{
    public static void MapVehicleDocEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vehicles/documents")
            .WithTags("Vehicle Documents");

        group.MapGet("/", async (
            Guid? vehicleId,
            Guid? partId,
            string? documentType,
            string? category,
            string? search,
            ISender sender) =>
        {
            var res = await sender.Send(new GetVehicleDocumentsQuery(vehicleId, partId, documentType, category, search));
            return Results.Ok(ApiResponse<IReadOnlyList<VehicleDocumentDto>>.Ok(res));
        });

        group.MapPost("/", async (CreateVehicleDocumentRequest req, ISender sender) =>
        {
            var res = await sender.Send(new CreateVehicleDocumentCommand(req));
            return Results.Ok(ApiResponse<VehicleDocumentDto>.Ok(res, "Doküman eklendi."));
        });

        group.MapDelete("/{id:guid}", async (Guid id, ISender sender) =>
        {
            var res = await sender.Send(new DeleteVehicleDocumentCommand(id));
            if (!res) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Doküman bulunamadı."));
            return Results.Ok(ApiResponse<bool>.Ok(true, "Doküman silindi."));
        });
    }
}
