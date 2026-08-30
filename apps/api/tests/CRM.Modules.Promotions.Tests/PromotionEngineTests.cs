using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Promotions.Data;
using CRM.Modules.Promotions.Entities;
using CRM.Modules.Promotions.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CRM.Modules.Promotions.Tests;

public class PromotionEngineTests
{
    private readonly PromotionsDbContext _dbContext;
    private readonly PromotionCalculationEngine _engine;
    private readonly CouponCodeGenerator _generator;
    private readonly Guid _tenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public PromotionEngineTests()
    {
        var tenantAccessor = new CurrentTenantAccessor();
        tenantAccessor.SetTenant(_tenantId, "test-tenant");

        var options = new DbContextOptionsBuilder<PromotionsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new PromotionsDbContext(options, tenantAccessor);
        _engine = new PromotionCalculationEngine(_dbContext);
        _generator = new CouponCodeGenerator();
    }

    [Fact]
    public async Task PercentageDiscount_CalculatesCorrectly_OnSelectedProducts()
    {
        var prod1 = Guid.NewGuid();
        var prod2 = Guid.NewGuid();

        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = _tenantId,
            Name = "%20 İndirim Kampanyası",
            Type = "Percentage",
            TriggerType = "Automatic",
            DiscountValue = 20.00m,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow.AddDays(10),
            Targets = new List<CampaignTarget>
            {
                new() { Id = Guid.NewGuid(), TargetType = "Product", TargetId = prod1.ToString(), RuleCondition = "Include" }
            }
        };

        _dbContext.Campaigns.Add(campaign);
        await _dbContext.SaveChangesAsync();

        var request = new CartPromotionEvaluationRequest
        {
            Items = new List<CartItemDto>
            {
                new() { ProductId = prod1, ProductName = "Dahil Ürün", UnitPrice = 1000m, Quantity = 1 },
                new() { ProductId = prod2, ProductName = "Dahil Olmayan Ürün", UnitPrice = 500m, Quantity = 1 }
            }
        };

        var result = await _engine.EvaluateCartAsync(request);

        Assert.Equal(1500m, result.Subtotal);
        Assert.Equal(200m, result.TotalDiscountAmount); // %20 of 1000 = 200
        Assert.Equal(1300m, result.NetTotal);
        Assert.Single(result.AppliedPromotions);
        Assert.Equal(200m, result.Items.First(i => i.ProductId == prod1).DiscountAmount);
        Assert.Equal(0m, result.Items.First(i => i.ProductId == prod2).DiscountAmount);
    }

    [Fact]
    public async Task PercentageDiscount_WithCap_RespectsMaxDiscount()
    {
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = _tenantId,
            Name = "%50 İndirim (Maks 100 TL)",
            Type = "Percentage",
            TriggerType = "Automatic",
            DiscountValue = 50.00m,
            MaxDiscountAmount = 100.00m,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddDays(-1)
        };

        _dbContext.Campaigns.Add(campaign);
        await _dbContext.SaveChangesAsync();

        var request = new CartPromotionEvaluationRequest
        {
            Items = new List<CartItemDto>
            {
                new() { ProductName = "Pahalı Ürün", UnitPrice = 1000m, Quantity = 1 }
            }
        };

        var result = await _engine.EvaluateCartAsync(request);

        Assert.Equal(100m, result.TotalDiscountAmount);
        Assert.Equal(900m, result.NetTotal);
    }

    [Fact]
    public async Task CartThreshold_AppliesWhenMinimumReached()
    {
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = _tenantId,
            Name = "1000 TL Üzeri 150 TL İndirim",
            Type = "CartThreshold",
            TriggerType = "Automatic",
            MinOrderAmount = 1000m,
            DiscountValue = 150.00m,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddDays(-1)
        };

        _dbContext.Campaigns.Add(campaign);
        await _dbContext.SaveChangesAsync();

        // 1. Below threshold
        var res1 = await _engine.EvaluateCartAsync(new CartPromotionEvaluationRequest
        {
            Items = new List<CartItemDto> { new() { UnitPrice = 800m, Quantity = 1 } }
        });
        Assert.Equal(0m, res1.TotalDiscountAmount);

        // 2. Above threshold
        var res2 = await _engine.EvaluateCartAsync(new CartPromotionEvaluationRequest
        {
            Items = new List<CartItemDto> { new() { UnitPrice = 1200m, Quantity = 1 } }
        });
        Assert.Equal(150m, res2.TotalDiscountAmount);
        Assert.Equal(1050m, res2.NetTotal);
    }

    [Fact]
    public async Task BuyXGetY_CalculatesBundleDiscount()
    {
        var prodId = Guid.NewGuid();
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = _tenantId,
            Name = "2 Al 1 Öde",
            Type = "BuyXGetY",
            TriggerType = "Automatic",
            BuyQuantity = 1,
            GetQuantity = 1,
            GetDiscountRate = 100.00m, // %100 Bedava
            IsActive = true,
            StartDate = DateTime.UtcNow.AddDays(-1)
        };

        _dbContext.Campaigns.Add(campaign);
        await _dbContext.SaveChangesAsync();

        var request = new CartPromotionEvaluationRequest
        {
            Items = new List<CartItemDto>
            {
                new() { ProductId = prodId, ProductName = "T-Shirt", UnitPrice = 200m, Quantity = 4 } // 4 items = 2 free
            }
        };

        var result = await _engine.EvaluateCartAsync(request);

        Assert.Equal(800m, result.Subtotal);
        Assert.Equal(400m, result.TotalDiscountAmount); // 2 free * 200 = 400
        Assert.Equal(400m, result.NetTotal);
    }

    [Fact]
    public async Task CouponCode_ValidatesAndApplies()
    {
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = _tenantId,
            Name = "Özel Kupon Kampanyası",
            Type = "FixedAmount",
            TriggerType = "CouponCode",
            DiscountValue = 75.00m,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddDays(-1)
        };

        var coupon = new Coupon
        {
            Id = Guid.NewGuid(),
            TenantId = _tenantId,
            CampaignId = campaign.Id,
            Code = "YAZ2026",
            MaxUses = 10,
            UsedCount = 0,
            IsActive = true
        };

        _dbContext.Campaigns.Add(campaign);
        _dbContext.Coupons.Add(coupon);
        await _dbContext.SaveChangesAsync();

        var request = new CartPromotionEvaluationRequest
        {
            Items = new List<CartItemDto> { new() { UnitPrice = 300m, Quantity = 1 } },
            CouponCode = "YAZ2026"
        };

        var result = await _engine.EvaluateCartAsync(request);

        Assert.True(result.IsCouponValid);
        Assert.Equal(75m, result.TotalDiscountAmount);
        Assert.Equal(225m, result.NetTotal);
        Assert.Single(result.AppliedPromotions);
        Assert.Equal("YAZ2026", result.AppliedPromotions[0].CouponCode);
    }

    [Fact]
    public void CouponCodeGenerator_GeneratesBatchOfUniqueCodes()
    {
        var codes = _generator.GenerateBatch(50, prefix: "CRM", length: 8);

        Assert.Equal(50, codes.Count);
        Assert.Equal(50, codes.Distinct().Count());
        Assert.All(codes, code => Assert.StartsWith("CRM-", code));
    }
}
