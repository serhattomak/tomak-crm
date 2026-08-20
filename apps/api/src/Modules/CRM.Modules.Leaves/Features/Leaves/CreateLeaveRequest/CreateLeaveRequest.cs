using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
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
    ICurrentTenant currentTenant) : ICommandHandler<CreateLeaveRequestCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        // Calculate business days
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
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.Create")
        .WithName("CreateLeaveRequest")
        .WithTags("Leaves");
    }
}
