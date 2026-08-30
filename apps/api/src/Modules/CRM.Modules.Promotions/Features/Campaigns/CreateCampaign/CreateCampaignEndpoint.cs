using System.Text.Json;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using CRM.Modules.Promotions.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Promotions.Features.Campaigns.CreateCampaign;

public record CreateCampaignTargetRequest(
    string TargetType,
    string TargetId,
    string? TargetName,
    string RuleCondition
);

public record CreateCampaignRequest(
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
    List<CreateCampaignTargetRequest>? Targets,
    string? InitialCouponCode // If CouponCode trigger and user entered a primary code
);

public record CreateCampaignResponse(Guid Id);

public class CreateCampaignEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/promotions/campaigns", async (
            CreateCampaignRequest req,
            PromotionsDbContext dbContext,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
            {
                return Results.BadRequest(ApiResponse<CreateCampaignResponse>.Fail("Validation.Required", "Kampanya adı zorunludur."));
            }

            var campaign = new Campaign
            {
                Id = Guid.NewGuid(),
                Name = req.Name.Trim(),
                Code = req.Code?.Trim(),
                Description = req.Description,
                Type = string.IsNullOrWhiteSpace(req.Type) ? "Percentage" : req.Type,
                TriggerType = string.IsNullOrWhiteSpace(req.TriggerType) ? "Automatic" : req.TriggerType,
                DiscountValue = req.DiscountValue,
                MinOrderAmount = req.MinOrderAmount,
                MaxDiscountAmount = req.MaxDiscountAmount,
                MinQuantity = req.MinQuantity > 0 ? req.MinQuantity : 1,
                BuyQuantity = req.BuyQuantity,
                GetQuantity = req.GetQuantity,
                GetDiscountRate = req.GetDiscountRate,
                StartDate = req.StartDate == default ? DateTime.UtcNow : req.StartDate,
                EndDate = req.EndDate,
                IsActive = req.IsActive,
                Priority = req.Priority,
                IsStackable = req.IsStackable,
                TotalUsageLimit = req.TotalUsageLimit,
                PerCustomerUsageLimit = req.PerCustomerUsageLimit,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

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

            // Create initial coupon code if provided
            if (campaign.TriggerType == "CouponCode" && !string.IsNullOrWhiteSpace(req.InitialCouponCode))
            {
                campaign.Coupons.Add(new Coupon
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaign.Id,
                    Code = req.InitialCouponCode.Trim().ToUpperInvariant(),
                    Type = "Standard",
                    MaxUses = req.TotalUsageLimit ?? 1000,
                    ExpiresAt = req.EndDate,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            dbContext.Campaigns.Add(campaign);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<CreateCampaignResponse>.Ok(new CreateCampaignResponse(campaign.Id), "Kampanya başarıyla oluşturuldu."));
        })
        .WithName("CreateCampaign")
        .WithTags("Promotions")
        .RequirePermission("Promotions.Create");
    }
}
