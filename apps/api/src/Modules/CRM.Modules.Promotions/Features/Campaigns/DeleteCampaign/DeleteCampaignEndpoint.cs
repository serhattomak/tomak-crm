using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Campaigns.DeleteCampaign;

public class DeleteCampaignEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/promotions/campaigns/{id:guid}", async (
            Guid id,
            PromotionsDbContext dbContext,
            CancellationToken ct) =>
        {
            var campaign = await dbContext.Campaigns.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (campaign == null)
            {
                return Results.NotFound(ApiResponse<bool>.Fail("NotFound", "Kampanya bulunamadı."));
            }

            dbContext.Campaigns.Remove(campaign);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<bool>.Ok(true, "Kampanya başarıyla silindi."));
        })
        .WithName("DeleteCampaign")
        .WithTags("Promotions")
        .RequirePermission("Promotions.Delete");
    }
}
