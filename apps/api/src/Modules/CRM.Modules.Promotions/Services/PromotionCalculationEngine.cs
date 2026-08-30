using CRM.Modules.Promotions.Data;
using CRM.Modules.Promotions.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Promotions.Services;

public record CartItemDto
{
    public Guid? ProductId { get; init; }
    public Guid? VariantId { get; init; }
    public Guid? CategoryId { get; init; }
    public string? Brand { get; init; }
    public string ProductName { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public decimal Quantity { get; init; }
    public decimal ItemTotal => UnitPrice * Quantity;
    public decimal DiscountAmount { get; set; } = 0;
    public decimal NetTotal => Math.Max(0, ItemTotal - DiscountAmount);
}

public record CartPromotionEvaluationRequest
{
    public List<CartItemDto> Items { get; init; } = new();
    public Guid? CustomerId { get; init; }
    public string? CustomerGroup { get; init; }
    public string? CouponCode { get; init; }
    public decimal ShippingFee { get; init; } = 0;
}

public record AppliedPromotionDto
{
    public Guid CampaignId { get; init; }
    public string CampaignName { get; init; } = string.Empty;
    public string CampaignType { get; init; } = string.Empty;
    public string? CouponCode { get; init; }
    public decimal DiscountAmount { get; init; }
    public string Description { get; init; } = string.Empty;
}

public record CartPromotionEvaluationResult
{
    public decimal Subtotal { get; init; }
    public decimal TotalDiscountAmount { get; init; }
    public decimal NetTotal { get; init; }
    public decimal ShippingFee { get; init; }
    public bool IsFreeShipping { get; init; }
    public List<AppliedPromotionDto> AppliedPromotions { get; init; } = new();
    public List<CartItemDto> Items { get; init; } = new();
    public string? CouponValidationMessage { get; init; }
    public bool IsCouponValid { get; init; }
}

public interface IPromotionCalculationEngine
{
    Task<CartPromotionEvaluationResult> EvaluateCartAsync(
        CartPromotionEvaluationRequest request,
        CancellationToken cancellationToken = default);
}

public class PromotionCalculationEngine(PromotionsDbContext dbContext) : IPromotionCalculationEngine
{
    public async Task<CartPromotionEvaluationResult> EvaluateCartAsync(
        CartPromotionEvaluationRequest request,
        CancellationToken cancellationToken = default)
    {
        var items = request.Items.Select(i => new CartItemDto
        {
            ProductId = i.ProductId,
            VariantId = i.VariantId,
            CategoryId = i.CategoryId,
            Brand = i.Brand,
            ProductName = i.ProductName,
            UnitPrice = i.UnitPrice,
            Quantity = i.Quantity,
            DiscountAmount = 0
        }).ToList();

        decimal subtotal = items.Sum(i => i.ItemTotal);
        decimal totalDiscount = 0;
        decimal shippingFee = request.ShippingFee;
        bool isFreeShipping = false;
        var appliedPromotions = new List<AppliedPromotionDto>();
        string? couponMsg = null;
        bool isCouponValid = false;

        if (items.Count == 0)
        {
            return new CartPromotionEvaluationResult
            {
                Subtotal = 0,
                TotalDiscountAmount = 0,
                NetTotal = 0,
                ShippingFee = shippingFee,
                IsFreeShipping = false,
                AppliedPromotions = appliedPromotions,
                Items = items
            };
        }

        var now = DateTime.UtcNow;

        // 1. Fetch active campaigns
        var campaignsQuery = dbContext.Campaigns
            .Include(c => c.Targets)
            .Include(c => c.Coupons)
            .Where(c => c.IsActive && c.StartDate <= now && (!c.EndDate.HasValue || c.EndDate.Value >= now));

        var allActiveCampaigns = await campaignsQuery.ToListAsync(cancellationToken);

        // Separate automatic campaigns and coupon-triggered campaigns
        var eligibleCampaigns = new List<(Campaign Campaign, Coupon? MatchedCoupon)>();

        // Check coupon code if provided
        if (!string.IsNullOrWhiteSpace(request.CouponCode))
        {
            var cleanCode = request.CouponCode.Trim();
            var coupon = await dbContext.Coupons
                .Include(c => c.Campaign)
                    .ThenInclude(cmp => cmp!.Targets)
                .FirstOrDefaultAsync(c => c.Code.ToLower() == cleanCode.ToLower() && c.IsActive, cancellationToken);

            if (coupon == null)
            {
                couponMsg = "Geçersiz veya bulunamayan kupon kodu.";
            }
            else if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt.Value < now)
            {
                couponMsg = "Kupon kodunun son kullanma tarihi geçmiş.";
            }
            else if (coupon.UsedCount >= coupon.MaxUses)
            {
                couponMsg = "Bu kuponun maksimum kullanım kotası dolmuştur.";
            }
            else if (coupon.AssignedCustomerId.HasValue && request.CustomerId.HasValue && coupon.AssignedCustomerId.Value != request.CustomerId.Value)
            {
                couponMsg = "Bu kupon sadece tanımlı müşteriye özeldir.";
            }
            else if (coupon.Campaign == null || !coupon.Campaign.IsActive)
            {
                couponMsg = "Kupona bağlı kampanya aktif değildir.";
            }
            else
            {
                eligibleCampaigns.Add((coupon.Campaign, coupon));
                isCouponValid = true;
                couponMsg = $"'{coupon.Code}' kupon kodu başarıyla uygulandı.";
            }
        }

        // Add automatic campaigns
        foreach (var camp in allActiveCampaigns.Where(c => c.TriggerType == "Automatic"))
        {
            eligibleCampaigns.Add((camp, null));
        }

        // Sort eligible campaigns by priority descending
        var candidateList = eligibleCampaigns
            .OrderByDescending(c => c.Campaign.Priority)
            .ThenByDescending(c => c.Campaign.DiscountValue)
            .ToList();

        // 2. Evaluate eligibility & calculate discounts
        bool hasNonStackableApplied = false;

        foreach (var (campaign, matchedCoupon) in candidateList)
        {
            // Check usage limit
            if (campaign.TotalUsageLimit.HasValue && campaign.CurrentUsageCount >= campaign.TotalUsageLimit.Value)
            {
                continue;
            }

            // Check min order amount
            if (subtotal < campaign.MinOrderAmount)
            {
                if (matchedCoupon != null)
                {
                    couponMsg = $"Kupon için minimum sepet tutarı {campaign.MinOrderAmount:N2} TL olmalıdır.";
                    isCouponValid = false;
                }
                continue;
            }

            // Check target eligibility (Products / Categories / Brands / Customers)
            var eligibleItems = FilterEligibleItems(items, campaign.Targets);
            if (eligibleItems.Count == 0 && campaign.Type != "CartThreshold" && campaign.Type != "FreeShipping")
            {
                if (matchedCoupon != null)
                {
                    couponMsg = "Sepetinizdeki ürünler bu kupon/kampanya kapsamına girmemektedir.";
                    isCouponValid = false;
                }
                continue;
            }

            // Check min quantity requirement
            decimal totalEligibleQty = eligibleItems.Sum(i => i.Quantity);
            if (totalEligibleQty < campaign.MinQuantity && campaign.Type != "CartThreshold" && campaign.Type != "FreeShipping")
            {
                continue;
            }

            // Stacking check: if a non-stackable campaign already applied, skip further campaigns
            if (hasNonStackableApplied || (appliedPromotions.Count > 0 && !campaign.IsStackable))
            {
                continue;
            }

            // 3. Calculate discount amount based on Campaign Type
            decimal calculatedDiscount = 0;
            string description = string.Empty;

            switch (campaign.Type)
            {
                case "Percentage":
                    decimal eligibleSum = eligibleItems.Count > 0 ? eligibleItems.Sum(i => i.NetTotal) : (subtotal - totalDiscount);
                    calculatedDiscount = Math.Round(eligibleSum * (campaign.DiscountValue / 100m), 2);
                    if (campaign.MaxDiscountAmount.HasValue && calculatedDiscount > campaign.MaxDiscountAmount.Value)
                    {
                        calculatedDiscount = campaign.MaxDiscountAmount.Value;
                    }
                    description = $"%{campaign.DiscountValue:0.##} İndirim";
                    DistributeDiscountToItems(eligibleItems, calculatedDiscount);
                    break;

                case "FixedAmount":
                    calculatedDiscount = Math.Min(campaign.DiscountValue, subtotal - totalDiscount);
                    description = $"{campaign.DiscountValue:N2} TL Sabit İndirim";
                    DistributeDiscountToItems(eligibleItems.Count > 0 ? eligibleItems : items, calculatedDiscount);
                    break;

                case "CartThreshold":
                    if (subtotal >= campaign.MinOrderAmount)
                    {
                        if (campaign.DiscountValue <= 100 && campaign.DiscountValue > 0)
                        {
                            calculatedDiscount = Math.Round((subtotal - totalDiscount) * (campaign.DiscountValue / 100m), 2);
                            description = $"{campaign.MinOrderAmount:N2} TL üzeri %{campaign.DiscountValue:0.##} İndirim";
                        }
                        else
                        {
                            calculatedDiscount = Math.Min(campaign.DiscountValue, subtotal - totalDiscount);
                            description = $"{campaign.MinOrderAmount:N2} TL üzeri {campaign.DiscountValue:N2} TL İndirim";
                        }

                        if (campaign.MaxDiscountAmount.HasValue && calculatedDiscount > campaign.MaxDiscountAmount.Value)
                        {
                            calculatedDiscount = campaign.MaxDiscountAmount.Value;
                        }
                        DistributeDiscountToItems(items, calculatedDiscount);
                    }
                    break;

                case "BuyXGetY":
                    int buyX = campaign.BuyQuantity > 0 ? campaign.BuyQuantity : 2;
                    int getY = campaign.GetQuantity > 0 ? campaign.GetQuantity : 1;
                    int requiredPerGroup = buyX + getY;

                    int totalQty = (int)eligibleItems.Sum(i => i.Quantity);
                    int bundleCount = totalQty / requiredPerGroup;

                    if (bundleCount > 0)
                    {
                        int freeItemsCount = bundleCount * getY;
                        // Find cheapest unit items in eligible items
                        var unitPrices = eligibleItems
                            .SelectMany(i => Enumerable.Repeat(i.UnitPrice, (int)i.Quantity))
                            .OrderBy(p => p)
                            .Take(freeItemsCount)
                            .ToList();

                        decimal rawDiscount = unitPrices.Sum(p => p * (campaign.GetDiscountRate / 100m));
                        calculatedDiscount = Math.Round(rawDiscount, 2);
                        description = $"{buyX} Al {getY} Öde (%{campaign.GetDiscountRate:0.##} Avantaj)";
                        DistributeDiscountToItems(eligibleItems, calculatedDiscount);
                    }
                    break;

                case "FreeShipping":
                    isFreeShipping = true;
                    description = "Ücretsiz Kargo";
                    break;
            }

            if (calculatedDiscount > 0 || isFreeShipping)
            {
                totalDiscount += calculatedDiscount;
                appliedPromotions.Add(new AppliedPromotionDto
                {
                    CampaignId = campaign.Id,
                    CampaignName = campaign.Name,
                    CampaignType = campaign.Type,
                    CouponCode = matchedCoupon?.Code,
                    DiscountAmount = calculatedDiscount,
                    Description = description
                });

                if (!campaign.IsStackable)
                {
                    hasNonStackableApplied = true;
                }
            }
        }

        decimal netTotal = Math.Max(0, subtotal - totalDiscount);
        decimal finalShippingFee = isFreeShipping ? 0 : shippingFee;

        return new CartPromotionEvaluationResult
        {
            Subtotal = subtotal,
            TotalDiscountAmount = totalDiscount,
            NetTotal = netTotal,
            ShippingFee = finalShippingFee,
            IsFreeShipping = isFreeShipping,
            AppliedPromotions = appliedPromotions,
            Items = items,
            CouponValidationMessage = couponMsg,
            IsCouponValid = isCouponValid
        };
    }

    private static List<CartItemDto> FilterEligibleItems(List<CartItemDto> items, ICollection<CampaignTarget> targets)
    {
        if (targets == null || targets.Count == 0)
        {
            return items; // No specific target means all items are eligible
        }

        var includes = targets.Where(t => t.RuleCondition == "Include").ToList();
        var excludes = targets.Where(t => t.RuleCondition == "Exclude").ToList();

        return items.Where(item =>
        {
            // Check Exclude rules
            bool isExcluded = excludes.Any(rule =>
                (rule.TargetType == "Product" && item.ProductId.HasValue && rule.TargetId == item.ProductId.Value.ToString()) ||
                (rule.TargetType == "Category" && item.CategoryId.HasValue && rule.TargetId == item.CategoryId.Value.ToString()) ||
                (rule.TargetType == "Brand" && !string.IsNullOrEmpty(item.Brand) && rule.TargetId.Equals(item.Brand, StringComparison.OrdinalIgnoreCase))
            );

            if (isExcluded) return false;

            if (includes.Count == 0) return true; // If only exclusions defined, all other items pass

            // Check Include rules
            bool isIncluded = includes.Any(rule =>
                (rule.TargetType == "Product" && item.ProductId.HasValue && rule.TargetId == item.ProductId.Value.ToString()) ||
                (rule.TargetType == "Category" && item.CategoryId.HasValue && rule.TargetId == item.CategoryId.Value.ToString()) ||
                (rule.TargetType == "Brand" && !string.IsNullOrEmpty(item.Brand) && rule.TargetId.Equals(item.Brand, StringComparison.OrdinalIgnoreCase))
            );

            return isIncluded;
        }).ToList();
    }

    private static void DistributeDiscountToItems(List<CartItemDto> eligibleItems, decimal discountToDistribute)
    {
        if (eligibleItems.Count == 0 || discountToDistribute <= 0) return;

        decimal totalEligibleSum = eligibleItems.Sum(i => i.NetTotal);
        if (totalEligibleSum <= 0) return;

        decimal remaining = discountToDistribute;

        for (int i = 0; i < eligibleItems.Count; i++)
        {
            var item = eligibleItems[i];
            if (i == eligibleItems.Count - 1)
            {
                item.DiscountAmount += Math.Min(remaining, item.NetTotal);
            }
            else
            {
                decimal itemShare = Math.Round(discountToDistribute * (item.NetTotal / totalEligibleSum), 2);
                itemShare = Math.Min(itemShare, item.NetTotal);
                item.DiscountAmount += itemShare;
                remaining -= itemShare;
            }
        }
    }
}
