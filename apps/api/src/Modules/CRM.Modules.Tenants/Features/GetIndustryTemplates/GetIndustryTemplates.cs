using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.GetIndustryTemplates;

public record IndustryTemplateDto(
    Guid Id,
    string Key,
    string Name,
    string? Description,
    string LabelsJson,
    string[] DefaultModules,
    DateTime CreatedAt);

public record GetIndustryTemplatesQuery : IQuery<IndustryTemplateDto[]>;

public class GetIndustryTemplatesHandler(
    TenantsDbContext dbContext,
    ICacheService cacheService) : IQueryHandler<GetIndustryTemplatesQuery, IndustryTemplateDto[]>
{
    public async Task<Result<IndustryTemplateDto[]>> Handle(GetIndustryTemplatesQuery request, CancellationToken cancellationToken)
    {
        return await cacheService.GetOrCreateAsync(
            "industry-templates:all",
            async ct =>
            {
                var templates = await dbContext.IndustryTemplates
                    .AsNoTracking()
                    .OrderBy(t => t.Name)
                    .Select(t => new IndustryTemplateDto(
                        t.Id,
                        t.Key,
                        t.Name,
                        t.Description,
                        t.LabelsJson,
                        t.DefaultModules,
                        t.CreatedAt
                    ))
                    .ToArrayAsync(ct);

                return templates;
            },
            TimeSpan.FromHours(2),
            ["industry-templates"],
            cancellationToken
        );
    }
}

public class GetIndustryTemplatesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/industry-templates", async (MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetIndustryTemplatesQuery(), ct);
            return Results.Ok(ApiResponse<IndustryTemplateDto[]>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetIndustryTemplates")
        .WithTags("Tenants");
    }
}
