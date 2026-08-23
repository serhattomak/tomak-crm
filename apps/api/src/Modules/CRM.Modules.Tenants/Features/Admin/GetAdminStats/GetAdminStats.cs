using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.Admin.GetAdminStats;

public record IndustryStatDto(string Industry, int Count);

public record AdminStatsDto(
    int TotalTenants,
    int ActiveTenants,
    int SuspendedTenants,
    int TotalMembers,
    int TotalTemplates,
    List<IndustryStatDto> IndustryDistribution);

public record GetAdminStatsQuery : IQuery<AdminStatsDto>;

public class GetAdminStatsHandler(TenantsDbContext dbContext) : IQueryHandler<GetAdminStatsQuery, AdminStatsDto>
{
    public async Task<Result<AdminStatsDto>> Handle(GetAdminStatsQuery request, CancellationToken cancellationToken)
    {
        var totalTenants = await dbContext.Tenants.CountAsync(cancellationToken);
        var activeTenants = await dbContext.Tenants.CountAsync(t => t.IsActive, cancellationToken);
        var totalMembers = await dbContext.TenantMembers.CountAsync(cancellationToken);
        var totalTemplates = await dbContext.IndustryTemplates.CountAsync(cancellationToken);

        var industries = await dbContext.Tenants
            .GroupBy(t => t.Industry ?? "Genel")
            .Select(g => new IndustryStatDto(g.Key, g.Count()))
            .ToListAsync(cancellationToken);

        return new AdminStatsDto(
            totalTenants,
            activeTenants,
            totalTenants - activeTenants,
            totalMembers,
            totalTemplates,
            industries
        );
    }
}

public class GetAdminStatsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/admin/stats", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetAdminStatsQuery(), ct);
            return Results.Ok(ApiResponse<AdminStatsDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequireSuperAdmin()
        .WithName("GetAdminStats")
        .WithTags("Admin");
    }
}
