using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Coupons.DeleteCoupon;

public class DeleteCouponEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/promotions/coupons/{id:guid}", async (
            Guid id,
            PromotionsDbContext dbContext,
            CancellationToken ct) =>
        {
            var coupon = await dbContext.Coupons.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (coupon == null)
            {
                return Results.NotFound(ApiResponse<bool>.Fail("NotFound", "Kupon bulunamadı."));
            }

            dbContext.Coupons.Remove(coupon);
            await dbContext.SaveChangesAsync(ct);

            return Results.Ok(ApiResponse<bool>.Ok(true, "Kupon başarıyla silindi."));
        })
        .WithName("DeleteCoupon")
        .WithTags("Promotions")
        .RequirePermission("Promotions.Delete");
    }
}
