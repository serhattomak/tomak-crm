using System.Text.RegularExpressions;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Messaging;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Entities;
using CRM.Modules.Tenants.Features.CreateTenant;
using FluentValidation;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.Admin.CreateAdminTenant;

public record CreateAdminTenantCommand(
    string Name,
    string? Slug,
    string? LogoUrl,
    Guid? IndustryTemplateId,
    string[]? EnabledModules,
    Guid? OwnerUserId) : ICommand<TenantDto>;

public class CreateAdminTenantValidator : AbstractValidator<CreateAdminTenantCommand>
{
    public CreateAdminTenantValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Slug)
            .MaximumLength(100)
            .Matches("^[a-z0-9-]+$")
            .When(x => !string.IsNullOrEmpty(x.Slug))
            .WithMessage("Slug must contain only lowercase letters, numbers, and hyphens.");
    }
}

public class CreateAdminTenantHandler(
    TenantsDbContext dbContext,
    ICurrentUser currentUser,
    IPublishEndpoint publishEndpoint) : ICommandHandler<CreateAdminTenantCommand, TenantDto>
{
    public async Task<Result<TenantDto>> Handle(CreateAdminTenantCommand request, CancellationToken cancellationToken)
    {
        // 1. Determine Owner User
        var ownerId = request.OwnerUserId ?? currentUser.Id
            ?? throw new UnauthorizedException("Owner user could not be determined.");

        // 2. Generate and ensure unique Slug
        var rawSlug = string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug;
        var cleanSlug = Regex.Replace(rawSlug.ToLowerInvariant().Trim(), @"[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrEmpty(cleanSlug))
        {
            cleanSlug = $"company-{Guid.NewGuid().ToString()[..6]}";
        }

        var existingSlug = await dbContext.Tenants.AnyAsync(t => t.Slug == cleanSlug, cancellationToken);
        if (existingSlug)
        {
            cleanSlug = $"{cleanSlug}-{Guid.NewGuid().ToString()[..6]}";
        }

        // 3. Resolve Industry Template
        IndustryTemplate? template = null;
        if (request.IndustryTemplateId.HasValue)
        {
            template = await dbContext.IndustryTemplates.FirstOrDefaultAsync(t => t.Id == request.IndustryTemplateId.Value, cancellationToken);
        }

        var tenant = new Tenant
        {
            Name = request.Name.Trim(),
            Slug = cleanSlug,
            LogoUrl = request.LogoUrl,
            Industry = template?.Key ?? "general",
            IndustryTemplateId = template?.Id,
            IsActive = true
        };

        dbContext.Tenants.Add(tenant);

        // 4. Add Owner Member
        var member = new TenantMember
        {
            TenantId = tenant.Id,
            UserId = ownerId,
            IsOwner = true
        };
        dbContext.TenantMembers.Add(member);

        // 5. Determine & Provision Modules
        var modulesToEnable = request.EnabledModules?.Length > 0
            ? request.EnabledModules
            : template?.DefaultModules?.Length > 0
                ? template.DefaultModules
                : ModuleRegistry.GetDefaultModuleKeys();

        var enabledSet = modulesToEnable.ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var modDef in ModuleRegistry.All)
        {
            dbContext.TenantModules.Add(new TenantModule
            {
                TenantId = tenant.Id,
                ModuleKey = modDef.Key,
                IsEnabled = enabledSet.Contains(modDef.Key),
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // 6. Publish event
        await publishEndpoint.Publish(new TenantCreatedIntegrationEvent(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            ownerId,
            Guid.NewGuid(),
            DateTime.UtcNow), cancellationToken);

        return new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            tenant.LogoUrl,
            tenant.IsActive,
            true,
            tenant.CreatedAt);
    }
}

public class CreateAdminTenantEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/admin/tenants", async (CreateAdminTenantCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<TenantDto>.Ok(result.Value, "Company created successfully."));
        })
        .RequireAuthorization()
        .RequireSuperAdmin()
        .WithName("CreateAdminTenant")
        .WithTags("Admin");
    }
}
