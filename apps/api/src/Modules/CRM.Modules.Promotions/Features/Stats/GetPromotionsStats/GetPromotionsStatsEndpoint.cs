using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Stats.GetPromotionsStats;

public record PromotionsStatsDto(
    int TotalCampaigns,
    int ActiveCampaigns,
    int TotalCoupons,
    int TotalUsages,
    decimal TotalDiscountDistributed,
    decimal TotalRevenueInfluenced
);

public class GetPromotionsStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/promotions/stats", async (
            PromotionsDbContext dbContext,
            CancellationToken ct) =>
        {
            var now = DateTime.UtcNow;

            var totalCampaigns = await dbContext.Campaigns.CountAsync(ct);
            var activeCampaigns = await dbContext.Campaigns.CountAsync(c => c.IsActive && c.StartDate <= now && (!c.EndDate.HasValue || c.EndDate.Value >= now), ct);
            var totalCoupons = await dbContext.Coupons.CountAsync(ct);
            var totalUsages = await dbContext.CampaignUsages.CountAsync(ct);
            var totalDiscountDistributed = await dbContext.CampaignUsages.SumAsync(u => (decimal?)u.DiscountAmount, ct) ?? 0;
            var totalRevenueInfluenced = await dbContext.CampaignUsages.SumAsync(u => (decimal?)u.OrderTotalAfter, ct) ?? 0;

            var stats = new PromotionsStatsDto(
                totalCampaigns,
                activeCampaigns,
                totalCoupons,
                totalUsages,
                totalDiscountDistributed,
                totalRevenueInfluenced
            );

            return Results.Ok(ApiResponse<PromotionsStatsDto>.Ok(stats));
        })
        .WithName("GetPromotionsStats")
        .WithTags("Promotions")
        .RequirePermission("Promotions.View");
    }
}
