using System.Collections.Concurrent;
using System.Data;
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

public class TenantContextMiddleware(
    RequestDelegate next,
    IConfiguration configuration)
{
    private static readonly ConcurrentDictionary<string, Guid> TenantSlugCache = new();

    public async Task InvokeAsync(HttpContext context, ICurrentTenant currentTenant)
    {
        Guid? resolvedTenantId = null;
        string? candidateSlug = null;

        // 1. Try resolving from custom header "X-Tenant-Id"
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantHeader) &&
            Guid.TryParse(tenantHeader.ToString(), out var headerTenantId))
        {
            resolvedTenantId = headerTenantId;
        }

        // 2. Try resolving from subdomain or URL segment (e.g. /api/{tenant}/...)
        if (!resolvedTenantId.HasValue)
        {
            var host = context.Request.Host.Host;
            var parts = host.Split('.');
            if (parts.Length > 2 && parts[0] != "www" && parts[0] != "api")
            {
                candidateSlug = parts[0];
            }
            else if (context.Request.Headers.TryGetValue("X-Tenant-Slug", out var slugHeader))
            {
                candidateSlug = slugHeader.ToString();
            }

            if (!string.IsNullOrEmpty(candidateSlug))
            {
                if (TenantSlugCache.TryGetValue(candidateSlug, out var cachedId))
                {
                    resolvedTenantId = cachedId;
                }
                else
                {
                    // Query database directly to resolve tenant slug
                    var connStr = configuration.GetConnectionString("Database");

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

public class NpgsqlRlsConnectionInterceptor(ICurrentTenant currentTenant) : DbCommandInterceptor
{
    public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        await SetTenantSessionAsync(command, cancellationToken);
        return await base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        await SetTenantSessionAsync(command, cancellationToken);
        return await base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override async ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result,
        CancellationToken cancellationToken = default)
    {
        await SetTenantSessionAsync(command, cancellationToken);
        return await base.ScalarExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result)
    {
        SetTenantSession(command);
        return base.ReaderExecuting(command, eventData, result);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result)
    {
        SetTenantSession(command);
        return base.NonQueryExecuting(command, eventData, result);
    }

    public override InterceptionResult<object> ScalarExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result)
    {
        SetTenantSession(command);
        return base.ScalarExecuting(command, eventData, result);
    }

    private void SetTenantSession(DbCommand command)
    {
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty && command.Connection != null)
        {
            if (command.CommandText.StartsWith("SET app.current_tenant_id", StringComparison.OrdinalIgnoreCase))
                return;

            if (command.Connection.State == ConnectionState.Open)
            {
                using var setCmd = command.Connection.CreateCommand();
                setCmd.Transaction = command.Transaction;
                setCmd.CommandText = $"SET app.current_tenant_id = '{currentTenant.Id.Value}';";
                setCmd.ExecuteNonQuery();
            }
        }
    }

    private async Task SetTenantSessionAsync(DbCommand command, CancellationToken cancellationToken)
    {
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty && command.Connection != null)
        {
            if (command.CommandText.StartsWith("SET app.current_tenant_id", StringComparison.OrdinalIgnoreCase))
                return;

            if (command.Connection.State == ConnectionState.Open)
            {
                await using var setCmd = command.Connection.CreateCommand();
                setCmd.Transaction = command.Transaction;
                setCmd.CommandText = $"SET app.current_tenant_id = '{currentTenant.Id.Value}';";
                await setCmd.ExecuteNonQueryAsync(cancellationToken);
            }
        }
    }
}
