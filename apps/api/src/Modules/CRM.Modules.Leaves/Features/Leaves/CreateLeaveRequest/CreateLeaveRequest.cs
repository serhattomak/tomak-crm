using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Services;
using CRM.Modules.Leaves.Data;
using CRM.Modules.Leaves.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.CreateLeaveRequest;

public record CreateLeaveRequestCommand(
    Guid EmployeeId,
    string EmployeeName,
    Guid? DepartmentId,
    string? DepartmentName,
    string LeaveType, // Annual, Casual, Sick, Unpaid, Marriage, Maternity, Paternity, Bereavement, Other
    DateOnly StartDate,
    DateOnly EndDate,
    bool IsHalfDay,
    string? HalfDayPeriod, // Morning, Afternoon
    string? Reason,
    string? EmergencyContact) : ICommand<Guid>;

public class CreateLeaveRequestValidator : AbstractValidator<CreateLeaveRequestCommand>
{
    public CreateLeaveRequestValidator()
    {
        RuleFor(x => x.EmployeeId).NotEmpty();
        RuleFor(x => x.EmployeeName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.LeaveType).NotEmpty();
        RuleFor(x => x.StartDate).NotEmpty();
        RuleFor(x => x.EndDate).NotEmpty().GreaterThanOrEqualTo(x => x.StartDate);
    }
}

public class CreateLeaveRequestHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant,
    IComplianceEngine complianceEngine) : ICommandHandler<CreateLeaveRequestCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        // Calculate business days (preserve existing half-day flow)
        decimal totalDays;
        if (request.IsHalfDay)
        {
            totalDays = 0.50m;
        }
        else
        {
            var daysCount = 0;
            var cur = request.StartDate;
            while (cur <= request.EndDate)
            {
                if (cur.DayOfWeek != DayOfWeek.Saturday && cur.DayOfWeek != DayOfWeek.Sunday)
                {
                    daysCount++;
                }

                cur = cur.AddDays(1);
            }

            totalDays = Math.Max(1.00m, daysCount);
        }

        // Compliance: half-day only allowed for Casual/Sick (Mazeret/Hastalık)
        var requestedDaysForCompliance = request.IsHalfDay ? 1 : (int)Math.Ceiling(totalDays);
        var complianceResult = await complianceEngine.ValidateLeaveRequestAsync(
            request.EmployeeId,
            request.EmployeeName,
            request.LeaveType,
            requestedDaysForCompliance,
            0,
            0,
            request.IsHalfDay,
            cancellationToken);

        var halfDayViolation = complianceResult.Violations.FirstOrDefault(v => v.RuleCode == "IK-LEAVE-HALFDAY-TYPE");
        if (halfDayViolation != null || complianceResult.HasHardBlock)
        {
            // If the specific half-day violation is present, surface it as a failure; otherwise check generic hard block
            var violation = halfDayViolation ?? complianceResult.Violations.FirstOrDefault();
            if (violation != null)
            {
                return Result.Failure<Guid>(new Error(violation.RuleCode, violation.Details));
            }
        }

        var leaveRequestId = Guid.NewGuid();
        var leaveRequest = new LeaveRequest
        {
            Id = leaveRequestId,
            TenantId = tenantId,
            EmployeeId = request.EmployeeId,
            EmployeeName = request.EmployeeName.Trim(),
            DepartmentId = request.DepartmentId,
            DepartmentName = request.DepartmentName?.Trim(),
            LeaveType = request.LeaveType.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            TotalDays = totalDays,
            IsHalfDay = request.IsHalfDay,
            HalfDayPeriod = request.IsHalfDay ? request.HalfDayPeriod?.Trim() : null,
            Reason = request.Reason?.Trim(),
            EmergencyContact = request.EmergencyContact?.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.LeaveRequests.Add(leaveRequest);

        // If Annual leave, track pending days in balance
        if (request.LeaveType.Equals("Annual", StringComparison.OrdinalIgnoreCase))
        {
            var year = request.StartDate.Year;
            var balance = await dbContext.LeaveBalances
                .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.EmployeeId == request.EmployeeId && x.Year == year, cancellationToken);

            if (balance != null)
            {
                balance.PendingDays += totalDays;
                balance.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                dbContext.LeaveBalances.Add(new LeaveBalance
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    EmployeeId = request.EmployeeId,
                    Year = year,
                    TotalDays = 14.00m,
                    UsedDays = 0.00m,
                    PendingDays = totalDays,
                    RemainingDays = 14.00m,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(leaveRequestId);
    }
}

public class CreateLeaveRequestEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/leaves", async (
            CreateLeaveRequestCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<Guid>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<Guid>.Fail(result.Error.Code, result.Error.Description));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.Create")
        .WithName("CreateLeaveRequest")
        .WithTags("Leaves");
    }
}
