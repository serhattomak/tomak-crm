using System.Text.RegularExpressions;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Messaging;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Entities;
using FluentValidation;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.CreateTenant;

public record CreateTenantCommand(string Name, string? Slug, string? LogoUrl) : ICommand<TenantDto>;

public record TenantDto(Guid Id, string Name, string Slug, string? LogoUrl, bool IsActive, bool IsOwner, DateTime CreatedAt);

public class CreateTenantValidator : AbstractValidator<CreateTenantCommand>
{
    public CreateTenantValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Slug)
            .MaximumLength(100)
            .Matches("^[a-z0-9-]+$")
            .When(x => !string.IsNullOrEmpty(x.Slug))
            .WithMessage("Slug must contain only lowercase letters, numbers, and hyphens.");
    }
}

public class CreateTenantHandler(
    TenantsDbContext dbContext,
    ICurrentUser currentUser,
    IPublishEndpoint publishEndpoint) : ICommandHandler<CreateTenantCommand, TenantDto>
{
    public async Task<Result<TenantDto>> Handle(CreateTenantCommand request, CancellationToken cancellationToken)
    {
        if (currentUser.Id is null)
        {
            throw new UnauthorizedException();
        }

        var userId = currentUser.Id.Value;

        // Generate clean slug if empty
        var rawSlug = string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug;
        var cleanSlug = Regex.Replace(rawSlug.ToLowerInvariant().Trim(), @"[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrEmpty(cleanSlug))
        {
            cleanSlug = $"workspace-{Guid.NewGuid().ToString()[..6]}";
        }

        // Ensure uniqueness
        var existingSlug = await dbContext.Tenants.AnyAsync(t => t.Slug == cleanSlug, cancellationToken);
        if (existingSlug)
        {
            cleanSlug = $"{cleanSlug}-{Guid.NewGuid().ToString()[..6]}";
        }

        var tenant = new Tenant
        {
            Name = request.Name.Trim(),
            Slug = cleanSlug,
            LogoUrl = request.LogoUrl,
            IsActive = true
        };

        dbContext.Tenants.Add(tenant);

        var member = new TenantMember
        {
            TenantId = tenant.Id,
            UserId = userId,
            IsOwner = true
        };

        dbContext.TenantMembers.Add(member);

        // Provision all default modules for the new tenant
        var defaultModules = ModuleRegistry.GetDefaultModuleKeys();
        foreach (var moduleKey in defaultModules)
        {
            dbContext.TenantModules.Add(new TenantModule
            {
                TenantId = tenant.Id,
                ModuleKey = moduleKey,
                IsEnabled = true,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Publish event for Identity module or external consumers
        await publishEndpoint.Publish(new TenantCreatedIntegrationEvent(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            userId,
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

public class CreateTenantEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tenants", async (CreateTenantCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<TenantDto>.Ok(result.Value, "Tenant created successfully."));
        })
        .RequireAuthorization()
        .WithName("CreateTenant")
        .WithTags("Tenants");
    }
}
