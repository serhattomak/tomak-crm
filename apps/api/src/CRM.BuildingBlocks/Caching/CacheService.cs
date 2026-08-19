using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;

namespace CRM.BuildingBlocks.Caching;

public interface ICacheService
{
    Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, ValueTask<T>> factory,
        TimeSpan? expiration = null,
        IReadOnlyCollection<string>? tags = null,
        CancellationToken cancellationToken = default);

    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default);
}

public class HybridCacheService(
    HybridCache hybridCache,
    ILogger<HybridCacheService> logger) : ICacheService
{
    public async Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, ValueTask<T>> factory,
        TimeSpan? expiration = null,
        IReadOnlyCollection<string>? tags = null,
        CancellationToken cancellationToken = default)
    {
        var options = new HybridCacheEntryOptions
        {
            Expiration = expiration ?? TimeSpan.FromMinutes(10),
            LocalCacheExpiration = expiration ?? TimeSpan.FromMinutes(5)
        };

        try
        {
            return await hybridCache.GetOrCreateAsync(
                key,
                factory,
                options,
                tags,
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache get/create failed for key {Key}, calling factory directly", key);
            return await factory(cancellationToken);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            await hybridCache.RemoveAsync(key, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache remove failed for key {Key}", key);
        }
    }

    public async Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default)
    {
        try
        {
            await hybridCache.RemoveByTagAsync(tag, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cache remove by tag failed for tag {Tag}", tag);
        }
    }
}
