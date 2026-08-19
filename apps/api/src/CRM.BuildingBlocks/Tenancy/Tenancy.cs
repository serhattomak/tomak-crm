using System.Data.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

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
    public bool IsResolved => Id.HasValue;

    public void SetTenant(Guid id, string? slug = null)
    {
        Id = id;
        Slug = slug;
    }
}

public class TenantContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ICurrentTenant currentTenant)
    {
        // 1. Try reading from X-Tenant-Id header
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantHeader) &&
            Guid.TryParse(tenantHeader.ToString(), out var tenantId))
        {
            currentTenant.SetTenant(tenantId);
        }
        // 2. Or from X-Tenant-Slug header
        else if (context.Request.Headers.TryGetValue("X-Tenant-Slug", out var slugHeader) &&
                 !string.IsNullOrWhiteSpace(slugHeader))
        {
            currentTenant.SetTenant(Guid.Empty, slugHeader.ToString());
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
