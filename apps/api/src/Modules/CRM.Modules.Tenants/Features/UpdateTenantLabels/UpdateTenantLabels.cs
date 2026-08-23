using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Entities;
using CRM.Modules.Tenants.Features.GetTenantLabels;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.UpdateTenantLabels;

public record LabelOverrideItem(string Key, string Value);

public record UpdateTenantLabelsCommand(
    Guid TenantId,
    Guid? IndustryTemplateId,
    List<LabelOverrideItem> Overrides) : ICommand<TenantLabelsDto>;

public class UpdateTenantLabelsValidator : AbstractValidator<UpdateTenantLabelsCommand>
{
    public UpdateTenantLabelsValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty();
        RuleForEach(x => x.Overrides).ChildRules(item =>
        {
            item.RuleFor(i => i.Key).NotEmpty().MaximumLength(200);
            item.RuleFor(i => i.Value).NotEmpty().MaximumLength(500);
        });
    }
}

public class UpdateTenantLabelsHandler(
    TenantsDbContext dbContext,
    ICacheService cacheService,
    MediatR.ISender sender) : ICommandHandler<UpdateTenantLabelsCommand, TenantLabelsDto>
{
    public async Task<Result<TenantLabelsDto>> Handle(UpdateTenantLabelsCommand request, CancellationToken cancellationToken)
    {
        var tenant = await dbContext.Tenants
            .Include(t => t.LabelOverrides)
            .FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);

        if (tenant is null)
        {
            throw new NotFoundException($"Tenant with ID '{request.TenantId}' was not found.");
        }

        // 1. Update Industry Template if specified
        if (request.IndustryTemplateId.HasValue)
        {
            var template = await dbContext.IndustryTemplates
                .FirstOrDefaultAsync(t => t.Id == request.IndustryTemplateId.Value, cancellationToken);

            if (template is null)
            {
                throw new BadRequestException($"Industry Template with ID '{request.IndustryTemplateId.Value}' was not found.");
            }

            tenant.IndustryTemplateId = template.Id;
            tenant.Industry = template.Key;
        }

        // 2. Synchronize Overrides (remove old, update or add new)
        var requestedKeys = request.Overrides.Select(o => o.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Remove overrides that are not in the update request
        var toRemove = tenant.LabelOverrides.Where(o => !requestedKeys.Contains(o.LabelKey)).ToList();
        foreach (var rem in toRemove)
        {
            dbContext.TenantLabelOverrides.Remove(rem);
        }

        // Add or update
        foreach (var item in request.Overrides)
        {
            var existing = tenant.LabelOverrides
                .FirstOrDefault(o => o.LabelKey.Equals(item.Key, StringComparison.OrdinalIgnoreCase));

            if (existing != null)
            {
                existing.Value = item.Value;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                dbContext.TenantLabelOverrides.Add(new TenantLabelOverride
                {
                    TenantId = tenant.Id,
                    LabelKey = item.Key,
                    Value = item.Value,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        tenant.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        // 3. Invalidate Redis Caches
        await cacheService.RemoveAsync($"tenant:{tenant.Id}:labels", cancellationToken);
        await cacheService.RemoveByTagAsync("tenant-labels", cancellationToken);

        // 4. Return refreshed resolved labels
        var refreshed = await sender.Send(new GetTenantLabelsQuery(tenant.Id), cancellationToken);
        return refreshed.Value;
    }
}

public class UpdateTenantLabelsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/tenants/{tenantId:guid}/labels",
            async (Guid tenantId, UpdateTenantLabelsCommand command, MediatR.ISender sender, CancellationToken ct) =>
            {
                var resolved = command with { TenantId = tenantId };
                var result = await sender.Send(resolved, ct);
                return Results.Ok(ApiResponse<TenantLabelsDto>.Ok(result.Value, "Labels updated successfully."));
            })
        .RequireAuthorization()
        .WithName("UpdateTenantLabels")
        .WithTags("Tenants");
    }
}
