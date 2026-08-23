using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Deals.GetDeals;

public record DealSummaryDto(
    Guid Id,
    Guid TenantId,
    Guid PipelineId,
    Guid StageId,
    string StageName,
    string? StageColor,
    int StageOrderIndex,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerType,
    string Title,
    decimal Value,
    string Currency,
    string Priority,
    string Status,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string Source,
    string? SourceReferenceId,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    DateTime StageEnteredAt,
    DateTime LastActivityAt,
    DateTime? SlaDueDate,
    bool IsSlaBreached,
    int? SlaHours,
    string? LostReason,
    string? WonReason,
    string[]? Tags,
    int NotesCount,
    int ActivitiesCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedDealsResponse(
    IReadOnlyList<DealSummaryDto> Items,
    int TotalCount,
    decimal TotalValue,
    int Page,
    int PageSize);

public record GetDealsQuery(
    Guid? PipelineId = null,
    Guid? StageId = null,
    Guid? CustomerId = null,
    Guid? AssignedUserId = null,
    string? Status = null,
    string? Priority = null,
    string? Source = null,
    bool? OnlyMyDeals = null,
    bool? OnlyUnassigned = null,
    bool? OnlySlaBreached = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 100) : IQuery<PagedDealsResponse>;

public class GetDealsHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetDealsQuery, PagedDealsResponse>
{
    public async Task<Result<PagedDealsResponse>> Handle(GetDealsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var query = dbContext.Deals
            .Where(d => d.TenantId == tenantId)
            .Include(d => d.Stage)
            .Include(d => d.Customer)
            .Include(d => d.Notes)
            .Include(d => d.Activities)
            .AsQueryable();

        if (request.PipelineId.HasValue && request.PipelineId.Value != Guid.Empty)
        {
            query = query.Where(d => d.PipelineId == request.PipelineId.Value);
        }

        if (request.StageId.HasValue && request.StageId.Value != Guid.Empty)
        {
            query = query.Where(d => d.StageId == request.StageId.Value);
        }

        if (request.CustomerId.HasValue && request.CustomerId.Value != Guid.Empty)
        {
            query = query.Where(d => d.CustomerId == request.CustomerId.Value);
        }

        if (request.AssignedUserId.HasValue && request.AssignedUserId.Value != Guid.Empty)
        {
            query = query.Where(d => d.AssignedUserId == request.AssignedUserId.Value);
        }

        if (request.OnlyUnassigned == true)
        {
            query = query.Where(d => d.AssignedUserId == null);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(d => d.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.Priority))
        {
            query = query.Where(d => d.Priority == request.Priority);
        }

        if (!string.IsNullOrWhiteSpace(request.Source))
        {
            query = query.Where(d => d.Source == request.Source);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(d =>
                d.Title.ToLower().Contains(search) ||
                (d.ContactName != null && d.ContactName.ToLower().Contains(search)) ||
                (d.ContactEmail != null && d.ContactEmail.ToLower().Contains(search)) ||
                (d.Customer != null && d.Customer.Name.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var totalValue = await query.SumAsync(d => d.Value, cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 500 ? request.PageSize : 100;

        var rawDeals = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = rawDeals.Select(d =>
        {
            var isBreached = d.SlaDueDate.HasValue && d.SlaDueDate.Value < now && d.Status == "Open";
            if (d.Stage?.SlaHours.HasValue == true && d.Status == "Open")
            {
                var calculatedDue = d.StageEnteredAt.AddHours(d.Stage.SlaHours.Value);
                if (calculatedDue < now)
                {
                    isBreached = true;
                }
            }

            return new DealSummaryDto(
                d.Id,
                d.TenantId,
                d.PipelineId,
                d.StageId,
                d.Stage?.Name ?? "Bilinmeyen Aşama",
                d.Stage?.Color ?? "#6B7280",
                d.Stage?.OrderIndex ?? 0,
                d.CustomerId,
                d.Customer?.Name,
                d.Customer?.Type,
                d.Title,
                d.Value,
                d.Currency,
                d.Priority,
                d.Status,
                d.AssignedUserId,
                d.AssignedUserName,
                d.Source,
                d.SourceReferenceId,
                d.ContactName,
                d.ContactEmail,
                d.ContactPhone,
                d.StageEnteredAt,
                d.LastActivityAt,
                d.SlaDueDate,
                isBreached,
                d.Stage?.SlaHours,
                d.LostReason,
                d.WonReason,
                d.Tags,
                d.Notes.Count,
                d.Activities.Count,
                d.CreatedAt,
                d.UpdatedAt);
        }).ToList();

        if (request.OnlySlaBreached == true)
        {
            items = items.Where(i => i.IsSlaBreached).ToList();
        }

        return Result.Success(new PagedDealsResponse(items, totalCount, totalValue, page, pageSize));
    }
}

public class GetDealsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/deals", async (
            Guid? pipelineId,
            Guid? stageId,
            Guid? customerId,
            Guid? assignedUserId,
            string? status,
            string? priority,
            string? source,
            bool? onlyMyDeals,
            bool? onlyUnassigned,
            bool? onlySlaBreached,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetDealsQuery(
                pipelineId,
                stageId,
                customerId,
                assignedUserId,
                status,
                priority,
                source,
                onlyMyDeals,
                onlyUnassigned,
                onlySlaBreached,
                search,
                page ?? 1,
                pageSize ?? 100);

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedDealsResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.View")
        .WithName("GetDeals")
        .WithTags("Deals");
    }
}
