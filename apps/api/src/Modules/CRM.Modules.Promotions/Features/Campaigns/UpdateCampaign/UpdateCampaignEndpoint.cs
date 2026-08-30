using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using CRM.Modules.Promotions.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Campaigns.UpdateCampaign;

public record UpdateCampaignTargetRequest(
    string TargetType,
    string TargetId,
    string? TargetName,
    string RuleCondition
);

public record UpdateCampaignRequest(
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
    List<UpdateCampaignTargetRequest>? Targets
);

public class UpdateCampaignEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/promotions/campaigns/{id:guid}", async (
            Guid id,
            UpdateCampaignRequest req,
            PromotionsDbContext dbContext,
            CancellationToken ct) =>
        {
            var campaign = await dbContext.Campaigns
                .Include(c => c.Targets)
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (campaign == null)
            {
                return Results.NotFound(ApiResponse<bool>.Fail("NotFound", "Kampanya bulunamadı."));
            }

            campaign.Name = req.Name.Trim();
            campaign.Code = req.Code?.Trim();
            campaign.Description = req.Description;
            campaign.Type = req.Type;
            campaign.TriggerType = req.TriggerType;
            campaign.DiscountValue = req.DiscountValue;
            campaign.MinOrderAmount = req.MinOrderAmount;
            campaign.MaxDiscountAmount = req.MaxDiscountAmount;
            campaign.MinQuantity = req.MinQuantity > 0 ? req.MinQuantity : 1;
            campaign.BuyQuantity = req.BuyQuantity;
            campaign.GetQuantity = req.GetQuantity;
            campaign.GetDiscountRate = req.GetDiscountRate;
            campaign.StartDate = req.StartDate;
            campaign.EndDate = req.EndDate;
            campaign.IsActive = req.IsActive;
            campaign.Priority = req.Priority;
            campaign.IsStackable = req.IsStackable;
            campaign.TotalUsageLimit = req.TotalUsageLimit;
            campaign.PerCustomerUsageLimit = req.PerCustomerUsageLimit;
            campaign.UpdatedAt = DateTime.UtcNow;

            // Replace targets
            dbContext.CampaignTargets.RemoveRange(campaign.Targets);
            campaign.Targets.Clear();

            if (req.Targets != null && req.Targets.Count > 0)
            {
                foreach (var t in req.Targets)
                {
                    campaign.Targets.Add(new CampaignTarget
                    {
                        Id = Guid.NewGuid(),
                        CampaignId = campaign.Id,
                        TargetType = t.TargetType,
                        TargetId = t.TargetId,
                        TargetName = t.TargetName,
                        RuleCondition = string.IsNullOrWhiteSpace(t.RuleCondition) ? "Include" : t.RuleCondition,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<bool>.Ok(true, "Kampanya başarıyla güncellendi."));
        })
        .WithName("UpdateCampaign")
        .WithTags("Promotions")
        .RequirePermission("Promotions.Update");
    }
}
