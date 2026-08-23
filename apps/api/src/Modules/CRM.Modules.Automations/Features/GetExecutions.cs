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

public record GetExecutionsQuery(
    Guid? WorkflowId = null,
    string? Status = null,
    int Page = 1,
    int PageSize = 50
) : IQuery<PagedResult<ExecutionItemDto>>;

public class ExecutionItemDto
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public string WorkflowName { get; set; } = string.Empty;
    public string TriggerSource { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string Status { get; set; } = "Success";
    public string? EvaluatedConditionsSummary { get; set; }
    public int ActionsExecutedCount { get; set; }
    public int ExecutionDurationMs { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class GetExecutionsHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetExecutionsQuery, PagedResult<ExecutionItemDto>>
{
    public async Task<Result<PagedResult<ExecutionItemDto>>> Handle(GetExecutionsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<PagedResult<ExecutionItemDto>>(Error.Unauthorized);
        }

        var query = dbContext.Executions.AsNoTracking();

        if (request.WorkflowId.HasValue)
        {
            query = query.Where(e => e.WorkflowId == request.WorkflowId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "all")
        {
            query = query.Where(e => e.Status.ToLower() == request.Status.ToLower());
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var list = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = list.Select(e => new ExecutionItemDto
        {
            Id = e.Id,
            WorkflowId = e.WorkflowId,
            WorkflowName = e.WorkflowName,
            TriggerSource = e.TriggerSource,
            EntityType = e.EntityType,
            EntityId = e.EntityId,
            Status = e.Status,
            EvaluatedConditionsSummary = e.EvaluatedConditionsSummary,
            ActionsExecutedCount = e.ActionsExecutedCount,
            ExecutionDurationMs = e.ExecutionDurationMs,
            ErrorMessage = e.ErrorMessage,
            CreatedAt = e.CreatedAt
        }).ToList();

        return Result.Success(new PagedResult<ExecutionItemDto>(items, totalCount, request.Page, request.PageSize));
    }
}

public class GetExecutionsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/automations/executions", async (
            Guid? workflowId,
            string? status,
            int? page,
            int? pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetExecutionsQuery(
                WorkflowId: workflowId,
                Status: status,
                Page: page ?? 1,
                PageSize: pageSize ?? 50
            );

            var result = await sender.Send(query, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<PagedResult<ExecutionItemDto>>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<PagedResult<ExecutionItemDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetExecutions")
        .WithTags("Automations")
        .RequirePermission("Automations.View");
    }
}
