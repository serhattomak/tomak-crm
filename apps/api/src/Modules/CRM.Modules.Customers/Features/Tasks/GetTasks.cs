using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Tasks;

public record TaskSummaryDto(
    Guid Id,
    Guid TenantId,
    string Title,
    string? Description,
    DateTime? DueDate,
    string Priority,
    string Status,
    bool IsCompleted,
    DateTime? CompletedAt,
    string Category,
    Guid? AssignedUserId,
    string? AssignedUserName,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedTasksResponse(
    IReadOnlyList<TaskSummaryDto> Items,
    int TotalCount,
    int CompletedCount,
    int PendingCount,
    int Page,
    int PageSize);

public record GetTasksQuery(
    bool? IsCompleted = null,
    string? Status = null,
    string? Priority = null,
    string? Category = null,
    Guid? AssignedUserId = null,
    Guid? CustomerId = null,
    Guid? DealId = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 100) : IQuery<PagedTasksResponse>;

public class GetTasksHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetTasksQuery, PagedTasksResponse>
{
    public async Task<Result<PagedTasksResponse>> Handle(GetTasksQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Tasks.AsNoTracking();

        if (currentTenant.Id.HasValue)
        {
            query = query.Where(t => t.TenantId == currentTenant.Id.Value);
        }

        if (request.IsCompleted.HasValue)
        {
            query = query.Where(t => t.IsCompleted == request.IsCompleted.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(t => t.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.Priority))
        {
            query = query.Where(t => t.Priority.ToLower() == request.Priority.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            query = query.Where(t => t.Category == request.Category);
        }

        if (request.AssignedUserId.HasValue)
        {
            query = query.Where(t => t.AssignedUserId == request.AssignedUserId.Value);
        }

        if (request.CustomerId.HasValue)
        {
            query = query.Where(t => t.CustomerId == request.CustomerId.Value);
        }

        if (request.DealId.HasValue)
        {
            query = query.Where(t => t.DealId == request.DealId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(search) ||
                (t.Description != null && t.Description.ToLower().Contains(search)) ||
                (t.CustomerName != null && t.CustomerName.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var completedCount = await query.CountAsync(t => t.IsCompleted, cancellationToken);
        var pendingCount = totalCount - completedCount;

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 ? request.PageSize : 50;

        var tasks = await query
            .OrderBy(t => t.IsCompleted)
            .ThenBy(t => t.DueDate ?? DateTime.MaxValue)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TaskSummaryDto(
                t.Id,
                t.TenantId,
                t.Title,
                t.Description,
                t.DueDate,
                t.Priority,
                t.Status,
                t.IsCompleted,
                t.CompletedAt,
                t.Category,
                t.AssignedUserId,
                t.AssignedUserName,
                t.CustomerId,
                t.CustomerName,
                t.DealId,
                t.CreatedAt,
                t.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedTasksResponse(tasks, totalCount, completedCount, pendingCount, page, pageSize));
    }
}

public class GetTasksEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tasks", async (
            bool? isCompleted,
            string? status,
            string? priority,
            string? category,
            Guid? assignedUserId,
            Guid? customerId,
            Guid? dealId,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetTasksQuery(
                isCompleted,
                status,
                priority,
                category,
                assignedUserId,
                customerId,
                dealId,
                search,
                page ?? 1,
                pageSize ?? 100);

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedTasksResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetTasks")
        .WithTags("Tasks");

        app.MapGet("/api/tasks/{id:guid}", async (
            Guid id,
            CustomersDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var query = dbContext.Tasks.AsNoTracking();
            if (currentTenant.Id.HasValue)
            {
                query = query.Where(t => t.TenantId == currentTenant.Id.Value);
            }

            var task = await query
                .Where(t => t.Id == id)
                .Select(t => new TaskSummaryDto(
                    t.Id,
                    t.TenantId,
                    t.Title,
                    t.Description,
                    t.DueDate,
                    t.Priority,
                    t.Status,
                    t.IsCompleted,
                    t.CompletedAt,
                    t.Category,
                    t.AssignedUserId,
                    t.AssignedUserName,
                    t.CustomerId,
                    t.CustomerName,
                    t.DealId,
                    t.CreatedAt,
                    t.UpdatedAt))
                .FirstOrDefaultAsync(ct);

            if (task == null)
            {
                throw new NotFoundException($"Task {id} not found.");
            }

            return Results.Ok(ApiResponse<TaskSummaryDto>.Ok(task));
        })
        .RequireAuthorization()
        .WithName("GetTaskById")
        .WithTags("Tasks");
    }
}
