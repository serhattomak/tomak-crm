using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Coupons.GetCoupons;

public record CouponListItemDto(
    Guid Id,
    Guid CampaignId,
    string CampaignName,
    string Code,
    string Type,
    int MaxUses,
    int UsedCount,
    Guid? AssignedCustomerId,
    string? AssignedCustomerName,
    DateTime? ExpiresAt,
    bool IsActive,
    string? BatchId,
    DateTime CreatedAt
);

public class GetCouponsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/promotions/coupons", async (
            Guid? campaignId,
            string? search,
            string? batchId,
            bool? isActive,
            int page = 1,
            int pageSize = 50,
            PromotionsDbContext dbContext = null!,
            CancellationToken ct = default) =>
        {
            var query = dbContext.Coupons
                .Include(c => c.Campaign)
                .AsNoTracking();

            if (campaignId.HasValue)
            {
                query = query.Where(c => c.CampaignId == campaignId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(c => c.Code.ToLower().Contains(term) || (c.AssignedCustomerName != null && c.AssignedCustomerName.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(batchId))
            {
                query = query.Where(c => c.BatchId == batchId);
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
                .Select(c => new CouponListItemDto(
                    c.Id,
                    c.CampaignId,
                    c.Campaign != null ? c.Campaign.Name : string.Empty,
                    c.Code,
                    c.Type,
                    c.MaxUses,
                    c.UsedCount,
                    c.AssignedCustomerId,
                    c.AssignedCustomerName,
                    c.ExpiresAt,
                    c.IsActive,
                    c.BatchId,
                    c.CreatedAt
                ))
                .ToListAsync(ct);

            var pagedResult = new PagedResult<CouponListItemDto>(items, totalCount, page, pageSize);
            return Results.Ok(ApiResponse<PagedResult<CouponListItemDto>>.Ok(pagedResult));
        })
        .WithName("GetCoupons")
        .WithTags("Promotions")
        .RequirePermission("Promotions.View");
    }
}
