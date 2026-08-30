using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Campaigns.GetCampaigns;

public record CampaignListItemDto(
    Guid Id,
    string Name,
    string? Code,
    string? Description,
    string Type,
    string TriggerType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    decimal? MaxDiscountAmount,
    DateTime StartDate,
    DateTime? EndDate,
    bool IsActive,
    int Priority,
    bool IsStackable,
    int? TotalUsageLimit,
    int? PerCustomerUsageLimit,
    int CurrentUsageCount,
    int TargetsCount,
    int CouponsCount,
    DateTime CreatedAt
);

public class GetCampaignsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/promotions/campaigns", async (
            string? search,
            string? type,
            string? triggerType,
            bool? isActive,
            int page = 1,
            int pageSize = 20,
            PromotionsDbContext dbContext = null!,
            CancellationToken ct = default) =>
        {
            var query = dbContext.Campaigns
                .Include(c => c.Targets)
                .Include(c => c.Coupons)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(c => c.Name.ToLower().Contains(term) || (c.Code != null && c.Code.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(c => c.Type == type);
            }

            if (!string.IsNullOrWhiteSpace(triggerType))
            {
                query = query.Where(c => c.TriggerType == triggerType);
            }

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            var totalCount = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new CampaignListItemDto(
                    c.Id,
                    c.Name,
                    c.Code,
                    c.Description,
                    c.Type,
                    c.TriggerType,
                    c.DiscountValue,
                    c.MinOrderAmount,
                    c.MaxDiscountAmount,
                    c.StartDate,
                    c.EndDate,
                    c.IsActive,
                    c.Priority,
                    c.IsStackable,
                    c.TotalUsageLimit,
                    c.PerCustomerUsageLimit,
                    c.CurrentUsageCount,
                    c.Targets.Count,
                    c.Coupons.Count,
                    c.CreatedAt
                ))
                .ToListAsync(ct);

            var pagedResult = new PagedResult<CampaignListItemDto>(items, totalCount, page, pageSize);
            return Results.Ok(ApiResponse<PagedResult<CampaignListItemDto>>.Ok(pagedResult));
        })
        .WithName("GetCampaigns")
        .WithTags("Promotions")
        .RequirePermission("Promotions.View");
    }
}
