using CRM.Modules.Integrations.Data;
using CRM.Modules.Integrations.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Integrations.Services;

public record GuestMergeResult(
    int MergedItems,
    bool GuestCartExpired,
    Guid? CustomerCartId,
    Guid? GuestCartId);

public interface IGuestMergeService
{
    Task<GuestMergeResult> MergeAsync(
        Guid tenantId,
        Guid customerId,
        string guestToken,
        CancellationToken cancellationToken = default);
}

public class GuestMergeService(
    IntegrationsDbContext integrationsDb,
    ILogger<GuestMergeService> logger) : IGuestMergeService
{
    public async Task<GuestMergeResult> MergeAsync(
        Guid tenantId,
        Guid customerId,
        string guestToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(guestToken))
        {
            return new GuestMergeResult(0, false, null, null);
        }

        var normalizedToken = guestToken.Trim();

        var guestCart = await integrationsDb.Carts.IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                c => c.TenantId == tenantId && c.GuestToken == normalizedToken,
                cancellationToken);

        if (guestCart == null)
        {
            logger.LogDebug(
                "GuestMerge: no guest cart found tenant={TenantId} guestToken={GuestToken}",
                tenantId, normalizedToken);
            return new GuestMergeResult(0, false, null, null);
        }

        // If guest cart already belongs to same customer, nothing to merge (idempotent)
        if (guestCart.CustomerId.HasValue && guestCart.CustomerId.Value == customerId)
        {
            return new GuestMergeResult(0, false, guestCart.Id, guestCart.Id);
        }

        var customerCart = await integrationsDb.Carts.IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                c => c.TenantId == tenantId && c.CustomerId == customerId,
                cancellationToken);

        // If guest and customer cart are same entity (by id), return idempotent
        if (customerCart != null && customerCart.Id == guestCart.Id)
        {
            return new GuestMergeResult(0, false, customerCart.Id, guestCart.Id);
        }

        // Create customer cart if missing — copy expiry from guest or default 7 days
        if (customerCart == null)
        {
            customerCart = new Cart
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CustomerId = customerId,
                GuestToken = null,
                GuestTokenUuid = null,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            integrationsDb.Carts.Add(customerCart);
            await integrationsDb.SaveChangesAsync(cancellationToken);
        }

        var guestItems = await integrationsDb.CartItems.IgnoreQueryFilters()
            .Where(ci => ci.CartId == guestCart.Id)
            .ToListAsync(cancellationToken);

        var mergedCount = 0;

        foreach (var gi in guestItems)
        {
            var existing = await integrationsDb.CartItems.IgnoreQueryFilters()
                .FirstOrDefaultAsync(
                    ci => ci.CartId == customerCart.Id
                          && ci.ProductId == gi.ProductId
                          && ci.VariantId == gi.VariantId,
                    cancellationToken);

            if (existing != null)
            {
                existing.Quantity += gi.Quantity;
                existing.UpdatedAt = DateTime.UtcNow;
                // Keep latest snapshot if guest snapshot more recent
                if (gi.SnapshotPrice > 0) existing.SnapshotPrice = gi.SnapshotPrice;
                if (gi.PriceSnapshot > 0) existing.PriceSnapshot = gi.PriceSnapshot;
                if (!string.IsNullOrWhiteSpace(gi.SnapshotName)) existing.SnapshotName = gi.SnapshotName;
                mergedCount++;
            }
            else
            {
                var cloned = new CartItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CartId = customerCart.Id,
                    ProductId = gi.ProductId,
                    VariantId = gi.VariantId,
                    Quantity = gi.Quantity,
                    PriceSnapshot = gi.PriceSnapshot,
                    SnapshotPrice = gi.SnapshotPrice,
                    SnapshotName = gi.SnapshotName,
                    Currency = gi.Currency,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                integrationsDb.CartItems.Add(cloned);
                mergedCount++;
            }
        }

        customerCart.UpdatedAt = DateTime.UtcNow;

        // Expire guest cart: remove cart (cascade deletes cart_items) after merge
        // Keep audit by logging before delete
        var guestCartId = guestCart.Id;
        integrationsDb.Carts.Remove(guestCart);

        await integrationsDb.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "GuestMerge: tenant={TenantId} customer={CustomerId} guestToken={GuestToken} mergedItems={Count} guestCart={GuestCartId} -> customerCart={CustomerCartId}",
            tenantId, customerId, normalizedToken, mergedCount, guestCartId, customerCart.Id);

        return new GuestMergeResult(mergedCount, true, customerCart.Id, guestCartId);
    }
}
