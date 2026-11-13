using System.Text;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Activities.Data;
using CRM.Modules.Activities.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Activities.Features;

public record ActivityDto(
    Guid Id,
    Guid TenantId,
    string Title,
    string? Description,
    string Type,
    string Status,
    string Priority,
    DateTime? StartTime,
    DateTime? EndTime,
    bool IsAllDay,
    DateTime? DueDate,
    DateTime? CompletedAt,
    string? Location,
    string? MeetingLink,
    string? CallDirection,
    string? CallOutcome,
    int? CallDurationMinutes,
    string? OutcomeNotes,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId,
    string? DealTitle,
    Guid? AssignedUserId,
    string? AssignedUserName,
    Guid? CreatedByUserId,
    string? CreatedByUserName,
    int? ReminderMinutesBefore,
    string? AttendeesJson,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateActivityRequest(
    string Title,
    string? Description = null,
    string? Type = "Meeting",
    string? Status = "Scheduled",
    string? Priority = "Medium",
    DateTime? StartTime = null,
    DateTime? EndTime = null,
    bool IsAllDay = false,
    DateTime? DueDate = null,
    string? Location = null,
    string? MeetingLink = null,
    string? CallDirection = null,
    string? CallOutcome = null,
    int? CallDurationMinutes = null,
    string? OutcomeNotes = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    Guid? DealId = null,
    string? DealTitle = null,
    Guid? AssignedUserId = null,
    string? AssignedUserName = null,
    int? ReminderMinutesBefore = null,
    string? AttendeesJson = null);

public record CreateActivityCommand(
    string Title,
    string? Description,
    string Type,
    string Status,
    string Priority,
    DateTime? StartTime,
    DateTime? EndTime,
    bool IsAllDay,
    DateTime? DueDate,
    string? Location,
    string? MeetingLink,
    string? CallDirection,
    string? CallOutcome,
    int? CallDurationMinutes,
    string? OutcomeNotes,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId,
    string? DealTitle,
    Guid? AssignedUserId,
    string? AssignedUserName,
    int? ReminderMinutesBefore,
    string? AttendeesJson) : ICommand<Guid>;

public record UpdateActivityRequest(
    string Title,
    string? Description = null,
    string? Type = "Meeting",
    string? Status = "Scheduled",
    string? Priority = "Medium",
    DateTime? StartTime = null,
    DateTime? EndTime = null,
    bool IsAllDay = false,
    DateTime? DueDate = null,
    string? Location = null,
    string? MeetingLink = null,
    string? CallDirection = null,
    string? CallOutcome = null,
    int? CallDurationMinutes = null,
    string? OutcomeNotes = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    Guid? DealId = null,
    string? DealTitle = null,
    Guid? AssignedUserId = null,
    string? AssignedUserName = null,
    int? ReminderMinutesBefore = null,
    string? AttendeesJson = null);

public record UpdateActivityCommand(
    Guid Id,
    string Title,
    string? Description,
    string Type,
    string Status,
    string Priority,
    DateTime? StartTime,
    DateTime? EndTime,
    bool IsAllDay,
    DateTime? DueDate,
    string? Location,
    string? MeetingLink,
    string? CallDirection,
    string? CallOutcome,
    int? CallDurationMinutes,
    string? OutcomeNotes,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId,
    string? DealTitle,
    Guid? AssignedUserId,
    string? AssignedUserName,
    int? ReminderMinutesBefore,
    string? AttendeesJson) : ICommand<bool>;

public record CompleteActivityRequest(
    string? OutcomeNotes = null,
    string? CallOutcome = null,
    int? CallDurationMinutes = null,
    CreateActivityRequest? FollowUpActivity = null);

public record CompleteActivityCommand(
    Guid Id,
    string? OutcomeNotes,
    string? CallOutcome,
    int? CallDurationMinutes,
    CreateActivityRequest? FollowUpActivity) : ICommand<Guid?>;

public record DeleteActivityCommand(Guid Id) : ICommand<bool>;

public record GetActivitiesQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    string? Type = null,
    string? Status = null,
    Guid? CustomerId = null,
    Guid? AssignedUserId = null,
    string? Search = null) : IQuery<List<ActivityDto>>;

public record GetActivityByIdQuery(Guid Id) : IQuery<ActivityDto>;

// Handlers
public class GetActivitiesHandler(ActivitiesDbContext db)
    : IQueryHandler<GetActivitiesQuery, List<ActivityDto>>
{
    public async Task<Result<List<ActivityDto>>> Handle(GetActivitiesQuery query, CancellationToken ct)
    {
        var q = db.Activities.AsNoTracking().AsQueryable();

        if (query.StartDate.HasValue)
        {
            var startUtc = DateTime.SpecifyKind(query.StartDate.Value, DateTimeKind.Utc);
            q = q.Where(a => a.StartTime >= startUtc || a.DueDate >= startUtc);
        }

        if (query.EndDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(query.EndDate.Value, DateTimeKind.Utc);
            q = q.Where(a => a.StartTime <= endUtc || a.DueDate <= endUtc);
        }

        if (!string.IsNullOrWhiteSpace(query.Type) && query.Type != "All")
        {
            q = q.Where(a => a.Type == query.Type);
        }

        if (!string.IsNullOrWhiteSpace(query.Status) && query.Status != "All")
        {
            q = q.Where(a => a.Status == query.Status);
        }

        if (query.CustomerId.HasValue)
        {
            q = q.Where(a => a.CustomerId == query.CustomerId.Value);
        }

        if (query.AssignedUserId.HasValue)
        {
            q = q.Where(a => a.AssignedUserId == query.AssignedUserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(a =>
                a.Title.ToLower().Contains(search) ||
                (a.CustomerName != null && a.CustomerName.ToLower().Contains(search)) ||
                (a.Description != null && a.Description.ToLower().Contains(search)) ||
                (a.AssignedUserName != null && a.AssignedUserName.ToLower().Contains(search)));
        }

        var list = await q
            .OrderBy(a => a.StartTime ?? a.DueDate ?? a.CreatedAt)
            .Select(a => new ActivityDto(
                a.Id,
                a.TenantId,
                a.Title,
                a.Description,
                a.Type,
                a.Status,
                a.Priority,
                a.StartTime,
                a.EndTime,
                a.IsAllDay,
                a.DueDate,
                a.CompletedAt,
                a.Location,
                a.MeetingLink,
                a.CallDirection,
                a.CallOutcome,
                a.CallDurationMinutes,
                a.OutcomeNotes,
                a.CustomerId,
                a.CustomerName,
                a.DealId,
                a.DealTitle,
                a.AssignedUserId,
                a.AssignedUserName,
                a.CreatedByUserId,
                a.CreatedByUserName,
                a.ReminderMinutesBefore,
                a.AttendeesJson,
                a.CreatedAt,
                a.UpdatedAt))
            .ToListAsync(ct);

        return Result<List<ActivityDto>>.Success(list);
    }
}

public class GetActivityByIdHandler(ActivitiesDbContext db)
    : IQueryHandler<GetActivityByIdQuery, ActivityDto>
{
    public async Task<Result<ActivityDto>> Handle(GetActivityByIdQuery query, CancellationToken ct)
    {
        var a = await db.Activities.AsNoTracking().FirstOrDefaultAsync(x => x.Id == query.Id, ct);
        if (a == null)
        {
            throw new NotFoundException($"Activity {query.Id} not found.");
        }

        var dto = new ActivityDto(
            a.Id,
            a.TenantId,
            a.Title,
            a.Description,
            a.Type,
            a.Status,
            a.Priority,
            a.StartTime,
            a.EndTime,
            a.IsAllDay,
            a.DueDate,
            a.CompletedAt,
            a.Location,
            a.MeetingLink,
            a.CallDirection,
            a.CallOutcome,
            a.CallDurationMinutes,
            a.OutcomeNotes,
            a.CustomerId,
            a.CustomerName,
            a.DealId,
            a.DealTitle,
            a.AssignedUserId,
            a.AssignedUserName,
            a.CreatedByUserId,
            a.CreatedByUserName,
            a.ReminderMinutesBefore,
            a.AttendeesJson,
            a.CreatedAt,
            a.UpdatedAt);

        return Result<ActivityDto>.Success(dto);
    }
}

public class CreateActivityHandler(ActivitiesDbContext db, ICurrentTenant tenant)
    : ICommandHandler<CreateActivityCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateActivityCommand cmd, CancellationToken ct)
    {
        var activity = new Activity
        {
            TenantId = tenant.Id ?? Guid.Empty,
            Title = cmd.Title,
            Description = cmd.Description,
            Type = cmd.Type,
            Status = cmd.Status,
            Priority = cmd.Priority,
            StartTime = cmd.StartTime.HasValue ? DateTime.SpecifyKind(cmd.StartTime.Value, DateTimeKind.Utc) : null,
            EndTime = cmd.EndTime.HasValue ? DateTime.SpecifyKind(cmd.EndTime.Value, DateTimeKind.Utc) : null,
            IsAllDay = cmd.IsAllDay,
            DueDate = cmd.DueDate.HasValue ? DateTime.SpecifyKind(cmd.DueDate.Value, DateTimeKind.Utc) : null,
            Location = cmd.Location,
            MeetingLink = cmd.MeetingLink,
            CallDirection = cmd.CallDirection,
            CallOutcome = cmd.CallOutcome,
            CallDurationMinutes = cmd.CallDurationMinutes,
            OutcomeNotes = cmd.OutcomeNotes,
            CustomerId = cmd.CustomerId,
            CustomerName = cmd.CustomerName,
            DealId = cmd.DealId,
            DealTitle = cmd.DealTitle,
            AssignedUserId = cmd.AssignedUserId,
            AssignedUserName = cmd.AssignedUserName,
            ReminderMinutesBefore = cmd.ReminderMinutesBefore,
            AttendeesJson = cmd.AttendeesJson,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Activities.Add(activity);
        await db.SaveChangesAsync(ct);

        return Result<Guid>.Success(activity.Id);
    }
}

public class UpdateActivityHandler(ActivitiesDbContext db)
    : ICommandHandler<UpdateActivityCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateActivityCommand cmd, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(x => x.Id == cmd.Id, ct);
        if (activity == null)
        {
            throw new NotFoundException($"Activity {cmd.Id} not found.");
        }

        activity.Title = cmd.Title;
        activity.Description = cmd.Description;
        activity.Type = cmd.Type;
        activity.Status = cmd.Status;
        activity.Priority = cmd.Priority;
        activity.StartTime = cmd.StartTime.HasValue ? DateTime.SpecifyKind(cmd.StartTime.Value, DateTimeKind.Utc) : null;
        activity.EndTime = cmd.EndTime.HasValue ? DateTime.SpecifyKind(cmd.EndTime.Value, DateTimeKind.Utc) : null;
        activity.IsAllDay = cmd.IsAllDay;
        activity.DueDate = cmd.DueDate.HasValue ? DateTime.SpecifyKind(cmd.DueDate.Value, DateTimeKind.Utc) : null;
        activity.Location = cmd.Location;
        activity.MeetingLink = cmd.MeetingLink;
        activity.CallDirection = cmd.CallDirection;
        activity.CallOutcome = cmd.CallOutcome;
        activity.CallDurationMinutes = cmd.CallDurationMinutes;
        activity.OutcomeNotes = cmd.OutcomeNotes;
        activity.CustomerId = cmd.CustomerId;
        activity.CustomerName = cmd.CustomerName;
        activity.DealId = cmd.DealId;
        activity.DealTitle = cmd.DealTitle;
        activity.AssignedUserId = cmd.AssignedUserId;
        activity.AssignedUserName = cmd.AssignedUserName;
        activity.ReminderMinutesBefore = cmd.ReminderMinutesBefore;
        activity.AttendeesJson = cmd.AttendeesJson;
        activity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }
}

public class CompleteActivityHandler(ActivitiesDbContext db, ICurrentTenant tenant)
    : ICommandHandler<CompleteActivityCommand, Guid?>
{
    public async Task<Result<Guid?>> Handle(CompleteActivityCommand cmd, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(x => x.Id == cmd.Id, ct);
        if (activity == null)
        {
            throw new NotFoundException($"Activity {cmd.Id} not found.");
        }

        activity.Status = "Completed";
        activity.CompletedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(cmd.OutcomeNotes))
        {
            activity.OutcomeNotes = cmd.OutcomeNotes;
        }
        if (!string.IsNullOrWhiteSpace(cmd.CallOutcome))
        {
            activity.CallOutcome = cmd.CallOutcome;
        }
        if (cmd.CallDurationMinutes.HasValue)
        {
            activity.CallDurationMinutes = cmd.CallDurationMinutes;
        }
        activity.UpdatedAt = DateTime.UtcNow;

        Guid? followUpId = null;
        if (cmd.FollowUpActivity != null)
        {
            var req = cmd.FollowUpActivity;
            var followUp = new Activity
            {
                TenantId = tenant.Id ?? Guid.Empty,
                Title = req.Title,
                Description = req.Description,
                Type = req.Type ?? "Meeting",
                Status = req.Status ?? "Scheduled",
                Priority = req.Priority ?? "Medium",
                StartTime = req.StartTime.HasValue ? DateTime.SpecifyKind(req.StartTime.Value, DateTimeKind.Utc) : null,
                EndTime = req.EndTime.HasValue ? DateTime.SpecifyKind(req.EndTime.Value, DateTimeKind.Utc) : null,
                IsAllDay = req.IsAllDay,
                DueDate = req.DueDate.HasValue ? DateTime.SpecifyKind(req.DueDate.Value, DateTimeKind.Utc) : null,
                Location = req.Location,
                MeetingLink = req.MeetingLink,
                CallDirection = req.CallDirection,
                CustomerId = req.CustomerId ?? activity.CustomerId,
                CustomerName = req.CustomerName ?? activity.CustomerName,
                DealId = req.DealId ?? activity.DealId,
                DealTitle = req.DealTitle ?? activity.DealTitle,
                AssignedUserId = req.AssignedUserId ?? activity.AssignedUserId,
                AssignedUserName = req.AssignedUserName ?? activity.AssignedUserName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Activities.Add(followUp);
            followUpId = followUp.Id;
        }

        await db.SaveChangesAsync(ct);
        return Result<Guid?>.Success(followUpId);
    }
}

public class DeleteActivityHandler(ActivitiesDbContext db)
    : ICommandHandler<DeleteActivityCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteActivityCommand cmd, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(x => x.Id == cmd.Id, ct);
        if (activity == null)
        {
            throw new NotFoundException($"Activity {cmd.Id} not found.");
        }

        db.Activities.Remove(activity);
        await db.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }
}

// Endpoints
public class ActivityEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/activities")
            .WithTags("Activities");

        group.MapGet("/", async (
            DateTime? startDate,
            DateTime? endDate,
            string? type,
            string? status,
            Guid? customerId,
            Guid? assignedUserId,
            string? search,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetActivitiesQuery(startDate, endDate, type, status, customerId, assignedUserId, search);
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<List<ActivityDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Activities.View")
        .WithName("GetActivities");

        group.MapGet("/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetActivityByIdQuery(id), ct);
            return Results.Ok(ApiResponse<ActivityDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Activities.View")
        .WithName("GetActivityById");

        group.MapPost("/", async (
            CreateActivityRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var cmd = new CreateActivityCommand(
                request.Title,
                request.Description,
                request.Type ?? "Meeting",
                request.Status ?? "Scheduled",
                request.Priority ?? "Medium",
                request.StartTime,
                request.EndTime,
                request.IsAllDay,
                request.DueDate,
                request.Location,
                request.MeetingLink,
                request.CallDirection,
                request.CallOutcome,
                request.CallDurationMinutes,
                request.OutcomeNotes,
                request.CustomerId,
                request.CustomerName,
                request.DealId,
                request.DealTitle,
                request.AssignedUserId,
                request.AssignedUserName,
                request.ReminderMinutesBefore,
                request.AttendeesJson);

            var result = await sender.Send(cmd, ct);
            return Results.Created($"/api/activities/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Activities.Create")
        .WithName("CreateActivity");

        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdateActivityRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var cmd = new UpdateActivityCommand(
                id,
                request.Title,
                request.Description,
                request.Type ?? "Meeting",
                request.Status ?? "Scheduled",
                request.Priority ?? "Medium",
                request.StartTime,
                request.EndTime,
                request.IsAllDay,
                request.DueDate,
                request.Location,
                request.MeetingLink,
                request.CallDirection,
                request.CallOutcome,
                request.CallDurationMinutes,
                request.OutcomeNotes,
                request.CustomerId,
                request.CustomerName,
                request.DealId,
                request.DealTitle,
                request.AssignedUserId,
                request.AssignedUserName,
                request.ReminderMinutesBefore,
                request.AttendeesJson);

            var result = await sender.Send(cmd, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Activities.Manage")
        .WithName("UpdateActivity");

        group.MapPost("/{id:guid}/complete", async (
            Guid id,
            CompleteActivityRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var cmd = new CompleteActivityCommand(
                id,
                request.OutcomeNotes,
                request.CallOutcome,
                request.CallDurationMinutes,
                request.FollowUpActivity);

            var result = await sender.Send(cmd, ct);
            return Results.Ok(ApiResponse<Guid?>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Activities.Manage")
        .WithName("CompleteActivity");

        group.MapDelete("/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteActivityCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Activities.Delete")
        .WithName("DeleteActivity");

        // Single RFC 5545 .ics download
        group.MapGet("/{id:guid}/ics", async (
            Guid id,
            ActivitiesDbContext db,
            CancellationToken ct) =>
        {
            var a = await db.Activities.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (a == null) return Results.NotFound();

            var start = (a.StartTime ?? a.DueDate ?? a.CreatedAt).ToUniversalTime();
            var end = (a.EndTime ?? start.AddHours(1)).ToUniversalTime();

            var sb = new StringBuilder();
            sb.AppendLine("BEGIN:VCALENDAR");
            sb.AppendLine("VERSION:2.0");
            sb.AppendLine("PRODID:-//Antigravity CRM//Activities//TR");
            sb.AppendLine("CALSCALE:GREGORIAN");
            sb.AppendLine("METHOD:PUBLISH");
            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"UID:{a.Id}@crm");
            sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
            sb.AppendLine($"DTSTART:{start:yyyyMMddTHHmmssZ}");
            sb.AppendLine($"DTEND:{end:yyyyMMddTHHmmssZ}");
            sb.AppendLine($"SUMMARY:{EscapeIcs(a.Title)}");
            if (!string.IsNullOrWhiteSpace(a.Description))
                sb.AppendLine($"DESCRIPTION:{EscapeIcs(a.Description)}");
            if (!string.IsNullOrWhiteSpace(a.Location))
                sb.AppendLine($"LOCATION:{EscapeIcs(a.Location)}");
            if (!string.IsNullOrWhiteSpace(a.MeetingLink))
                sb.AppendLine($"URL:{a.MeetingLink}");
            sb.AppendLine("STATUS:CONFIRMED");
            sb.AppendLine("END:VEVENT");
            sb.AppendLine("END:VCALENDAR");

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return Results.File(bytes, "text/calendar", $"{SanitizeFileName(a.Title)}.ics");
        })
        .RequireAuthorization()
        .RequirePermission("Activities.View")
        .WithName("ExportActivityIcs");

        // Live Calendar Feed (.ics)
        group.MapGet("/calendar/feed.ics", async (
            ActivitiesDbContext db,
            CancellationToken ct) =>
        {
            var activities = await db.Activities
                .AsNoTracking()
                .Where(a => a.Status != "Cancelled")
                .OrderBy(a => a.StartTime ?? a.DueDate)
                .Take(250)
                .ToListAsync(ct);

            var sb = new StringBuilder();
            sb.AppendLine("BEGIN:VCALENDAR");
            sb.AppendLine("VERSION:2.0");
            sb.AppendLine("PRODID:-//Antigravity CRM//Activities Feed//TR");
            sb.AppendLine("X-WR-CALNAME:CRM Aktiviteleri");
            sb.AppendLine("CALSCALE:GREGORIAN");
            sb.AppendLine("METHOD:PUBLISH");

            foreach (var a in activities)
            {
                var start = (a.StartTime ?? a.DueDate ?? a.CreatedAt).ToUniversalTime();
                var end = (a.EndTime ?? start.AddHours(1)).ToUniversalTime();

                sb.AppendLine("BEGIN:VEVENT");
                sb.AppendLine($"UID:{a.Id}@crm");
                sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
                sb.AppendLine($"DTSTART:{start:yyyyMMddTHHmmssZ}");
                sb.AppendLine($"DTEND:{end:yyyyMMddTHHmmssZ}");
                sb.AppendLine($"SUMMARY:{EscapeIcs(a.Title)}");
                if (!string.IsNullOrWhiteSpace(a.Description))
                    sb.AppendLine($"DESCRIPTION:{EscapeIcs(a.Description)}");
                if (!string.IsNullOrWhiteSpace(a.Location))
                    sb.AppendLine($"LOCATION:{EscapeIcs(a.Location)}");
                if (!string.IsNullOrWhiteSpace(a.MeetingLink))
                    sb.AppendLine($"URL:{a.MeetingLink}");
                sb.AppendLine($"STATUS:{(a.Status == "Completed" ? "COMPLETED" : "CONFIRMED")}");
                sb.AppendLine("END:VEVENT");
            }

            sb.AppendLine("END:VCALENDAR");
            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return Results.File(bytes, "text/calendar; charset=utf-8");
        })
        .RequireAuthorization()
        .RequirePermission("Activities.View")
        .WithName("GetCalendarFeed");
    }

    private static string EscapeIcs(string text)
    {
        return text
            .Replace(@"\", @"\\")
            .Replace(";", @"\;")
            .Replace(",", @"\,")
            .Replace("\r\n", @"\n")
            .Replace("\n", @"\n");
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return new string(name.Where(c => !invalid.Contains(c)).ToArray()).Trim();
    }
}
