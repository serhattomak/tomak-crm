using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Attendance.Data;
using CRM.Modules.Attendance.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Attendance.Features.Shifts;

// 1. Shift Template DTOs & Endpoints
public record ShiftTemplateDto(
    Guid Id,
    string Name,
    string Code,
    string ColorHex,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int BreakDurationMinutes,
    int GracePeriodMinutes,
    bool IsNightShift,
    bool IsFlexible,
    int MinWorkingHours,
    bool IsActive
);

public record CreateShiftTemplateCommand(
    string Name,
    string Code,
    string ColorHex,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int BreakDurationMinutes = 60,
    int GracePeriodMinutes = 15,
    bool IsNightShift = false,
    bool IsFlexible = false,
    int MinWorkingHours = 8
) : ICommand<ShiftTemplateDto>;

public class CreateShiftTemplateValidator : AbstractValidator<CreateShiftTemplateCommand>
{
    public CreateShiftTemplateValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
    }
}

public class CreateShiftTemplateHandler(
    AttendanceDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateShiftTemplateCommand, ShiftTemplateDto>
{
    public async Task<Result<ShiftTemplateDto>> Handle(CreateShiftTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }
        var tenantId = currentTenant.Id.Value;

        var template = new ShiftTemplate
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Code = request.Code.Trim().ToUpperInvariant(),
            ColorHex = request.ColorHex?.Trim() ?? "#3B82F6",
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            BreakDurationMinutes = request.BreakDurationMinutes,
            GracePeriodMinutes = request.GracePeriodMinutes,
            IsNightShift = request.IsNightShift,
            IsFlexible = request.IsFlexible,
            MinWorkingHours = request.MinWorkingHours,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.ShiftTemplates.Add(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ShiftTemplateDto>.Success(new ShiftTemplateDto(
            template.Id,
            template.Name,
            template.Code,
            template.ColorHex,
            template.StartTime,
            template.EndTime,
            template.BreakDurationMinutes,
            template.GracePeriodMinutes,
            template.IsNightShift,
            template.IsFlexible,
            template.MinWorkingHours,
            template.IsActive
        ));
    }
}

public record GetShiftTemplatesQuery() : IQuery<List<ShiftTemplateDto>>;

public class GetShiftTemplatesHandler(AttendanceDbContext dbContext) : IQueryHandler<GetShiftTemplatesQuery, List<ShiftTemplateDto>>
{
    public async Task<Result<List<ShiftTemplateDto>>> Handle(GetShiftTemplatesQuery request, CancellationToken cancellationToken)
    {
        var list = await dbContext.ShiftTemplates
            .AsNoTracking()
            .OrderBy(st => st.StartTime)
            .Select(st => new ShiftTemplateDto(
                st.Id,
                st.Name,
                st.Code,
                st.ColorHex,
                st.StartTime,
                st.EndTime,
                st.BreakDurationMinutes,
                st.GracePeriodMinutes,
                st.IsNightShift,
                st.IsFlexible,
                st.MinWorkingHours,
                st.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<List<ShiftTemplateDto>>.Success(list);
    }
}

// 2. Shift Schedule / Assignment DTOs & Endpoints
public record ShiftScheduleDto(
    Guid Id,
    Guid ShiftTemplateId,
    string ShiftName,
    string ShiftCode,
    string ShiftColorHex,
    TimeSpan StartTime,
    TimeSpan EndTime,
    Guid EmployeeId,
    string EmployeeName,
    Guid? DepartmentId,
    string? DepartmentName,
    DateOnly Date,
    string Status,
    string? Notes
);

public record AssignShiftsCommand(
    Guid ShiftTemplateId,
    List<Guid> EmployeeIds,
    List<string> EmployeeNames,
    Guid? DepartmentId,
    string? DepartmentName,
    DateOnly StartDate,
    DateOnly EndDate,
    List<DayOfWeek>? RepeatOnDays = null,
    string? Notes = null
) : ICommand<int>;

public class AssignShiftsHandler(
    AttendanceDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<AssignShiftsCommand, int>
{
    public async Task<Result<int>> Handle(AssignShiftsCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }
        var tenantId = currentTenant.Id.Value;

        var template = await dbContext.ShiftTemplates.FirstOrDefaultAsync(st => st.Id == request.ShiftTemplateId, cancellationToken);
        if (template == null)
        {
            return Result.Failure<int>(new Error("Shift.NotFound", "Vardiya şablonu bulunamadı."));
        }

        var newSchedules = new List<ShiftSchedule>();
        var repeatDays = request.RepeatOnDays?.ToHashSet() ?? Enum.GetValues<DayOfWeek>().ToHashSet();

        for (var dt = request.StartDate; dt <= request.EndDate; dt = dt.AddDays(1))
        {
            if (!repeatDays.Contains(dt.DayOfWeek))
                continue;

            for (int i = 0; i < request.EmployeeIds.Count; i++)
            {
                var empId = request.EmployeeIds[i];
                var empName = i < request.EmployeeNames.Count ? request.EmployeeNames[i] : "Personel";

                newSchedules.Add(new ShiftSchedule
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ShiftTemplateId = template.Id,
                    EmployeeId = empId,
                    EmployeeName = empName,
                    DepartmentId = request.DepartmentId,
                    DepartmentName = request.DepartmentName,
                    Date = dt,
                    Status = "Scheduled",
                    Notes = request.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        dbContext.ShiftSchedules.AddRange(newSchedules);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(newSchedules.Count);
    }
}

public record GetShiftCalendarQuery(
    DateOnly StartDate,
    DateOnly EndDate,
    Guid? DepartmentId = null,
    Guid? EmployeeId = null
) : IQuery<List<ShiftScheduleDto>>;

public class GetShiftCalendarHandler(AttendanceDbContext dbContext) : IQueryHandler<GetShiftCalendarQuery, List<ShiftScheduleDto>>
{
    public async Task<Result<List<ShiftScheduleDto>>> Handle(GetShiftCalendarQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.ShiftSchedules
            .Include(ss => ss.ShiftTemplate)
            .AsNoTracking()
            .Where(ss => ss.Date >= request.StartDate && ss.Date <= request.EndDate);

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(ss => ss.DepartmentId == request.DepartmentId.Value);
        }

        if (request.EmployeeId.HasValue)
        {
            query = query.Where(ss => ss.EmployeeId == request.EmployeeId.Value);
        }

        var list = await query
            .OrderBy(ss => ss.Date)
            .ThenBy(ss => ss.EmployeeName)
            .Select(ss => new ShiftScheduleDto(
                ss.Id,
                ss.ShiftTemplateId,
                ss.ShiftTemplate != null ? ss.ShiftTemplate.Name : "Vardiya",
                ss.ShiftTemplate != null ? ss.ShiftTemplate.Code : "SHF",
                ss.ShiftTemplate != null ? ss.ShiftTemplate.ColorHex : "#3B82F6",
                ss.CustomStartTime ?? (ss.ShiftTemplate != null ? ss.ShiftTemplate.StartTime : TimeSpan.FromHours(9)),
                ss.CustomEndTime ?? (ss.ShiftTemplate != null ? ss.ShiftTemplate.EndTime : TimeSpan.FromHours(18)),
                ss.EmployeeId,
                ss.EmployeeName,
                ss.DepartmentId,
                ss.DepartmentName,
                ss.Date,
                ss.Status,
                ss.Notes
            ))
            .ToListAsync(cancellationToken);

        return Result<List<ShiftScheduleDto>>.Success(list);
    }
}

public class ShiftEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/attendance/shifts").WithTags("Attendance - Shifts");

        group.MapPost("/templates", async (CreateShiftTemplateCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShiftTemplateDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ShiftTemplateDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.Manage");

        group.MapGet("/templates", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetShiftTemplatesQuery(), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<ShiftTemplateDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<ShiftTemplateDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.View");

        group.MapPost("/assign", async (AssignShiftsCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<int>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<int>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.Manage");

        group.MapGet("/calendar", async (DateOnly startDate, DateOnly endDate, Guid? departmentId, Guid? employeeId, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetShiftCalendarQuery(startDate, endDate, departmentId, employeeId), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<ShiftScheduleDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<ShiftScheduleDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.View");
    }
}
