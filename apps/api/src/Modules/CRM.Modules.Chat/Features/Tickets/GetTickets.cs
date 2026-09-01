using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Features.Tickets;

public record TicketListDto(
    Guid Id,
    string TicketNumber,
    Guid? ChannelId,
    Guid CustomerId,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string Subject,
    string? Description,
    string Category,
    string Source,
    string Status,
    string Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    DateTime? SlaFirstResponseDueAt,
    DateTime? SlaResolutionDueAt,
    DateTime? FirstResponseAt,
    DateTime? ResolvedAt,
    DateTime? ClosedAt,
    string? LinkedEntityType,
    Guid? LinkedEntityId,
    string? LinkedEntityTitle,
    int? SatisfactionRating,
    IReadOnlyList<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int MessageCount,
    DateTime? LastMessageAt,
    bool IsSlaBreached);

public record GetTicketsQuery(
    string? Status = null,
    string? Priority = null,
    string? Category = null,
    Guid? DepartmentId = null,
    Guid? AssignedUserId = null,
    Guid? CustomerId = null,
    string? Queue = null, // all, my, pending, slaBreached, resolved
    string? Search = null,
    int Page = 1,
    int PageSize = 20) : IQuery<PagedResult<TicketListDto>>;

public class GetTicketsHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant,
    ICurrentUser currentUser) : IQueryHandler<GetTicketsQuery, PagedResult<TicketListDto>>
{
    public async Task<Result<PagedResult<TicketListDto>>> Handle(GetTicketsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var query = dbContext.Tickets.Where(t => t.TenantId == tenantId);

        // Customer Filter
        if (request.CustomerId.HasValue && request.CustomerId.Value != Guid.Empty)
        {
            query = query.Where(t => t.CustomerId == request.CustomerId.Value);
        }

        // Search Filter
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(t =>
                t.TicketNumber.ToLower().Contains(search) ||
                t.Subject.ToLower().Contains(search) ||
                t.CustomerName.ToLower().Contains(search) ||
                (t.CustomerEmail != null && t.CustomerEmail.ToLower().Contains(search)));
        }

        // Status Filter
        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "all")
        {
            if (request.Status == "open")
            {
                query = query.Where(t => t.Status != "Resolved" && t.Status != "Closed");
            }
            else
            {
                query = query.Where(t => t.Status == request.Status);
            }
        }

        // Priority Filter
        if (!string.IsNullOrWhiteSpace(request.Priority) && request.Priority != "all")
        {
            query = query.Where(t => t.Priority == request.Priority);
        }

        // Category Filter
        if (!string.IsNullOrWhiteSpace(request.Category) && request.Category != "all")
        {
            query = query.Where(t => t.Category == request.Category);
        }

        // Department Filter
        if (request.DepartmentId.HasValue && request.DepartmentId.Value != Guid.Empty)
        {
            query = query.Where(t => t.DepartmentId == request.DepartmentId.Value);
        }

        // Assigned User Filter
        if (request.AssignedUserId.HasValue && request.AssignedUserId.Value != Guid.Empty)
        {
            query = query.Where(t => t.AssignedUserId == request.AssignedUserId.Value);
        }

        // Queue Smart Filters
        if (!string.IsNullOrWhiteSpace(request.Queue))
        {
            var nowUtc = DateTime.UtcNow;
            switch (request.Queue.ToLower())
            {
                case "my":
                    if (currentUser.Id.HasValue)
                    {
                        query = query.Where(t => t.AssignedUserId == currentUser.Id.Value);
                    }
                    break;
                case "pending":
                    query = query.Where(t => t.Status == "Pending" || t.Status == "WaitingCustomer");
                    break;
                case "slabreached":
                    query = query.Where(t =>
                        (t.Status != "Resolved" && t.Status != "Closed") &&
                        ((t.SlaFirstResponseDueAt.HasValue && t.FirstResponseAt == null && t.SlaFirstResponseDueAt < nowUtc) ||
                         (t.SlaResolutionDueAt.HasValue && t.ResolvedAt == null && t.SlaResolutionDueAt < nowUtc)));
                    break;
                case "resolved":
                    query = query.Where(t => t.Status == "Resolved" || t.Status == "Closed");
                    break;
            }
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 ? request.PageSize : 20;
        var now = DateTime.UtcNow;

        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TicketListDto(
                t.Id,
                t.TicketNumber,
                t.ChannelId,
                t.CustomerId,
                t.CustomerName,
                t.CustomerEmail,
                t.CustomerPhone,
                t.Subject,
                t.Description,
                t.Category,
                t.Source,
                t.Status,
                t.Priority,
                t.DepartmentId,
                t.DepartmentName,
                t.AssignedUserId,
                t.AssignedUserName,
                t.SlaFirstResponseDueAt,
                t.SlaResolutionDueAt,
                t.FirstResponseAt,
                t.ResolvedAt,
                t.ClosedAt,
                t.LinkedEntityType,
                t.LinkedEntityId,
                t.LinkedEntityTitle,
                t.SatisfactionRating,
                t.Tags != null ? t.Tags.ToList() : new List<string>(),
                t.CreatedAt,
                t.UpdatedAt,
                t.Channel != null ? t.Channel.Messages.Count : 0,
                t.Channel != null ? t.Channel.LastMessageAt : null,
                (t.Status != "Resolved" && t.Status != "Closed") &&
                ((t.SlaFirstResponseDueAt.HasValue && t.FirstResponseAt == null && t.SlaFirstResponseDueAt < now) ||
                 (t.SlaResolutionDueAt.HasValue && t.ResolvedAt == null && t.SlaResolutionDueAt < now))))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedResult<TicketListDto>(items, totalCount, page, pageSize));
    }
}

public class GetTicketsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tickets", async (
            string? status,
            string? priority,
            string? category,
            Guid? departmentId,
            Guid? assignedUserId,
            Guid? customerId,
            string? queue,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetTicketsQuery(
                status,
                priority,
                category,
                departmentId,
                assignedUserId,
                customerId,
                queue,
                search,
                page ?? 1,
                pageSize ?? 20);

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedResult<TicketListDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Tickets.View")
        .WithName("GetTickets")
        .WithTags("HelpDesk");
    }
}
