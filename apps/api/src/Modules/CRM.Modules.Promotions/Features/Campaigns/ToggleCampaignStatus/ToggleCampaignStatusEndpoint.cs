using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Campaigns.ToggleCampaignStatus;

public record ToggleCampaignStatusResponse(bool IsActive, string Message);

public class ToggleCampaignStatusEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/promotions/campaigns/{id:guid}/toggle", async (
            Guid id,
            PromotionsDbContext dbContext,
            CancellationToken ct) =>
        {
            var campaign = await dbContext.Campaigns.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (campaign == null)
            {
                return Results.NotFound(ApiResponse<ToggleCampaignStatusResponse>.Fail("NotFound", "Kampanya bulunamadı."));
            }

            campaign.IsActive = !campaign.IsActive;
            campaign.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            var msg = campaign.IsActive ? "Kampanya aktif edildi." : "Kampanya pasif edildi.";
            return Results.Ok(ApiResponse<ToggleCampaignStatusResponse>.Ok(new ToggleCampaignStatusResponse(campaign.IsActive, msg)));
        })
        .WithName("ToggleCampaignStatus")
        .WithTags("Promotions")
        .RequirePermission("Promotions.Update");
    }
}
