using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Automations.Data;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Automations.Features;

public record GetWorkflowStatsQuery() : IQuery<WorkflowStatsDto>;

public class WorkflowStatsDto
{
    public int TotalWorkflows { get; set; }
    public int ActiveWorkflows { get; set; }
    public int InactiveWorkflows { get; set; }
    public int ExecutionsToday { get; set; }
    public int TotalExecutionsAllTime { get; set; }
    public double SuccessRate { get; set; } = 100.0;
    public int EstimatedHoursSaved { get; set; }
}

public class GetWorkflowStatsHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetWorkflowStatsQuery, WorkflowStatsDto>
{
    public async Task<Result<WorkflowStatsDto>> Handle(GetWorkflowStatsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WorkflowStatsDto>(Error.Unauthorized);
        }

        var total = await dbContext.Workflows.CountAsync(cancellationToken);
        var active = await dbContext.Workflows.CountAsync(w => w.IsActive, cancellationToken);
        var inactive = total - active;

        var todayUtc = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        var executionsToday = await dbContext.Executions
            .CountAsync(e => e.CreatedAt >= todayUtc, cancellationToken);

        var totalExecutions = await dbContext.Executions.CountAsync(cancellationToken);
        var successfulExecutions = await dbContext.Executions
            .CountAsync(e => e.Status == "Success", cancellationToken);

        var successRate = totalExecutions > 0
            ? Math.Round((double)successfulExecutions / totalExecutions * 100, 1)
            : 100.0;

        var estimatedHoursSaved = (int)Math.Round(totalExecutions * 4.0 / 60.0);

        return Result.Success(new WorkflowStatsDto
        {
            TotalWorkflows = total,
            ActiveWorkflows = active,
            InactiveWorkflows = inactive,
            ExecutionsToday = executionsToday,
            TotalExecutionsAllTime = totalExecutions,
            SuccessRate = successRate,
            EstimatedHoursSaved = estimatedHoursSaved
        });
    }
}

public class GetWorkflowStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/automations/stats", async (ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetWorkflowStatsQuery(), ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<WorkflowStatsDto>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<WorkflowStatsDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetWorkflowStats")
        .WithTags("Automations")
        .RequirePermission("Automations.View");
    }
}
