using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Deals.GetDealById;

public record DealActivityDto(
    Guid Id,
    Guid? UserId,
    string? UserName,
    string ActivityType,
    string Title,
    string? Description,
    string? OldValue,
    string? NewValue,
    DateTime CreatedAt);

public record DealNoteDto(
    Guid Id,
    Guid? UserId,
    string? UserName,
    string Content,
    bool IsPinned,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record DealDetailDto(
    Guid Id,
    Guid TenantId,
    Guid PipelineId,
    string PipelineName,
    Guid StageId,
    string StageName,
    string? StageColor,
    int StageOrderIndex,
    Guid? CustomerId,
    string? CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
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
    string? MetadataJson,
    IReadOnlyList<DealActivityDto> Activities,
    IReadOnlyList<DealNoteDto> Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GetDealByIdQuery(Guid Id) : IQuery<DealDetailDto>;

public class GetDealByIdHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetDealByIdQuery, DealDetailDto>
{
    public async Task<Result<DealDetailDto>> Handle(GetDealByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var deal = await dbContext.Deals
            .Where(d => d.TenantId == tenantId && d.Id == request.Id)
            .Include(d => d.Pipeline)
            .Include(d => d.Stage)
            .Include(d => d.Customer)
            .Include(d => d.Activities)
            .Include(d => d.Notes)
            .FirstOrDefaultAsync(cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException($"Deal {request.Id} not found.");
        }

        var isBreached = deal.SlaDueDate.HasValue && deal.SlaDueDate.Value < now && deal.Status == "Open";
        if (deal.Stage?.SlaHours.HasValue == true && deal.Status == "Open")
        {
            var calculatedDue = deal.StageEnteredAt.AddHours(deal.Stage.SlaHours.Value);
            if (calculatedDue < now)
            {
                isBreached = true;
            }
        }

        var activities = deal.Activities
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new DealActivityDto(
                a.Id,
                a.UserId,
                a.UserName,
                a.ActivityType,
                a.Title,
                a.Description,
                a.OldValue,
                a.NewValue,
                a.CreatedAt))
            .ToList();

        var notes = deal.Notes
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.CreatedAt)
            .Select(n => new DealNoteDto(
                n.Id,
                n.UserId,
                n.UserName,
                n.Content,
                n.IsPinned,
                n.CreatedAt,
                n.UpdatedAt))
            .ToList();

        var detail = new DealDetailDto(
            deal.Id,
            deal.TenantId,
            deal.PipelineId,
            deal.Pipeline?.Name ?? "Bilinmeyen Pipeline",
            deal.StageId,
            deal.Stage?.Name ?? "Bilinmeyen Aşama",
            deal.Stage?.Color ?? "#6B7280",
            deal.Stage?.OrderIndex ?? 0,
            deal.CustomerId,
            deal.Customer?.Name,
            deal.Customer?.Email,
            deal.Customer?.Phone,
            deal.Customer?.Type,
            deal.Title,
            deal.Value,
            deal.Currency,
            deal.Priority,
            deal.Status,
            deal.AssignedUserId,
            deal.AssignedUserName,
            deal.Source,
            deal.SourceReferenceId,
            deal.ContactName,
            deal.ContactEmail,
            deal.ContactPhone,
            deal.StageEnteredAt,
            deal.LastActivityAt,
            deal.SlaDueDate,
            isBreached,
            deal.Stage?.SlaHours,
            deal.LostReason,
            deal.WonReason,
            deal.Tags,
            deal.MetadataJson,
            activities,
            notes,
            deal.CreatedAt,
            deal.UpdatedAt);

        return Result.Success(detail);
    }
}

public class GetDealByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/deals/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetDealByIdQuery(id);
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<DealDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.View")
        .WithName("GetDealById")
        .WithTags("Deals");
    }
}
