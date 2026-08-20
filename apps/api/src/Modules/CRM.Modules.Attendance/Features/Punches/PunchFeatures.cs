using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Attendance.Data;
using CRM.Modules.Attendance.Entities;
using CRM.Modules.Attendance.Services;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Attendance.Features.Punches;

public record PunchDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    DateTimeOffset PunchTime,
    string PunchType,
    string? BreakType,
    string Source,
    bool IsWithinGeofence
);

public record TodayStatusDto(
    Guid EmployeeId,
    string EmployeeName,
    DateOnly Date,
    bool IsClockedIn,
    bool IsOnBreak,
    DateTimeOffset? ClockInTime,
    DateTimeOffset? LastBreakStartTime,
    int TotalWorkedMinutesToday,
    int TotalBreakMinutesToday,
    string CurrentStatus,
    string? ShiftName,
    TimeSpan? ShiftStartTime,
    TimeSpan? ShiftEndTime
);

public record PunchAttendanceCommand(
    Guid EmployeeId,
    string EmployeeName,
    string PunchType, // ClockIn, ClockOut, BreakStart, BreakEnd
    string? BreakType = null, // Lunch, Coffee, Personal
    string Source = "Web",
    double? Latitude = null,
    double? Longitude = null,
    string? IpAddress = null,
    string? Note = null
) : ICommand<TodayStatusDto>;

public class PunchAttendanceValidator : AbstractValidator<PunchAttendanceCommand>
{
    public PunchAttendanceValidator()
    {
        RuleFor(x => x.EmployeeId).NotEmpty();
        RuleFor(x => x.PunchType).Must(p => p is "ClockIn" or "ClockOut" or "BreakStart" or "BreakEnd")
            .WithMessage("Geçersiz okutma türü.");
    }
}

public class PunchAttendanceHandler(
    AttendanceDbContext dbContext,
    ICurrentTenant currentTenant,
    IAttendanceEngine engine) : ICommandHandler<PunchAttendanceCommand, TodayStatusDto>
{
    public async Task<Result<TodayStatusDto>> Handle(PunchAttendanceCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }
        var tenantId = currentTenant.Id.Value;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var now = DateTimeOffset.UtcNow;

        // 1. Get or create today's AttendanceRecord
        var record = await dbContext.AttendanceRecords
            .Include(ar => ar.Punches)
            .Include(ar => ar.ShiftSchedule)
                .ThenInclude(ss => ss!.ShiftTemplate)
            .FirstOrDefaultAsync(ar => ar.EmployeeId == request.EmployeeId && ar.Date == today, cancellationToken);

        if (record == null)
        {
            // Find if there is an assigned shift schedule today
            var schedule = await dbContext.ShiftSchedules
                .Include(ss => ss.ShiftTemplate)
                .FirstOrDefaultAsync(ss => ss.EmployeeId == request.EmployeeId && ss.Date == today, cancellationToken);

            record = new AttendanceRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EmployeeId = request.EmployeeId,
                EmployeeName = request.EmployeeName,
                DepartmentId = schedule?.DepartmentId,
                DepartmentName = schedule?.DepartmentName,
                Date = today,
                ShiftScheduleId = schedule?.Id,
                ShiftSchedule = schedule,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            dbContext.AttendanceRecords.Add(record);
        }

        // 2. Add punch log
        var punch = new AttendancePunch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AttendanceRecordId = record.Id,
            EmployeeId = request.EmployeeId,
            EmployeeName = request.EmployeeName,
            PunchTime = now,
            PunchType = request.PunchType,
            BreakType = request.BreakType,
            Source = request.Source,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IpAddress = request.IpAddress,
            IsWithinGeofence = true,
            VerificationMethod = request.Source,
            Note = request.Note,
            CreatedAt = DateTime.UtcNow
        };
        dbContext.AttendancePunches.Add(punch);
        record.Punches.Add(punch);

        // 3. Recalculate record metrics
        engine.RecalculateRecord(record, record.ShiftSchedule, record.Punches.ToList());
        record.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        // 4. Formulate today status
        var isClockedIn = record.Punches.Any(p => p.PunchType == "ClockIn") && !record.Punches.Any(p => p.PunchType == "ClockOut");
        var lastBreakStart = record.Punches.LastOrDefault(p => p.PunchType == "BreakStart");
        var lastBreakEnd = record.Punches.LastOrDefault(p => p.PunchType == "BreakEnd");
        var isOnBreak = isClockedIn && lastBreakStart != null && (lastBreakEnd == null || lastBreakStart.PunchTime > lastBreakEnd.PunchTime);

        return Result<TodayStatusDto>.Success(new TodayStatusDto(
            record.EmployeeId,
            record.EmployeeName,
            record.Date,
            isClockedIn,
            isOnBreak,
            record.FirstClockIn,
            isOnBreak ? lastBreakStart?.PunchTime : null,
            record.TotalWorkedMinutes,
            record.TotalBreakMinutes,
            record.Status,
            record.ShiftSchedule?.ShiftTemplate?.Name,
            record.ShiftSchedule?.CustomStartTime ?? record.ShiftSchedule?.ShiftTemplate?.StartTime,
            record.ShiftSchedule?.CustomEndTime ?? record.ShiftSchedule?.ShiftTemplate?.EndTime
        ));
    }
}

public record GetTodayStatusQuery(Guid EmployeeId) : IQuery<TodayStatusDto>;

public class GetTodayStatusHandler(AttendanceDbContext dbContext) : IQueryHandler<GetTodayStatusQuery, TodayStatusDto>
{
    public async Task<Result<TodayStatusDto>> Handle(GetTodayStatusQuery request, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var record = await dbContext.AttendanceRecords
            .Include(ar => ar.Punches)
            .Include(ar => ar.ShiftSchedule)
                .ThenInclude(ss => ss!.ShiftTemplate)
            .AsNoTracking()
            .FirstOrDefaultAsync(ar => ar.EmployeeId == request.EmployeeId && ar.Date == today, cancellationToken);

        if (record == null)
        {
            var schedule = await dbContext.ShiftSchedules
                .Include(ss => ss.ShiftTemplate)
                .AsNoTracking()
                .FirstOrDefaultAsync(ss => ss.EmployeeId == request.EmployeeId && ss.Date == today, cancellationToken);

            return Result<TodayStatusDto>.Success(new TodayStatusDto(
                request.EmployeeId,
                "",
                today,
                false,
                false,
                null,
                null,
                0,
                0,
                "NotStarted",
                schedule?.ShiftTemplate?.Name,
                schedule?.CustomStartTime ?? schedule?.ShiftTemplate?.StartTime,
                schedule?.CustomEndTime ?? schedule?.ShiftTemplate?.EndTime
            ));
        }

        var isClockedIn = record.Punches.Any(p => p.PunchType == "ClockIn") && !record.Punches.Any(p => p.PunchType == "ClockOut");
        var lastBreakStart = record.Punches.LastOrDefault(p => p.PunchType == "BreakStart");
        var lastBreakEnd = record.Punches.LastOrDefault(p => p.PunchType == "BreakEnd");
        var isOnBreak = isClockedIn && lastBreakStart != null && (lastBreakEnd == null || lastBreakStart.PunchTime > lastBreakEnd.PunchTime);

        return Result<TodayStatusDto>.Success(new TodayStatusDto(
            record.EmployeeId,
            record.EmployeeName,
            record.Date,
            isClockedIn,
            isOnBreak,
            record.FirstClockIn,
            isOnBreak ? lastBreakStart?.PunchTime : null,
            record.TotalWorkedMinutes,
            record.TotalBreakMinutes,
            record.Status,
            record.ShiftSchedule?.ShiftTemplate?.Name,
            record.ShiftSchedule?.CustomStartTime ?? record.ShiftSchedule?.ShiftTemplate?.StartTime,
            record.ShiftSchedule?.CustomEndTime ?? record.ShiftSchedule?.ShiftTemplate?.EndTime
        ));
    }
}

public class PunchEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/attendance").WithTags("Attendance - Punch");

        group.MapPost("/punch", async (PunchAttendanceCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<TodayStatusDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<TodayStatusDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.Punch");

        group.MapGet("/today/status", async (Guid employeeId, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetTodayStatusQuery(employeeId), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<TodayStatusDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<TodayStatusDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.View");
    }
}
