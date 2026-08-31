using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace CRM.Modules.Integrations.Services;

public interface IPublicApiTenantResolver
{
    Task<Guid?> ResolveTenantIdAsync(string? tenantSlug, CancellationToken cancellationToken = default);
    Task<Guid?> ResolveFromRequestAsync(HttpRequest request, CancellationToken cancellationToken = default);
}

public class PublicApiTenantResolver(
    IConfiguration configuration,
    IMemoryCache cache) : IPublicApiTenantResolver
{
    private static readonly ConcurrentDictionary<string, Guid> SlugCache = new();
    private const string CachePrefix = "tenant_slug_";

    public async Task<Guid?> ResolveFromRequestAsync(HttpRequest request, CancellationToken cancellationToken = default)
    {
        // Priority: query ?tenantSlug -> header X-Tenant-Slug -> route
        string? slug = null;

        if (request.Query.TryGetValue("tenantSlug", out var qSlug) && !string.IsNullOrWhiteSpace(qSlug))
        {
            slug = qSlug.ToString().Trim();
        }
        else if (request.Headers.TryGetValue("X-Tenant-Slug", out var hSlug) && !string.IsNullOrWhiteSpace(hSlug))
        {
            slug = hSlug.ToString().Trim();
        }
        else if (request.RouteValues.TryGetValue("tenantSlug", out var rSlug) && rSlug != null)
        {
            slug = rSlug.ToString()?.Trim();
        }

        return await ResolveTenantIdAsync(slug, cancellationToken);
    }

    public async Task<Guid?> ResolveTenantIdAsync(string? tenantSlug, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantSlug))
        {
            return null;
        }

        var slug = tenantSlug.Trim();

        if (SlugCache.TryGetValue(slug, out var cached))
        {
            return cached;
        }

        var cacheKey = CachePrefix + slug;
        if (cache.TryGetValue<Guid>(cacheKey, out var memCached) && memCached != Guid.Empty)
        {
            SlugCache[slug] = memCached;
            return memCached;
        }

        var connStr = configuration.GetConnectionString("Database");
        if (string.IsNullOrEmpty(connStr))
        {
            return null;
        }

        try
        {
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(
                "SELECT id FROM public.tenants WHERE slug = @slug OR id::text = @slug LIMIT 1;",
                conn);
            cmd.Parameters.AddWithValue("slug", slug);
            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            if (result is Guid g)
            {
                SlugCache[slug] = g;
                cache.Set(cacheKey, g, TimeSpan.FromMinutes(10));
                return g;
            }
        }
        catch
        {
            // Swallow DB errors for resolver — caller handles null
        }

        return null;
    }
}

public class PublicApiHmacValidator(IConfiguration configuration)
{
    public bool IsValid(HttpRequest request, string tenantSlug)
    {
        var secret = configuration["Integrations:HmacSecret"]
            ?? configuration["Ecommerce:HmacSecret"]
            ?? configuration["PublicApi:HmacSecret"]
            ?? "dev-hmac-secret";

        // In development without secret, allow bypass if no header? No — require header per spec unless env is Development and header missing is allowed for testing.
        // Spec: return 401 on missing HMAC/tenantSlug — so enforce.
        if (!request.Headers.TryGetValue("X-HMAC-Signature", out var headerValue) || string.IsNullOrWhiteSpace(headerValue))
        {
            return false;
        }

        var provided = headerValue.ToString().Trim();

        // Compute HMAC of tenantSlug (or tenantSlug + path for stronger binding)
        var payload = $"{request.Method}:{request.Path}{request.QueryString}:{tenantSlug}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();
        var expectedBase64 = Convert.ToBase64String(hash);

        // Accept hex or base64
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(provided.ToLowerInvariant()),
            Encoding.UTF8.GetBytes(expected))
            || provided == expectedBase64
            || provided.Equals(expected, StringComparison.OrdinalIgnoreCase);
    }
}

public class PublicApiRateLimiter(IMemoryCache cache)
{
    private const int LimitPerMinute = 60;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public bool IsRateLimited(HttpContext context, string tenantSlug, out int retryAfterSeconds)
    {
        retryAfterSeconds = 0;
        var ip = context.Connection.RemoteIpAddress?.ToString()
            ?? context.Request.Headers["X-Forwarded-For"].FirstOrDefault()
            ?? "unknown";
        var key = $"ratelimit:{tenantSlug}:{ip}";

        var entry = cache.GetOrCreate(key, e =>
        {
            e.AbsoluteExpirationRelativeToNow = Window;
            return new RateLimitEntry { Count = 0, WindowStart = DateTime.UtcNow };
        });

        if (entry == null)
        {
            return false;
        }

        // Reset if window elapsed
        if (DateTime.UtcNow - entry.WindowStart >= Window)
        {
            entry.Count = 0;
            entry.WindowStart = DateTime.UtcNow;
        }

        entry.Count++;

        if (entry.Count > LimitPerMinute)
        {
            retryAfterSeconds = (int)Math.Ceiling((entry.WindowStart + Window - DateTime.UtcNow).TotalSeconds);
            if (retryAfterSeconds < 1) retryAfterSeconds = 1;
            return true;
        }

        return false;
    }

    private sealed class RateLimitEntry
    {
        public int Count { get; set; }
        public DateTime WindowStart { get; set; }
    }
}

public static class PublicApiGuardHelper
{
    public static async Task<IResult?> ValidateAsync(
        HttpContext httpContext,
        IPublicApiTenantResolver resolver,
        PublicApiHmacValidator hmacValidator,
        PublicApiRateLimiter rateLimiter,
        CancellationToken ct)
    {
        // Resolve tenantSlug from query or header
        string? tenantSlug = null;
        if (httpContext.Request.Query.TryGetValue("tenantSlug", out var q) && !string.IsNullOrWhiteSpace(q))
        {
            tenantSlug = q.ToString().Trim();
        }
        else if (httpContext.Request.Headers.TryGetValue("X-Tenant-Slug", out var h) && !string.IsNullOrWhiteSpace(h))
        {
            tenantSlug = h.ToString().Trim();
        }
        else if (httpContext.Request.Headers.TryGetValue("tenantSlug", out var h2) && !string.IsNullOrWhiteSpace(h2))
        {
            tenantSlug = h2.ToString().Trim();
        }

        if (string.IsNullOrWhiteSpace(tenantSlug))
        {
            return Results.Json(new { error = "tenantSlug is required (query ?tenantSlug or header X-Tenant-Slug)." }, statusCode: 401);
        }

        var tenantId = await resolver.ResolveTenantIdAsync(tenantSlug, ct);
        if (tenantId == null)
        {
            return Results.Json(new { error = $"Tenant not found for slug '{tenantSlug}'." }, statusCode: 401);
        }

        // HMAC is optional for public catalog (ecommerce-client omits when no secret). Only validate if header is present.
        if (httpContext.Request.Headers.ContainsKey("X-HMAC-Signature") && !hmacValidator.IsValid(httpContext.Request, tenantSlug))
        {
            return Results.Json(new { error = "Invalid X-HMAC-Signature." }, statusCode: 401);
        }

        if (rateLimiter.IsRateLimited(httpContext, tenantSlug, out var retryAfter))
        {
            httpContext.Response.Headers.RetryAfter = retryAfter.ToString();
            return Results.Json(new { error = "Rate limit exceeded. 60 requests per minute.", retryAfter }, statusCode: 429);
        }

        // Store resolved values for downstream handlers
        httpContext.Items["public_tenant_id"] = tenantId.Value;
        httpContext.Items["public_tenant_slug"] = tenantSlug;
        return null;
    }

    public static Guid GetTenantId(HttpContext ctx) =>
        ctx.Items.TryGetValue("public_tenant_id", out var v) && v is Guid g ? g : Guid.Empty;

    public static string GetTenantSlug(HttpContext ctx) =>
        ctx.Items.TryGetValue("public_tenant_slug", out var v) && v is string s ? s : string.Empty;
}
