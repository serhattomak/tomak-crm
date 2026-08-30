using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Campaigns.GetCampaignById;

public record CampaignTargetDto(
    Guid Id,
    string TargetType,
    string TargetId,
    string? TargetName,
    string RuleCondition
);

public record CampaignDetailDto(
    Guid Id,
    string Name,
    string? Code,
    string? Description,
    string Type,
    string TriggerType,
    decimal DiscountValue,
    decimal MinOrderAmount,
    decimal? MaxDiscountAmount,
    decimal MinQuantity,
    int BuyQuantity,
    int GetQuantity,
    decimal GetDiscountRate,
    DateTime StartDate,
    DateTime? EndDate,
    bool IsActive,
    int Priority,
    bool IsStackable,
    int? TotalUsageLimit,
    int? PerCustomerUsageLimit,
    int CurrentUsageCount,
    string Metadata,
    List<CampaignTargetDto> Targets,
    int CouponsCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public class GetCampaignByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/promotions/campaigns/{id:guid}", async (
            Guid id,
            PromotionsDbContext dbContext,
            CancellationToken ct) =>
        {
            var campaign = await dbContext.Campaigns
                .Include(c => c.Targets)
                .Include(c => c.Coupons)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (campaign == null)
            {
                return Results.NotFound(ApiResponse<CampaignDetailDto>.Fail("NotFound", "Kampanya bulunamadı."));
            }

            var dto = new CampaignDetailDto(
                campaign.Id,
                campaign.Name,
                campaign.Code,
                campaign.Description,
                campaign.Type,
                campaign.TriggerType,
                campaign.DiscountValue,
                campaign.MinOrderAmount,
                campaign.MaxDiscountAmount,
                campaign.MinQuantity,
                campaign.BuyQuantity,
                campaign.GetQuantity,
                campaign.GetDiscountRate,
                campaign.StartDate,
                campaign.EndDate,
                campaign.IsActive,
                campaign.Priority,
                campaign.IsStackable,
                campaign.TotalUsageLimit,
                campaign.PerCustomerUsageLimit,
                campaign.CurrentUsageCount,
                campaign.Metadata,
                campaign.Targets.Select(t => new CampaignTargetDto(
                    t.Id,
                    t.TargetType,
                    t.TargetId,
                    t.TargetName,
                    t.RuleCondition
                )).ToList(),
                campaign.Coupons.Count,
                campaign.CreatedAt,
                campaign.UpdatedAt
            );

            return Results.Ok(ApiResponse<CampaignDetailDto>.Ok(dto));
        })
        .WithName("GetCampaignById")
        .WithTags("Promotions")
        .RequirePermission("Promotions.View");
    }
}
