using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Entities;
using CRM.Modules.Tenants.Features.GetTenantModules;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.ToggleTenantModule;

public record ToggleTenantModuleCommand(
    Guid TenantId,
    string ModuleKey,
    bool IsEnabled,
    string? DisplayName) : ICommand<TenantModuleDto>;

public class ToggleTenantModuleValidator : AbstractValidator<ToggleTenantModuleCommand>
{
    public ToggleTenantModuleValidator()
    {
        RuleFor(x => x.TenantId).NotEmpty();
        RuleFor(x => x.ModuleKey).NotEmpty().MaximumLength(50);
        RuleFor(x => x.DisplayName).MaximumLength(200).When(x => x.DisplayName is not null);
    }
}

public class ToggleTenantModuleHandler(
    TenantsDbContext dbContext,
    IModuleAccessService moduleAccessService) : ICommandHandler<ToggleTenantModuleCommand, TenantModuleDto>
{
    public async Task<Result<TenantModuleDto>> Handle(ToggleTenantModuleCommand request, CancellationToken cancellationToken)
    {
        var definition = ModuleRegistry.GetByKey(request.ModuleKey)
            ?? throw new BadRequestException($"Unknown module key: '{request.ModuleKey}'.");

        var tenant = await dbContext.Tenants.AnyAsync(t => t.Id == request.TenantId, cancellationToken);
        if (!tenant)
        {
            throw new NotFoundException($"Tenant with ID '{request.TenantId}' was not found.");
        }

        var tenantModule = await dbContext.TenantModules
            .FirstOrDefaultAsync(m => m.TenantId == request.TenantId && m.ModuleKey == request.ModuleKey, cancellationToken);

        if (tenantModule is null)
        {
            tenantModule = new TenantModule
            {
                TenantId = request.TenantId,
                ModuleKey = request.ModuleKey,
                IsEnabled = request.IsEnabled,
                DisplayName = request.DisplayName,
            };
            dbContext.TenantModules.Add(tenantModule);
        }
        else
        {
            tenantModule.IsEnabled = request.IsEnabled;
            tenantModule.DisplayName = request.DisplayName ?? tenantModule.DisplayName;
            tenantModule.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Invalidate cached module list for this tenant
        await moduleAccessService.InvalidateModuleCacheAsync(request.TenantId, cancellationToken);

        return new TenantModuleDto(
            definition.Key,
            definition.DefaultDisplayName,
            tenantModule.DisplayName,
            definition.Category,
            tenantModule.IsEnabled,
            tenantModule.ActivatedAt);
    }
}

public class ToggleTenantModuleEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/tenants/{tenantId:guid}/modules/{moduleKey}",
            async (Guid tenantId, string moduleKey, ToggleTenantModuleCommand command, MediatR.ISender sender, CancellationToken ct) =>
            {
                // Ensure route params match body
                var resolvedCommand = command with { TenantId = tenantId, ModuleKey = moduleKey };
                var result = await sender.Send(resolvedCommand, ct);
                return Results.Ok(ApiResponse<TenantModuleDto>.Ok(result.Value, "Module updated successfully."));
            })
        .RequireAuthorization()
        .WithName("ToggleTenantModule")
        .WithTags("Tenants");
    }
}
