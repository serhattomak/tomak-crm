using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Automations.Data;
using CRM.Modules.Automations.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Automations.Features;

public record GetWorkflowDetailsQuery(Guid Id) : IQuery<WorkflowDetailDto>;

public class WorkflowDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Icon { get; set; } = "Zap";
    public string Color { get; set; } = "blue";
    public bool IsActive { get; set; }
    public string TriggerType { get; set; } = string.Empty;
    public WorkflowTriggerConfig TriggerConfig { get; set; } = new();
    public List<WorkflowConditionGroup> Conditions { get; set; } = new();
    public List<WorkflowActionStep> Actions { get; set; } = new();
    public int ExecutionCount { get; set; }
    public DateTimeOffset? LastExecutedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<ExecutionSummaryDto> RecentExecutions { get; set; } = new();
}

public class ExecutionSummaryDto
{
    public Guid Id { get; set; }
    public string TriggerSource { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string Status { get; set; } = "Success";
    public string? EvaluatedConditionsSummary { get; set; }
    public int ActionsExecutedCount { get; set; }
    public int ExecutionDurationMs { get; set; }
    public List<ExecutionStepLog> StepLogs { get; set; } = new();
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class GetWorkflowDetailsHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetWorkflowDetailsQuery, WorkflowDetailDto>
{
    public async Task<Result<WorkflowDetailDto>> Handle(GetWorkflowDetailsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WorkflowDetailDto>(Error.Unauthorized);
        }

        var workflow = await dbContext.Workflows
            .Include(w => w.Executions.OrderByDescending(e => e.CreatedAt).Take(20))
            .FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);

        if (workflow == null)
        {
            return Result.Failure<WorkflowDetailDto>(Error.NotFound);
        }

        var recentExecs = workflow.Executions.Select(e => new ExecutionSummaryDto
        {
            Id = e.Id,
            TriggerSource = e.TriggerSource,
            EntityType = e.EntityType,
            EntityId = e.EntityId,
            Status = e.Status,
            EvaluatedConditionsSummary = e.EvaluatedConditionsSummary,
            ActionsExecutedCount = e.ActionsExecutedCount,
            ExecutionDurationMs = e.ExecutionDurationMs,
            StepLogs = e.GetStepLogs(),
            ErrorMessage = e.ErrorMessage,
            CreatedAt = e.CreatedAt
        }).ToList();

        var dto = new WorkflowDetailDto
        {
            Id = workflow.Id,
            Name = workflow.Name,
            Description = workflow.Description,
            Category = workflow.Category,
            Icon = workflow.Icon,
            Color = workflow.Color,
            IsActive = workflow.IsActive,
            TriggerType = workflow.TriggerType,
            TriggerConfig = workflow.GetTriggerConfig(),
            Conditions = workflow.GetConditions(),
            Actions = workflow.GetActions(),
            ExecutionCount = workflow.ExecutionCount,
            LastExecutedAt = workflow.LastExecutedAt,
            CreatedAt = workflow.CreatedAt,
            UpdatedAt = workflow.UpdatedAt,
            RecentExecutions = recentExecs
        };

        return Result.Success(dto);
    }
}

public class GetWorkflowDetailsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/automations/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetWorkflowDetailsQuery(id), ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<WorkflowDetailDto>.Ok(result.Value))
                                    : Results.NotFound(ApiResponse<WorkflowDetailDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetWorkflowDetails")
        .WithTags("Automations")
        .RequirePermission("Automations.View");
    }
}
