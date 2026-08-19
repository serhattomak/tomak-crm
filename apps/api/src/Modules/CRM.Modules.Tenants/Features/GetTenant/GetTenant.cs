using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Features.CreateTenant;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.GetTenant;

public record GetTenantBySlugQuery(string Slug) : IQuery<TenantDto>;

public class GetTenantBySlugHandler(
    TenantsDbContext dbContext,
    ICurrentUser currentUser,
    ICacheService cacheService) : IQueryHandler<GetTenantBySlugQuery, TenantDto>
{
    public async Task<Result<TenantDto>> Handle(GetTenantBySlugQuery request, CancellationToken cancellationToken)
    {
        if (currentUser.Id is null)
        {
            throw new UnauthorizedException();
        }

        var userId = currentUser.Id.Value;
        var cacheKey = $"tenant:slug:{request.Slug.ToLowerInvariant()}";

        var tenant = await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct => await dbContext.Tenants.FirstOrDefaultAsync(t => t.Slug == request.Slug.ToLowerInvariant(), ct),
            TimeSpan.FromMinutes(30),
            ["tenants"],
            cancellationToken);

        if (tenant is null)
        {
            throw new NotFoundException($"Tenant with slug '{request.Slug}' was not found.");
        }

        var membership = await dbContext.TenantMembers
            .FirstOrDefaultAsync(tm => tm.TenantId == tenant.Id && tm.UserId == userId, cancellationToken);

        if (membership is null)
        {
            throw new ForbiddenException("You are not a member of this tenant.");
        }

        return new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            tenant.LogoUrl,
            tenant.IsActive,
            membership.IsOwner,
            tenant.CreatedAt);
    }
}

public class GetTenantEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tenants/by-slug/{slug}", async (string slug, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetTenantBySlugQuery(slug), ct);
            return Results.Ok(ApiResponse<TenantDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetTenantBySlug")
        .WithTags("Tenants");
    }
}
