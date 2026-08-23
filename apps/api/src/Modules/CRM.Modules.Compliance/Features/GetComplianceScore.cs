using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Services;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Compliance.Features;

public record GetComplianceScoreQuery() : IQuery<ComplianceScoreResult>;

public class GetComplianceScoreHandler(
    IComplianceEngine complianceEngine,
    ICurrentTenant currentTenant) : IQueryHandler<GetComplianceScoreQuery, ComplianceScoreResult>
{
    public async Task<Result<ComplianceScoreResult>> Handle(GetComplianceScoreQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<ComplianceScoreResult>(Error.Unauthorized);
        }

        var score = await complianceEngine.CalculateComplianceScoreAsync(cancellationToken);
        return Result.Success(score);
    }
}

public class GetComplianceScoreEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/compliance/score", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetComplianceScoreQuery(), ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<ComplianceScoreResult>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<ComplianceScoreResult>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetComplianceScore")
        .WithTags("Compliance")
        .RequirePermission("Compliance.View");
    }
}
