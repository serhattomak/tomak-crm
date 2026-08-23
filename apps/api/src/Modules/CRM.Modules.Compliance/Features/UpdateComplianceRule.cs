using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Data;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Compliance.Features;

public record UpdateComplianceRuleCommand(
    Guid Id,
    string EnforcementLevel, // HardBlock, SoftWarning, Disabled
    bool IsActive,
    string? ThresholdConfigJson = null
) : ICommand<ComplianceRuleDto>;

public class UpdateComplianceRuleHandler(
    ComplianceDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateComplianceRuleCommand, ComplianceRuleDto>
{
    public async Task<Result<ComplianceRuleDto>> Handle(UpdateComplianceRuleCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<ComplianceRuleDto>(Error.Unauthorized);
        }

        var rule = await dbContext.Rules.FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);
        if (rule == null)
        {
            return Result.Failure<ComplianceRuleDto>(Error.NotFound);
        }

        rule.EnforcementLevel = request.EnforcementLevel;
        rule.IsActive = request.IsActive;
        if (!string.IsNullOrWhiteSpace(request.ThresholdConfigJson))
        {
            rule.ThresholdConfigJson = request.ThresholdConfigJson;
        }
        rule.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new ComplianceRuleDto
        {
            Id = rule.Id,
            Code = rule.Code,
            LawReference = rule.LawReference,
            Category = rule.Category,
            Name = rule.Name,
            Description = rule.Description,
            PenaltyRiskLevel = rule.PenaltyRiskLevel,
            PenaltyDescription = rule.PenaltyDescription,
            EnforcementLevel = rule.EnforcementLevel,
            ThresholdConfigJson = rule.ThresholdConfigJson,
            IsSystemRule = rule.IsSystemRule,
            IsActive = rule.IsActive,
            UpdatedAt = rule.UpdatedAt
        });
    }
}

public class UpdateComplianceRuleEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/compliance/rules/{id:guid}", async (Guid id, UpdateComplianceRuleCommand command, ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                command = command with { Id = id };
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<ComplianceRuleDto>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<ComplianceRuleDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("UpdateComplianceRule")
        .WithTags("Compliance")
        .RequirePermission("Compliance.Manage");
    }
}
