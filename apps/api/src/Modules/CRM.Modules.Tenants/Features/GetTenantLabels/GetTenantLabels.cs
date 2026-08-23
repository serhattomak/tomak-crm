using System.Text.Json;
using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.GetTenantLabels;

public record TenantLabelsDto(
    Guid TenantId,
    string? IndustryKey,
    string? IndustryName,
    Dictionary<string, string> ModuleDisplayNames,
    Dictionary<string, string> FieldLabels);

public record GetTenantLabelsQuery(Guid TenantId) : IQuery<TenantLabelsDto>;

public class GetTenantLabelsHandler(
    TenantsDbContext dbContext,
    ICacheService cacheService) : IQueryHandler<GetTenantLabelsQuery, TenantLabelsDto>
{
    public async Task<Result<TenantLabelsDto>> Handle(GetTenantLabelsQuery request, CancellationToken cancellationToken)
    {
        var cacheKey = $"tenant:{request.TenantId}:labels";

        return await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct =>
            {
                var tenant = await dbContext.Tenants
                    .Include(t => t.IndustryTemplate)
                    .Include(t => t.Modules)
                    .Include(t => t.LabelOverrides)
                    .FirstOrDefaultAsync(t => t.Id == request.TenantId, ct);

                if (tenant is null)
                {
                    throw new NotFoundException($"Tenant with ID '{request.TenantId}' was not found.");
                }

                // 1. Start with Default Module Display Names from ModuleRegistry
                var moduleDisplayNames = ModuleRegistry.All.ToDictionary(
                    m => m.Key.ToLowerInvariant(),
                    m => m.DefaultDisplayName,
                    StringComparer.OrdinalIgnoreCase
                );

                var fieldLabels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

                // 2. Apply Industry Template Overrides if assigned
                if (tenant.IndustryTemplate != null && !string.IsNullOrWhiteSpace(tenant.IndustryTemplate.LabelsJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(tenant.IndustryTemplate.LabelsJson);
                        var root = doc.RootElement;

                        if (root.TryGetProperty("modules", out var modulesElem) && modulesElem.ValueKind == JsonValueKind.Object)
                        {
                            foreach (var prop in modulesElem.EnumerateObject())
                            {
                                if (prop.Value.TryGetProperty("displayName", out var dispName) && dispName.ValueKind == JsonValueKind.String)
                                {
                                    moduleDisplayNames[prop.Name] = dispName.GetString()!;
                                }
                            }
                        }

                        if (root.TryGetProperty("fields", out var fieldsElem) && fieldsElem.ValueKind == JsonValueKind.Object)
                        {
                            foreach (var prop in fieldsElem.EnumerateObject())
                            {
                                if (prop.Value.ValueKind == JsonValueKind.String)
                                {
                                    fieldLabels[prop.Name] = prop.Value.GetString()!;
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Ignore JSON parsing errors from corrupt template json
                    }
                }

                // 3. Apply TenantModule custom DisplayName overrides
                foreach (var mod in tenant.Modules.Where(m => !string.IsNullOrWhiteSpace(m.DisplayName)))
                {
                    moduleDisplayNames[mod.ModuleKey] = mod.DisplayName!;
                }

                // 4. Apply Tenant-Specific Field & Module Label Overrides (Highest priority)
                foreach (var customOverride in tenant.LabelOverrides)
                {
                    if (customOverride.LabelKey.StartsWith("modules.", StringComparison.OrdinalIgnoreCase))
                    {
                        var modKey = customOverride.LabelKey["modules.".Length..];
                        moduleDisplayNames[modKey] = customOverride.Value;
                    }
                    else
                    {
                        fieldLabels[customOverride.LabelKey] = customOverride.Value;
                    }
                }

                return new TenantLabelsDto(
                    tenant.Id,
                    tenant.IndustryTemplate?.Key ?? tenant.Industry,
                    tenant.IndustryTemplate?.Name,
                    moduleDisplayNames,
                    fieldLabels
                );
            },
            TimeSpan.FromMinutes(30),
            ["tenant-labels", $"tenant:{request.TenantId}"],
            cancellationToken
        );
    }
}

public class GetTenantLabelsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tenants/{tenantId:guid}/labels", async (Guid tenantId, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetTenantLabelsQuery(tenantId), ct);
            return Results.Ok(ApiResponse<TenantLabelsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetTenantLabels")
        .WithTags("Tenants");
    }
}
