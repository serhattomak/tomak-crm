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

public record GetWorkflowsQuery(
    string? Category = null,
    bool? IsActive = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50
) : IQuery<PagedResult<WorkflowSummaryDto>>;

public class WorkflowSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Icon { get; set; } = "Zap";
    public string Color { get; set; } = "blue";
    public bool IsActive { get; set; }
    public string TriggerType { get; set; } = string.Empty;
    public int ConditionsCount { get; set; }
    public int ActionsCount { get; set; }
    public int ExecutionCount { get; set; }
    public DateTimeOffset? LastExecutedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public class GetWorkflowsHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetWorkflowsQuery, PagedResult<WorkflowSummaryDto>>
{
    public async Task<Result<PagedResult<WorkflowSummaryDto>>> Handle(GetWorkflowsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<PagedResult<WorkflowSummaryDto>>(Error.Unauthorized);
        }

        var query = dbContext.Workflows.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Category) && request.Category != "all")
        {
            query = query.Where(w => w.Category.ToLower() == request.Category.ToLower());
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(w => w.IsActive == request.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(w =>
                w.Name.ToLower().Contains(s) ||
                (w.Description != null && w.Description.ToLower().Contains(s)) ||
                w.TriggerType.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var workflows = await query
            .OrderByDescending(w => w.UpdatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = workflows.Select(w => new WorkflowSummaryDto
        {
            Id = w.Id,
            Name = w.Name,
            Description = w.Description,
            Category = w.Category,
            Icon = w.Icon,
            Color = w.Color,
            IsActive = w.IsActive,
            TriggerType = w.TriggerType,
            ConditionsCount = w.GetConditions().Sum(g => g.Rules.Count),
            ActionsCount = w.GetActions().Count,
            ExecutionCount = w.ExecutionCount,
            LastExecutedAt = w.LastExecutedAt,
            CreatedAt = w.CreatedAt,
            UpdatedAt = w.UpdatedAt
        }).ToList();

        return Result.Success(new PagedResult<WorkflowSummaryDto>(items, totalCount, request.Page, request.PageSize));
    }
}

public class GetWorkflowsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/automations", async (
            string? category,
            bool? isActive,
            string? search,
            int? page,
            int? pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetWorkflowsQuery(
                Category: category,
                IsActive: isActive,
                Search: search,
                Page: page ?? 1,
                PageSize: pageSize ?? 50
            );

            var result = await sender.Send(query, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<PagedResult<WorkflowSummaryDto>>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<PagedResult<WorkflowSummaryDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetWorkflows")
        .WithTags("Automations")
        .RequirePermission("Automations.View");
    }
}
