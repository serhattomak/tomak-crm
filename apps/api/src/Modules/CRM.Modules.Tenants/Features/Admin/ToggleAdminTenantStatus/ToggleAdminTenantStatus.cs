using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Tenants.Features.Admin.ToggleAdminTenantStatus;

public record ToggleAdminTenantStatusCommand(Guid TenantId, bool IsActive) : ICommand<bool>;

public class ToggleAdminTenantStatusHandler(
    TenantsDbContext dbContext,
    ICacheService cacheService) : ICommandHandler<ToggleAdminTenantStatusCommand, bool>
{
    public async Task<Result<bool>> Handle(ToggleAdminTenantStatusCommand request, CancellationToken cancellationToken)
    {
        var tenant = await dbContext.Tenants.FindAsync([request.TenantId], cancellationToken);
        if (tenant is null)
        {
            throw new NotFoundException($"Tenant with ID '{request.TenantId}' was not found.");
        }

        tenant.IsActive = request.IsActive;
        tenant.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        // Invalidate cache
        await cacheService.RemoveAsync($"tenant:slug:{tenant.Slug.ToLowerInvariant()}", cancellationToken);
        await cacheService.RemoveByTagAsync("tenants", cancellationToken);

        return tenant.IsActive;
    }
}

public class ToggleAdminTenantStatusEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/admin/tenants/{id:guid}/status", async (Guid id, ToggleAdminTenantStatusCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command with { TenantId = id }, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value, "Company status updated successfully."));
        })
        .RequireAuthorization()
        .RequireSuperAdmin()
        .WithName("ToggleAdminTenantStatus")
        .WithTags("Admin");
    }
}
