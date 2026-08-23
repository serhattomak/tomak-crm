using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.Admin.GetAdminTenants;

public record AdminTenantListItemDto(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string? Industry,
    string? IndustryTemplateName,
    bool IsActive,
    int MemberCount,
    int EnabledModuleCount,
    DateTime CreatedAt);

public record GetAdminTenantsQuery(string? Search = null) : IQuery<AdminTenantListItemDto[]>;

public class GetAdminTenantsHandler(TenantsDbContext dbContext) : IQueryHandler<GetAdminTenantsQuery, AdminTenantListItemDto[]>
{
    public async Task<Result<AdminTenantListItemDto[]>> Handle(GetAdminTenantsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Tenants
            .AsNoTracking()
            .Include(t => t.IndustryTemplate)
            .Include(t => t.Members)
            .Include(t => t.Modules)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();
            query = query.Where(t => t.Name.ToLower().Contains(search) || t.Slug.ToLower().Contains(search));
        }

        var list = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new AdminTenantListItemDto(
                t.Id,
                t.Name,
                t.Slug,
                t.LogoUrl,
                t.Industry,
                t.IndustryTemplate != null ? t.IndustryTemplate.Name : null,
                t.IsActive,
                t.Members.Count,
                t.Modules.Count(m => m.IsEnabled),
                t.CreatedAt
            ))
            .ToArrayAsync(cancellationToken);

        return list;
    }
}

public class GetAdminTenantsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/admin/tenants", async (string? search, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetAdminTenantsQuery(search), ct);
            return Results.Ok(ApiResponse<AdminTenantListItemDto[]>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequireSuperAdmin()
        .WithName("GetAdminTenants")
        .WithTags("Admin");
    }
}
