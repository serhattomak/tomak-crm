using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Promotions.Data;
using CRM.Modules.Promotions.Entities;
using CRM.Modules.Promotions.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Features.Coupons.GenerateCoupons;

public record GenerateCouponsRequest(
    Guid CampaignId,
    int Quantity,
    string? Prefix,
    int CodeLength = 8,
    int MaxUses = 1,
    DateTime? ExpiresAt = null,
    string? CustomCode = null // Tekil özel kod girişi için
);

public record GenerateCouponsResponse(
    string BatchId,
    int GeneratedCount,
    List<string> Codes
);

public class GenerateCouponsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/promotions/coupons/generate", async (
            GenerateCouponsRequest req,
            PromotionsDbContext dbContext,
            ICouponCodeGenerator generator,
            CancellationToken ct) =>
        {
            var campaign = await dbContext.Campaigns.FirstOrDefaultAsync(c => c.Id == req.CampaignId, ct);
            if (campaign == null)
            {
                return Results.NotFound(ApiResponse<GenerateCouponsResponse>.Fail("NotFound", "Seçilen kampanya bulunamadı."));
            }

            var batchId = $"batch_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..6]}";
            var createdCoupons = new List<Coupon>();

            if (!string.IsNullOrWhiteSpace(req.CustomCode))
            {
                // Single custom coupon
                var clean = req.CustomCode.Trim().ToUpperInvariant();
                var exists = await dbContext.Coupons.AnyAsync(c => c.Code == clean, ct);
                if (exists)
                {
                    return Results.BadRequest(ApiResponse<GenerateCouponsResponse>.Fail("Conflict", $"'{clean}' kupon kodu zaten mevcut."));
                }

                var coupon = new Coupon
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaign.Id,
                    Code = clean,
                    Type = req.MaxUses == 1 ? "SingleUse" : "Standard",
                    MaxUses = req.MaxUses > 0 ? req.MaxUses : 1,
                    ExpiresAt = req.ExpiresAt ?? campaign.EndDate,
                    IsActive = true,
                    BatchId = batchId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                createdCoupons.Add(coupon);
            }
            else
            {
                // Bulk batch generation
                int qty = Math.Clamp(req.Quantity, 1, 5000);
                var generatedCodes = generator.GenerateBatch(qty, req.Prefix, Math.Clamp(req.CodeLength, 4, 16));

                // Check existing codes in DB to avoid collisions
                var existingCodes = await dbContext.Coupons
                    .Where(c => generatedCodes.Contains(c.Code))
                    .Select(c => c.Code)
                    .ToListAsync(ct);

                var existingSet = existingCodes.ToHashSet();

                foreach (var code in generatedCodes)
                {
                    if (existingSet.Contains(code)) continue;

                    createdCoupons.Add(new Coupon
                    {
                        Id = Guid.NewGuid(),
                        CampaignId = campaign.Id,
                        Code = code,
                        Type = req.MaxUses == 1 ? "SingleUse" : "Standard",
                        MaxUses = req.MaxUses > 0 ? req.MaxUses : 1,
                        ExpiresAt = req.ExpiresAt ?? campaign.EndDate,
                        IsActive = true,
                        BatchId = batchId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            dbContext.Coupons.AddRange(createdCoupons);
            await dbContext.SaveChangesAsync(ct);

            var resp = new GenerateCouponsResponse(
                batchId,
                createdCoupons.Count,
                createdCoupons.Select(c => c.Code).Take(50).ToList()
            );

            return Results.Ok(ApiResponse<GenerateCouponsResponse>.Ok(resp, $"{createdCoupons.Count} adet kupon kodu başarıyla üretildi."));
        })
        .WithName("GenerateCoupons")
        .WithTags("Promotions")
        .RequirePermission("Promotions.GenerateCoupons");
    }
}
