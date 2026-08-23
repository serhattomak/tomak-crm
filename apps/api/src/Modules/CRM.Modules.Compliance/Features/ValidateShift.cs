using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Entities;
using CRM.Modules.Compliance.Services;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Compliance.Features;

public record ValidateShiftCommand(
    Guid EmployeeId,
    string EmployeeName,
    DateTime ShiftStart,
    DateTime ShiftEnd,
    double BreakMinutes,
    double? CurrentWeekTotalHours = null,
    DateTime? PreviousShiftEnd = null,
    bool IsPregnant = false
) : ICommand<ComplianceValidationResult>;

public class ValidateShiftHandler(
    IComplianceEngine complianceEngine,
    ICurrentTenant currentTenant) : ICommandHandler<ValidateShiftCommand, ComplianceValidationResult>
{
    public async Task<Result<ComplianceValidationResult>> Handle(ValidateShiftCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<ComplianceValidationResult>(Error.Unauthorized);
        }

        var result = await complianceEngine.ValidateShiftScheduleAsync(
            request.EmployeeId,
            request.EmployeeName,
            request.ShiftStart,
            request.ShiftEnd,
            request.BreakMinutes,
            request.CurrentWeekTotalHours,
            request.PreviousShiftEnd,
            request.IsPregnant,
            cancellationToken);

        // If violations found, optionally log them
        foreach (var v in result.Violations)
        {
            await complianceEngine.LogViolationAsync(
                v.RuleCode,
                request.EmployeeId,
                request.EmployeeName,
                "Attendance",
                null,
                v.Severity,
                v.Details,
                v.ContextData,
                cancellationToken);
        }

        return Result.Success(result);
    }
}

public class ValidateShiftEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/compliance/validate-shift", async (ValidateShiftCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<ComplianceValidationResult>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<ComplianceValidationResult>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("ValidateShiftSchedule")
        .WithTags("Compliance")
        .RequirePermission("Compliance.Validate");
    }
}
