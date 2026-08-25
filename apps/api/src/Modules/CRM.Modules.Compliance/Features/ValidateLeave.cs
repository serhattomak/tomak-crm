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

public record ValidateLeaveCommand(
    Guid EmployeeId,
    string EmployeeName,
    string LeaveType,
    int RequestedDays,
    int SeniorityYears,
    int Age,
    bool IsHalfDay = false
) : ICommand<ComplianceValidationResult>;

public class ValidateLeaveHandler(
    IComplianceEngine complianceEngine,
    ICurrentTenant currentTenant) : ICommandHandler<ValidateLeaveCommand, ComplianceValidationResult>
{
    public async Task<Result<ComplianceValidationResult>> Handle(ValidateLeaveCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<ComplianceValidationResult>(Error.Unauthorized);
        }

        var result = await complianceEngine.ValidateLeaveRequestAsync(
            request.EmployeeId,
            request.EmployeeName,
            request.LeaveType,
            request.RequestedDays,
            request.SeniorityYears,
            request.Age,
            request.IsHalfDay,
            cancellationToken);

        foreach (var v in result.Violations)
        {
            await complianceEngine.LogViolationAsync(
                v.RuleCode,
                request.EmployeeId,
                request.EmployeeName,
                "Leaves",
                null,
                v.Severity,
                v.Details,
                v.ContextData,
                cancellationToken);
        }

        return Result.Success(result);
    }
}

public class ValidateLeaveEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/compliance/validate-leave", async (ValidateLeaveCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<ComplianceValidationResult>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<ComplianceValidationResult>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("ValidateLeaveRequest")
        .WithTags("Compliance")
        .RequirePermission("Compliance.Validate");
    }
}
