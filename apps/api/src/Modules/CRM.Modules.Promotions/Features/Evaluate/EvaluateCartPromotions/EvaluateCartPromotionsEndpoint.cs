using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Promotions.Features.Evaluate.EvaluateCartPromotions;

public class EvaluateCartPromotionsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/promotions/evaluate", async (
            CartPromotionEvaluationRequest request,
            IPromotionCalculationEngine engine,
            CancellationToken ct) =>
        {
            var result = await engine.EvaluateCartAsync(request, ct);
            return Results.Ok(ApiResponse<CartPromotionEvaluationResult>.Ok(result));
        })
        .WithName("EvaluateCartPromotions")
        .WithTags("Promotions");
        // Public/authenticated for cart checkout & quote calculation
    }
}
