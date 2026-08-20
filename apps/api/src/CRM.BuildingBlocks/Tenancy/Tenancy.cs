using System.Collections.Concurrent;
using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace CRM.BuildingBlocks.Tenancy;

public interface ITenantScopedEntity
{
    Guid TenantId { get; set; }
}

public interface ICurrentTenant
{
    Guid? Id { get; }
    string? Slug { get; }
    bool IsResolved { get; }
    void SetTenant(Guid id, string? slug = null);
}

public class CurrentTenantAccessor : ICurrentTenant
{
    public Guid? Id { get; private set; }
    public string? Slug { get; private set; }
    public bool IsResolved => Id.HasValue && Id.Value != Guid.Empty;

    public void SetTenant(Guid id, string? slug = null)
    {
        Id = id;
        Slug = slug;
    }
}

public class TenantContextMiddleware(RequestDelegate next)
{
    private static readonly ConcurrentDictionary<string, Guid> TenantSlugCache = new(StringComparer.OrdinalIgnoreCase);

    public async Task InvokeAsync(HttpContext context, ICurrentTenant currentTenant, IConfiguration configuration)
    {
        string? candidateSlug = null;
        Guid? resolvedTenantId = null;

        // 1. Try reading from X-Tenant-Id header
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantHeader) &&
            !string.IsNullOrWhiteSpace(tenantHeader))
        {
            var headerVal = tenantHeader.ToString().Trim();
            if (Guid.TryParse(headerVal, out var tid))
            {
                resolvedTenantId = tid;
            }
            else
            {
                candidateSlug = headerVal;
            }
        }

        // 2. Or from X-Tenant-Slug header
        if (!resolvedTenantId.HasValue &&
            context.Request.Headers.TryGetValue("X-Tenant-Slug", out var slugHeader) &&
            !string.IsNullOrWhiteSpace(slugHeader))
        {
            candidateSlug = slugHeader.ToString().Trim();
        }

        // 3. Resolve slug to Guid if needed
        if (!resolvedTenantId.HasValue && !string.IsNullOrWhiteSpace(candidateSlug))
        {
            if (TenantSlugCache.TryGetValue(candidateSlug, out var cachedId))
            {
                resolvedTenantId = cachedId;
            }
            else
            {
                var connStr = configuration?.GetConnectionString("Database") ??
                              configuration?.GetConnectionString("DefaultConnection");

                if (!string.IsNullOrEmpty(connStr))
                {
                    try
                    {
                        await using var conn = new NpgsqlConnection(connStr);
                        await conn.OpenAsync(context.RequestAborted);
                        await using var cmd = new NpgsqlCommand(
                            "SELECT id FROM public.tenants WHERE slug = @slug OR id::text = @slug LIMIT 1;",
                            conn);
                        cmd.Parameters.AddWithValue("slug", candidateSlug);
                        var result = await cmd.ExecuteScalarAsync(context.RequestAborted);
                        if (result is Guid g)
                        {
                            resolvedTenantId = g;
                            TenantSlugCache[candidateSlug] = g;
                        }
                    }
                    catch
                    {
                        // Ignore DB errors during tenant slug resolution
                    }
                }
            }
        }

        // 4. Set resolved tenant or fallback to default tenant if none resolved
        if (resolvedTenantId.HasValue)
        {
            currentTenant.SetTenant(resolvedTenantId.Value, candidateSlug);
        }
        else
        {
            var defaultTenantId = Guid.Parse("d00e2dac-2528-4edf-a3d6-422ecd8b0d1d");
            currentTenant.SetTenant(defaultTenantId, candidateSlug ?? "default");
        }

        await next(context);
    }
}

public class NpgsqlRlsConnectionInterceptor(ICurrentTenant currentTenant) : DbConnectionInterceptor
{
    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            using var command = connection.CreateCommand();
            command.CommandText = $"SET LOCAL app.current_tenant_id = '{currentTenant.Id.Value}';";
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await base.ConnectionOpenedAsync(connection, eventData, cancellationToken);
    }
}
