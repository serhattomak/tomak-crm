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

namespace CRM.Modules.Attendance.Features.Monitoring;

// 1. Live Monitor
public record LiveEmployeeStatusDto(
    Guid EmployeeId,
    string EmployeeName,
    string? DepartmentName,
    string CurrentState, // Working, OnBreak, Late, Absent, Completed
    DateTimeOffset? ClockInTime,
    int WorkedMinutesSoFar,
    int BreakMinutesSoFar,
    string? ShiftName,
    TimeSpan? ShiftStartTime,
    TimeSpan? ShiftEndTime
);

public record LiveMonitorResponse(
    int TotalEmployees,
    int CurrentlyWorking,
    int CurrentlyOnBreak,
    int LateArrivals,
    int AbsentCount,
    List<LiveEmployeeStatusDto> Employees
);

public record GetLiveMonitorQuery() : IQuery<LiveMonitorResponse>;

public class GetLiveMonitorHandler(AttendanceDbContext dbContext) : IQueryHandler<GetLiveMonitorQuery, LiveMonitorResponse>
{
    public async Task<Result<LiveMonitorResponse>> Handle(GetLiveMonitorQuery request, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Fetch today's records and scheduled shifts
        var records = await dbContext.AttendanceRecords
            .Include(ar => ar.Punches)
            .Include(ar => ar.ShiftSchedule)
                .ThenInclude(ss => ss!.ShiftTemplate)
            .AsNoTracking()
            .Where(ar => ar.Date == today)
            .ToListAsync(cancellationToken);

        var schedules = await dbContext.ShiftSchedules
            .Include(ss => ss.ShiftTemplate)
            .AsNoTracking()
            .Where(ss => ss.Date == today)
            .ToListAsync(cancellationToken);

        var liveEmployees = new List<LiveEmployeeStatusDto>();
        int workingCount = 0;
        int breakCount = 0;
        int lateCount = 0;
        int absentCount = 0;

        // Process active records
        foreach (var r in records)
        {
            var isClockedIn = r.Punches.Any(p => p.PunchType == "ClockIn") && !r.Punches.Any(p => p.PunchType == "ClockOut");
            var lastBreakStart = r.Punches.LastOrDefault(p => p.PunchType == "BreakStart");
            var lastBreakEnd = r.Punches.LastOrDefault(p => p.PunchType == "BreakEnd");
            var isOnBreak = isClockedIn && lastBreakStart != null && (lastBreakEnd == null || lastBreakStart.PunchTime > lastBreakEnd.PunchTime);

            string state = "Completed";
            if (isClockedIn)
            {
                if (isOnBreak)
                {
                    state = "OnBreak";
                    breakCount++;
                }
                else
                {
                    state = r.LateMinutes > 0 ? "Late" : "Working";
                    workingCount++;
                    if (r.LateMinutes > 0) lateCount++;
                }
            }

            liveEmployees.Add(new LiveEmployeeStatusDto(
                r.EmployeeId,
                r.EmployeeName,
                r.DepartmentName,
                state,
                r.FirstClockIn,
                r.TotalWorkedMinutes,
                r.TotalBreakMinutes,
                r.ShiftSchedule?.ShiftTemplate?.Name ?? "Normal Vardiya",
                r.ShiftSchedule?.CustomStartTime ?? r.ShiftSchedule?.ShiftTemplate?.StartTime,
                r.ShiftSchedule?.CustomEndTime ?? r.ShiftSchedule?.ShiftTemplate?.EndTime
            ));
        }

        // Process scheduled employees who have not clocked in yet
        var recordedEmpIds = records.Select(r => r.EmployeeId).ToHashSet();
        foreach (var s in schedules.Where(s => !recordedEmpIds.Contains(s.EmployeeId)))
        {
            absentCount++;
            liveEmployees.Add(new LiveEmployeeStatusDto(
                s.EmployeeId,
                s.EmployeeName,
                s.DepartmentName,
                "Absent",
                null,
                0,
                0,
                s.ShiftTemplate?.Name ?? "Planlanan Vardiya",
                s.CustomStartTime ?? s.ShiftTemplate?.StartTime,
                s.CustomEndTime ?? s.ShiftTemplate?.EndTime
            ));
        }

        return Result<LiveMonitorResponse>.Success(new LiveMonitorResponse(
            liveEmployees.Count,
            workingCount,
            breakCount,
            lateCount,
            absentCount,
            liveEmployees.OrderBy(e => e.EmployeeName).ToList()
        ));
    }
}

// 2. Attendance Records Ledger
public record AttendanceRecordDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    Guid? DepartmentId,
    string? DepartmentName,
    DateOnly Date,
    DateTimeOffset? FirstClockIn,
    DateTimeOffset? LastClockOut,
    int TotalWorkedMinutes,
    int TotalBreakMinutes,
    int ExpectedWorkedMinutes,
    int OvertimeMinutes,
    int HolidayOvertimeMinutes,
    int LateMinutes,
    int EarlyLeaveMinutes,
    string Status,
    bool IsApproved,
    string? ShiftName
);

public record GetAttendanceRecordsQuery(
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    Guid? DepartmentId = null,
    Guid? EmployeeId = null,
    string? Status = null
) : IQuery<List<AttendanceRecordDto>>;

public class GetAttendanceRecordsHandler(AttendanceDbContext dbContext) : IQueryHandler<GetAttendanceRecordsQuery, List<AttendanceRecordDto>>
{
    public async Task<Result<List<AttendanceRecordDto>>> Handle(GetAttendanceRecordsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.AttendanceRecords
            .Include(ar => ar.ShiftSchedule)
                .ThenInclude(ss => ss!.ShiftTemplate)
            .AsNoTracking()
            .AsQueryable();

        if (request.StartDate.HasValue)
            query = query.Where(ar => ar.Date >= request.StartDate.Value);

        if (request.EndDate.HasValue)
            query = query.Where(ar => ar.Date <= request.EndDate.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(ar => ar.DepartmentId == request.DepartmentId.Value);

        if (request.EmployeeId.HasValue)
            query = query.Where(ar => ar.EmployeeId == request.EmployeeId.Value);

        if (!string.IsNullOrWhiteSpace(request.Status))
            query = query.Where(ar => ar.Status == request.Status);

        var list = await query
            .OrderByDescending(ar => ar.Date)
            .ThenBy(ar => ar.EmployeeName)
            .Select(ar => new AttendanceRecordDto(
                ar.Id,
                ar.EmployeeId,
                ar.EmployeeName,
                ar.DepartmentId,
                ar.DepartmentName,
                ar.Date,
                ar.FirstClockIn,
                ar.LastClockOut,
                ar.TotalWorkedMinutes,
                ar.TotalBreakMinutes,
                ar.ExpectedWorkedMinutes,
                ar.OvertimeMinutes,
                ar.HolidayOvertimeMinutes,
                ar.LateMinutes,
                ar.EarlyLeaveMinutes,
                ar.Status,
                ar.IsApproved,
                ar.ShiftSchedule != null && ar.ShiftSchedule.ShiftTemplate != null ? ar.ShiftSchedule.ShiftTemplate.Name : null
            ))
            .ToListAsync(cancellationToken);

        return Result<List<AttendanceRecordDto>>.Success(list);
    }
}

// 3. Correction Requests
public record AttendanceCorrectionRequestDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    DateOnly Date,
    DateTimeOffset? RequestedClockIn,
    DateTimeOffset? RequestedClockOut,
    string Reason,
    string Status,
    DateTime CreatedAt
);

public record SubmitCorrectionCommand(
    Guid EmployeeId,
    string EmployeeName,
    DateOnly Date,
    DateTimeOffset? RequestedClockIn,
    DateTimeOffset? RequestedClockOut,
    string Reason
) : ICommand<AttendanceCorrectionRequestDto>;

public class SubmitCorrectionHandler(
    AttendanceDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<SubmitCorrectionCommand, AttendanceCorrectionRequestDto>
{
    public async Task<Result<AttendanceCorrectionRequestDto>> Handle(SubmitCorrectionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }
        var tenantId = currentTenant.Id.Value;

        var req = new AttendanceCorrectionRequest
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            EmployeeId = request.EmployeeId,
            EmployeeName = request.EmployeeName,
            Date = request.Date,
            RequestedClockIn = request.RequestedClockIn,
            RequestedClockOut = request.RequestedClockOut,
            Reason = request.Reason.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.AttendanceCorrectionRequests.Add(req);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AttendanceCorrectionRequestDto>.Success(new AttendanceCorrectionRequestDto(
            req.Id,
            req.EmployeeId,
            req.EmployeeName,
            req.Date,
            req.RequestedClockIn,
            req.RequestedClockOut,
            req.Reason,
            req.Status,
            req.CreatedAt
        ));
    }
}

public record ReviewCorrectionCommand(
    Guid RequestId,
    bool Approve,
    string? RejectionReason = null
) : ICommand<string>;

public class ReviewCorrectionHandler(
    AttendanceDbContext dbContext,
    IAttendanceEngine engine) : ICommandHandler<ReviewCorrectionCommand, string>
{
    public async Task<Result<string>> Handle(ReviewCorrectionCommand request, CancellationToken cancellationToken)
    {
        var item = await dbContext.AttendanceCorrectionRequests
            .FirstOrDefaultAsync(r => r.Id == request.RequestId, cancellationToken);

        if (item == null)
            return Result.Failure<string>(new Error("Correction.NotFound", "Düzeltme talebi bulunamadı."));

        item.Status = request.Approve ? "Approved" : "Rejected";
        item.RejectionReason = request.RejectionReason;
        item.ReviewedAt = DateTime.UtcNow;
        item.UpdatedAt = DateTime.UtcNow;

        if (request.Approve)
        {
            // Update or create AttendanceRecord
            var record = await dbContext.AttendanceRecords
                .Include(ar => ar.Punches)
                .Include(ar => ar.ShiftSchedule)
                    .ThenInclude(ss => ss!.ShiftTemplate)
                .FirstOrDefaultAsync(ar => ar.EmployeeId == item.EmployeeId && ar.Date == item.Date, cancellationToken);

            if (record == null)
            {
                record = new AttendanceRecord
                {
                    Id = Guid.NewGuid(),
                    TenantId = item.TenantId,
                    EmployeeId = item.EmployeeId,
                    EmployeeName = item.EmployeeName,
                    Date = item.Date,
                    FirstClockIn = item.RequestedClockIn,
                    LastClockOut = item.RequestedClockOut,
                    IsApproved = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                dbContext.AttendanceRecords.Add(record);
            }
            else
            {
                if (item.RequestedClockIn.HasValue) record.FirstClockIn = item.RequestedClockIn;
                if (item.RequestedClockOut.HasValue) record.LastClockOut = item.RequestedClockOut;
                record.IsApproved = true;
            }

            engine.RecalculateRecord(record, record.ShiftSchedule, record.Punches.ToList());
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<string>.Success(request.Approve ? "Düzeltme onaylandı ve kayıt güncellendi." : "Talep reddedildi.");
    }
}

public class MonitoringEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/attendance").WithTags("Attendance - Monitoring & Records");

        group.MapGet("/live-monitor", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetLiveMonitorQuery(), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<LiveMonitorResponse>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<LiveMonitorResponse>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.View");

        group.MapGet("/records", async (DateOnly? startDate, DateOnly? endDate, Guid? departmentId, Guid? employeeId, string? status, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetAttendanceRecordsQuery(startDate, endDate, departmentId, employeeId, status), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<AttendanceRecordDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<AttendanceRecordDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.View");

        group.MapPost("/corrections", async (SubmitCorrectionCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<AttendanceCorrectionRequestDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<AttendanceCorrectionRequestDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.Punch");

        group.MapPost("/corrections/{id:guid}/review", async (Guid id, bool approve, string? rejectionReason, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new ReviewCorrectionCommand(id, approve, rejectionReason), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<string>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<string>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.Manage");
    }
}
