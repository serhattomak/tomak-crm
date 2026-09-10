using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.FieldService.Data;
using CRM.Modules.FieldService.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.FieldService.Features;

public static class FieldServiceEndpoints
{
    public static IEndpointRouteBuilder MapFieldServiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/field-service")
            .WithTags("Field Service")
            .RequireAuthorization();

        // 1. List Jobs
        group.MapGet("/jobs", async (
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            string? status,
            string? search,
            Guid? technicianId,
            DateOnly? date,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id;
            var query = db.FieldJobs
                .Where(j => j.TenantId == tenantId)
                .Include(j => j.Tasks)
                .Include(j => j.Parts)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(j => j.Status == status);
            }

            if (technicianId.HasValue)
            {
                query = query.Where(j => j.AssignedTechnicianId == technicianId.Value);
            }

            if (date.HasValue)
            {
                query = query.Where(j => j.ScheduledDate == date.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(j =>
                    j.JobNumber.ToLower().Contains(s) ||
                    j.Title.ToLower().Contains(s) ||
                    (j.CustomerName != null && j.CustomerName.ToLower().Contains(s)) ||
                    j.ServiceAddress.ToLower().Contains(s) ||
                    (j.AssignedTechnicianName != null && j.AssignedTechnicianName.ToLower().Contains(s)));
            }

            var items = await query.OrderByDescending(j => j.CreatedAt).ToListAsync(ct);
            return Results.Ok(ApiResponse<List<FieldJob>>.Ok(items));
        });

        // 2. Get Single Job
        group.MapGet("/jobs/{id:guid}", async (
            Guid id,
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id;
            var job = await db.FieldJobs
                .Where(j => j.TenantId == tenantId && j.Id == id)
                .Include(j => j.Tasks.OrderBy(t => t.DisplayOrder))
                .Include(j => j.Parts)
                .Include(j => j.Checkins.OrderByDescending(c => c.Timestamp))
                .FirstOrDefaultAsync(ct);

            if (job == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Saha servis görevi bulunamadı."));
            return Results.Ok(ApiResponse<FieldJob>.Ok(job));
        });

        // 3. Create Job
        group.MapPost("/jobs", async (
            CreateFieldJobRequest req,
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id ?? Guid.Empty;
            var count = await db.FieldJobs.CountAsync(j => j.TenantId == tenantId, ct);
            var jobNumber = $"SRV-{(count + 1):D5}";

            var job = new FieldJob
            {
                TenantId = tenantId,
                JobNumber = jobNumber,
                Title = req.Title,
                Description = req.Description,
                ServiceType = req.ServiceType ?? "Installation",
                Status = "Scheduled",
                Priority = req.Priority ?? "Normal",
                CustomerId = req.CustomerId,
                CustomerName = req.CustomerName,
                ContactPerson = req.ContactPerson,
                ContactPhone = req.ContactPhone,
                ServiceAddress = req.ServiceAddress,
                City = req.City,
                District = req.District,
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                AssignedTechnicianId = req.AssignedTechnicianId,
                AssignedTechnicianName = req.AssignedTechnicianName,
                ScheduledDate = req.ScheduledDate,
                ScheduledStartTime = req.ScheduledStartTime,
                ScheduledEndTime = req.ScheduledEndTime
            };

            if (req.Tasks != null)
            {
                int order = 1;
                foreach (var t in req.Tasks)
                {
                    job.Tasks.Add(new FieldJobTask
                    {
                        TenantId = tenantId,
                        Title = t.Title,
                        Description = t.Description,
                        DisplayOrder = order++
                    });
                }
            }

            db.FieldJobs.Add(job);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/v1/field-service/jobs/{job.Id}", ApiResponse<FieldJob>.Ok(job, "İş emri başarıyla oluşturuldu."));
        });

        // 4. Update Status / Dispatch
        group.MapPatch("/jobs/{id:guid}/status", async (
            Guid id,
            UpdateFieldJobStatusRequest req,
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id;
            var job = await db.FieldJobs.FirstOrDefaultAsync(j => j.TenantId == tenantId && j.Id == id, ct);
            if (job == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Saha servis görevi bulunamadı."));

            job.Status = req.Status;
            if (req.Status == "InProgress" && job.ActualStartTime == null)
            {
                job.ActualStartTime = DateTimeOffset.UtcNow;
            }
            else if (req.Status == "Completed" && job.ActualEndTime == null)
            {
                job.ActualEndTime = DateTimeOffset.UtcNow;
            }
            job.UpdatedAt = DateTimeOffset.UtcNow;

            await db.SaveChangesAsync(ct);
            return Results.Ok(ApiResponse<FieldJob>.Ok(job));
        });

        // 5. Check-in (Arrival / Departure GPS)
        group.MapPost("/jobs/{id:guid}/checkin", async (
            Guid id,
            TechnicianCheckinRequest req,
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id ?? Guid.Empty;
            var job = await db.FieldJobs.FirstOrDefaultAsync(j => j.TenantId == tenantId && j.Id == id, ct);
            if (job == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Saha servis görevi bulunamadı."));

            var checkin = new FieldJobCheckin
            {
                TenantId = tenantId,
                JobId = id,
                TechnicianId = req.TechnicianId,
                CheckinType = req.CheckinType, // Arrival / Departure
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                DeviceInfo = req.DeviceInfo,
                Timestamp = DateTimeOffset.UtcNow
            };

            if (req.CheckinType == "Arrival")
            {
                job.Status = "InProgress";
                job.ActualStartTime ??= DateTimeOffset.UtcNow;
            }

            db.FieldJobCheckins.Add(checkin);
            await db.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<FieldJobCheckin>.Ok(checkin));
        });

        // 6. Complete Job & Sign
        group.MapPost("/jobs/{id:guid}/complete", async (
            Guid id,
            CompleteFieldJobRequest req,
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id ?? Guid.Empty;
            var job = await db.FieldJobs
                .Include(j => j.Tasks)
                .Include(j => j.Parts)
                .FirstOrDefaultAsync(j => j.TenantId == tenantId && j.Id == id, ct);

            if (job == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Saha servis görevi bulunamadı."));

            job.Status = "Completed";
            job.ResolutionNotes = req.ResolutionNotes;
            job.CustomerSignatureData = req.CustomerSignatureData;
            job.CustomerSignedName = req.CustomerSignedName;
            job.SignedAt = DateTimeOffset.UtcNow;
            job.ActualEndTime = DateTimeOffset.UtcNow;
            job.UpdatedAt = DateTimeOffset.UtcNow;

            if (req.Parts != null && req.Parts.Count > 0)
            {
                decimal totalPartsCost = 0;
                foreach (var p in req.Parts)
                {
                    var partCost = p.Quantity * p.UnitPrice;
                    totalPartsCost += partCost;
                    job.Parts.Add(new FieldJobPart
                    {
                        TenantId = tenantId,
                        JobId = id,
                        ProductId = p.ProductId,
                        ProductName = p.ProductName,
                        UnitPrice = p.UnitPrice,
                        Quantity = p.Quantity,
                        TotalPrice = partCost
                    });
                }
                job.TotalCost = totalPartsCost;
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(ApiResponse<FieldJob>.Ok(job, "Görev başarıyla tamamlandı."));
        });

        // 7. Toggle Task
        group.MapPatch("/jobs/{jobId:guid}/tasks/{taskId:guid}/toggle", async (
            Guid jobId,
            Guid taskId,
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id ?? Guid.Empty;
            var task = await db.FieldJobTasks
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.JobId == jobId && t.Id == taskId, ct);

            if (task == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Görev adımı bulunamadı."));

            task.IsCompleted = !task.IsCompleted;
            task.CompletedAt = task.IsCompleted ? DateTimeOffset.UtcNow : null;

            await db.SaveChangesAsync(ct);
            return Results.Ok(ApiResponse<FieldJobTask>.Ok(task));
        });

        // 8. Delete Job
        group.MapDelete("/jobs/{id:guid}", async (
            Guid id,
            FieldServiceDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id;
            var job = await db.FieldJobs.FirstOrDefaultAsync(j => j.TenantId == tenantId && j.Id == id, ct);
            if (job == null) return Results.NotFound(ApiResponse<string>.Fail("NOT_FOUND", "Saha servis görevi bulunamadı."));

            db.FieldJobs.Remove(job);
            await db.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<bool>.Ok(true, "Saha servis görevi başarıyla silindi."));
        });

        return app;
    }
}

public record CreateFieldJobRequest(
    string Title,
    string? Description,
    string? ServiceType,
    string? Priority,
    Guid? CustomerId,
    string? CustomerName,
    string? ContactPerson,
    string? ContactPhone,
    string ServiceAddress,
    string? City,
    string? District,
    double? Latitude,
    double? Longitude,
    Guid? AssignedTechnicianId,
    string? AssignedTechnicianName,
    DateOnly? ScheduledDate,
    DateTimeOffset? ScheduledStartTime,
    DateTimeOffset? ScheduledEndTime,
    List<CreateJobTaskDto>? Tasks
);

public record CreateJobTaskDto(string Title, string? Description);
public record UpdateFieldJobStatusRequest(string Status);
public record TechnicianCheckinRequest(Guid TechnicianId, string CheckinType, double? Latitude, double? Longitude, string? DeviceInfo);
public record CompleteFieldJobRequest(string? ResolutionNotes, string? CustomerSignatureData, string? CustomerSignedName, List<CreateJobPartDto>? Parts);
public record CreateJobPartDto(Guid? ProductId, string ProductName, decimal UnitPrice, decimal Quantity);
