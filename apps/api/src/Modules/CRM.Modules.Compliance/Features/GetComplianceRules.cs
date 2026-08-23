using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Data;
using CRM.Modules.Compliance.Services;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Compliance.Features;

public record GetComplianceRulesQuery(string? Category = null) : IQuery<List<ComplianceRuleDto>>;

public class ComplianceRuleDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string LawReference { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string PenaltyRiskLevel { get; set; } = "Medium";
    public string? PenaltyDescription { get; set; }
    public string EnforcementLevel { get; set; } = "SoftWarning";
    public string ThresholdConfigJson { get; set; } = "{}";
    public bool IsSystemRule { get; set; }
    public bool IsActive { get; set; }
    public int ViolationCount { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public class GetComplianceRulesHandler(
    ComplianceDbContext dbContext,
    IComplianceEngine complianceEngine,
    ICurrentTenant currentTenant) : IQueryHandler<GetComplianceRulesQuery, List<ComplianceRuleDto>>
{
    public async Task<Result<List<ComplianceRuleDto>>> Handle(GetComplianceRulesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<List<ComplianceRuleDto>>(Error.Unauthorized);
        }

        await complianceEngine.EnsureDefaultRulesSeededAsync(cancellationToken);

        var query = dbContext.Rules.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Category) && request.Category != "all")
        {
            query = query.Where(r => r.Category.ToLower() == request.Category.ToLower());
        }

        var rules = await query
            .OrderBy(r => r.Category)
            .ThenBy(r => r.Code)
            .Select(r => new ComplianceRuleDto
            {
                Id = r.Id,
                Code = r.Code,
                LawReference = r.LawReference,
                Category = r.Category,
                Name = r.Name,
                Description = r.Description,
                PenaltyRiskLevel = r.PenaltyRiskLevel,
                PenaltyDescription = r.PenaltyDescription,
                EnforcementLevel = r.EnforcementLevel,
                ThresholdConfigJson = r.ThresholdConfigJson,
                IsSystemRule = r.IsSystemRule,
                IsActive = r.IsActive,
                ViolationCount = r.Violations.Count(v => v.Status == "Active"),
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Result.Success(rules);
    }
}

public class GetComplianceRulesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/compliance/rules", async (string? category, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetComplianceRulesQuery(category), ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<List<ComplianceRuleDto>>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<List<ComplianceRuleDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetComplianceRules")
        .WithTags("Compliance")
        .RequirePermission("Compliance.View");
    }
}
