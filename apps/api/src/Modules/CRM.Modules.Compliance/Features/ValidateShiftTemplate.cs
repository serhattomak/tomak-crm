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

public record ValidateShiftTemplateCommand(
    string StartTime,
    string EndTime,
    double BreakMinutes,
    bool IsNightShift = false,
    IReadOnlyList<BreakPeriod>? Breaks = null
) : ICommand<ComplianceValidationResult>;

public class ValidateShiftTemplateHandler(
    IComplianceEngine complianceEngine,
    ICurrentTenant currentTenant) : ICommandHandler<ValidateShiftTemplateCommand, ComplianceValidationResult>
{
    public async Task<Result<ComplianceValidationResult>> Handle(ValidateShiftTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<ComplianceValidationResult>(Error.Unauthorized);
        }

        var result = await complianceEngine.ValidateShiftTemplateAsync(
            request.StartTime,
            request.EndTime,
            request.BreakMinutes,
            request.IsNightShift,
            request.Breaks,
            cancellationToken);

        return Result.Success(result);
    }
}

public class ValidateShiftTemplateEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/compliance/validate-template", async (ValidateShiftTemplateCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<ComplianceValidationResult>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<ComplianceValidationResult>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("ValidateShiftTemplate")
        .WithTags("Compliance")
        .RequirePermission("Compliance.Validate");
    }
}
