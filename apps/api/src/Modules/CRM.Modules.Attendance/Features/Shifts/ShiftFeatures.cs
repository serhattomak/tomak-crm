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

// Break DTOs
public record ShiftTemplateBreakDto(
    Guid Id,
    string Label,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int SortOrder
);

public record BreakPeriodDto(
    string Label,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int SortOrder
);

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
    bool IsActive,
    IReadOnlyList<ShiftTemplateBreakDto> Breaks
);

public record CreateShiftTemplateCommand(
    string Name,
    string Code,
    string? ColorHex,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int BreakDurationMinutes = 60,
    int GracePeriodMinutes = 15,
    bool IsNightShift = false,
    bool IsFlexible = false,
    int MinWorkingHours = 8,
    IReadOnlyList<BreakPeriodDto>? Breaks = null
) : ICommand<ShiftTemplateDto>;

public class CreateShiftTemplateValidator : AbstractValidator<CreateShiftTemplateCommand>
{
    public CreateShiftTemplateValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        When(x => x.Breaks != null && x.Breaks.Count > 0, () =>
        {
            RuleForEach(x => x.Breaks!).ChildRules(breakRule =>
            {
                breakRule.RuleFor(b => b.Label).NotEmpty().MaximumLength(50);
                breakRule.RuleFor(b => b.EndTime)
                    .Must((dto, end) => end > dto.StartTime)
                    .WithMessage("Break EndTime must be after StartTime.");
                breakRule.RuleFor(b => b.SortOrder).GreaterThanOrEqualTo(0);
            });
        });
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

        // Transaction ensures template + breaks are created atomically
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            dbContext.ShiftTemplates.Add(template);
            await dbContext.SaveChangesAsync(cancellationToken);

            // Persist breaks if provided; allow empty for backward compat (fallback to BreakDurationMinutes)
            if (request.Breaks != null && request.Breaks.Count > 0)
            {
                var breaks = request.Breaks
                    .OrderBy(b => b.SortOrder)
                    .Select((b, idx) => new ShiftTemplateBreak
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        ShiftTemplateId = template.Id,
                        Label = string.IsNullOrWhiteSpace(b.Label) ? "Mola" : b.Label.Trim(),
                        StartTime = b.StartTime,
                        EndTime = b.EndTime,
                        SortOrder = b.SortOrder,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    })
                    .ToList();

                dbContext.ShiftTemplateBreaks.AddRange(breaks);
                await dbContext.SaveChangesAsync(cancellationToken);
                // Attach to navigation for response mapping
                template.Breaks = breaks;
            }
            else
            {
                template.Breaks = [];
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        var breakDtos = template.Breaks
            .OrderBy(b => b.SortOrder)
            .Select(b => new ShiftTemplateBreakDto(b.Id, b.Label, b.StartTime, b.EndTime, b.SortOrder))
            .ToList();

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
            template.IsActive,
            breakDtos
        ));
    }
}

public record UpdateShiftTemplateCommand(
    Guid Id,
    string Name,
    string Code,
    string? ColorHex,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int BreakDurationMinutes,
    int GracePeriodMinutes,
    bool IsNightShift,
    bool IsFlexible,
    int MinWorkingHours,
    bool IsActive,
    IReadOnlyList<BreakPeriodDto>? Breaks
) : ICommand<ShiftTemplateDto>;

public class UpdateShiftTemplateValidator : AbstractValidator<UpdateShiftTemplateCommand>
{
    public UpdateShiftTemplateValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        When(x => x.Breaks != null && x.Breaks.Count > 0, () =>
        {
            RuleForEach(x => x.Breaks!).ChildRules(breakRule =>
            {
                breakRule.RuleFor(b => b.Label).NotEmpty().MaximumLength(50);
                breakRule.RuleFor(b => b.EndTime)
                    .Must((dto, end) => end > dto.StartTime)
                    .WithMessage("Break EndTime must be after StartTime.");
                breakRule.RuleFor(b => b.SortOrder).GreaterThanOrEqualTo(0);
            });
        });
    }
}

public class UpdateShiftTemplateHandler(
    AttendanceDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateShiftTemplateCommand, ShiftTemplateDto>
{
    public async Task<Result<ShiftTemplateDto>> Handle(UpdateShiftTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }
        var tenantId = currentTenant.Id.Value;

        var template = await dbContext.ShiftTemplates
            .Include(st => st.Breaks)
            .FirstOrDefaultAsync(st => st.Id == request.Id, cancellationToken);

        if (template == null)
        {
            return Result.Failure<ShiftTemplateDto>(new Error("Shift.NotFound", "Vardiya şablonu bulunamadı."));
        }

        // Ensure tenant isolation (query filter already applies, but double-check for breaks)
        if (template.TenantId != tenantId)
        {
            throw new ForbiddenException("Tenant mismatch.");
        }

        template.Name = request.Name.Trim();
        template.Code = request.Code.Trim().ToUpperInvariant();
        template.ColorHex = request.ColorHex?.Trim() ?? template.ColorHex;
        template.StartTime = request.StartTime;
        template.EndTime = request.EndTime;
        template.BreakDurationMinutes = request.BreakDurationMinutes;
        template.GracePeriodMinutes = request.GracePeriodMinutes;
        template.IsNightShift = request.IsNightShift;
        template.IsFlexible = request.IsFlexible;
        template.MinWorkingHours = request.MinWorkingHours;
        template.IsActive = request.IsActive;
        template.UpdatedAt = DateTime.UtcNow;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Batch upsert breaks: delete existing breaks for this template, then insert new ones.
            // This covers delete-missing, insert-new, and update-existing atomically.
            var existingBreaks = await dbContext.ShiftTemplateBreaks
                .Where(b => b.ShiftTemplateId == template.Id)
                .ToListAsync(cancellationToken);

            if (existingBreaks.Count > 0)
            {
                dbContext.ShiftTemplateBreaks.RemoveRange(existingBreaks);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            List<ShiftTemplateBreak> newBreaks = [];
            if (request.Breaks != null && request.Breaks.Count > 0)
            {
                newBreaks = request.Breaks
                    .OrderBy(b => b.SortOrder)
                    .Select(b => new ShiftTemplateBreak
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        ShiftTemplateId = template.Id,
                        Label = string.IsNullOrWhiteSpace(b.Label) ? "Mola" : b.Label.Trim(),
                        StartTime = b.StartTime,
                        EndTime = b.EndTime,
                        SortOrder = b.SortOrder,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    })
                    .ToList();

                dbContext.ShiftTemplateBreaks.AddRange(newBreaks);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            // Update navigation for response mapping
            template.Breaks = newBreaks;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        var breakDtos = template.Breaks
            .OrderBy(b => b.SortOrder)
            .Select(b => new ShiftTemplateBreakDto(b.Id, b.Label, b.StartTime, b.EndTime, b.SortOrder))
            .ToList();

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
            template.IsActive,
            breakDtos
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
            .Include(st => st.Breaks)
            .OrderBy(st => st.StartTime)
            .ToListAsync(cancellationToken);

        var dtos = list.Select(st =>
        {
            var breaks = st.Breaks
                .OrderBy(b => b.SortOrder)
                .Select(b => new ShiftTemplateBreakDto(b.Id, b.Label, b.StartTime, b.EndTime, b.SortOrder))
                .ToList();

            // Fallback to break_duration_minutes is implicit: client uses BreakDurationMinutes when Breaks empty
            return new ShiftTemplateDto(
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
                st.IsActive,
                breaks
            );
        }).ToList();

        return Result<List<ShiftTemplateDto>>.Success(dtos);
    }
}

public record GetShiftTemplateByIdQuery(Guid Id) : IQuery<ShiftTemplateDto>;

public class GetShiftTemplateByIdHandler(AttendanceDbContext dbContext) : IQueryHandler<GetShiftTemplateByIdQuery, ShiftTemplateDto>
{
    public async Task<Result<ShiftTemplateDto>> Handle(GetShiftTemplateByIdQuery request, CancellationToken cancellationToken)
    {
        var st = await dbContext.ShiftTemplates
            .AsNoTracking()
            .Include(x => x.Breaks)
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (st == null)
        {
            return Result.Failure<ShiftTemplateDto>(new Error("Shift.NotFound", "Vardiya şablonu bulunamadı."));
        }

        var breaks = st.Breaks
            .OrderBy(b => b.SortOrder)
            .Select(b => new ShiftTemplateBreakDto(b.Id, b.Label, b.StartTime, b.EndTime, b.SortOrder))
            .ToList();

        return Result<ShiftTemplateDto>.Success(new ShiftTemplateDto(
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
            st.IsActive,
            breaks
        ));
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

        group.MapGet("/templates/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetShiftTemplateByIdQuery(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShiftTemplateDto>.Ok(result.Value))
                : Results.NotFound(ApiResponse<ShiftTemplateDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.View");

        group.MapPut("/templates/{id:guid}", async (Guid id, UpdateShiftTemplateCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<ShiftTemplateDto>.Fail("Validation.Error", "Route id and body id must match."));
            }
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ShiftTemplateDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ShiftTemplateDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Attendance.Manage");

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
