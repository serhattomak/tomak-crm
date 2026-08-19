using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using CRM.Modules.Products.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Categories.GetProductCategories;

public record ProductCategoryDto(
    Guid Id,
    Guid TenantId,
    Guid? ParentId,
    string? ParentName,
    string Name,
    string FullPath,
    string Slug,
    string? Description,
    string? Icon,
    bool IsActive,
    int ProductsCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GetProductCategoriesQuery() : IQuery<List<ProductCategoryDto>>;

public class GetProductCategoriesHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetProductCategoriesQuery, List<ProductCategoryDto>>
{
    public async Task<Result<List<ProductCategoryDto>>> Handle(GetProductCategoriesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var rawCategories = await dbContext.ProductCategories
            .Where(c => c.TenantId == tenantId)
            .Include(c => c.Parent)
            .Include(c => c.Products)
            .ToListAsync(cancellationToken);

        // Build hierarchical path
        string GetPath(ProductCategory cat)
        {
            var parts = new List<string> { cat.Name };
            var current = cat;
            while (current.ParentId.HasValue)
            {
                var parent = rawCategories.FirstOrDefault(c => c.Id == current.ParentId.Value);
                if (parent == null || parent.Id == current.Id) break;
                parts.Insert(0, parent.Name);
                current = parent;
            }
            return string.Join(" > ", parts);
        }

        var categories = rawCategories
            .Select(c => new ProductCategoryDto(
                c.Id,
                c.TenantId,
                c.ParentId,
                c.Parent != null ? c.Parent.Name : null,
                c.Name,
                GetPath(c),
                c.Slug,
                c.Description,
                c.Icon,
                c.IsActive,
                c.Products.Count,
                c.CreatedAt,
                c.UpdatedAt))
            .OrderBy(c => c.FullPath)
            .ToList();

        return Result.Success(categories);
    }
}

public class GetProductCategoriesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/products/categories", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProductCategoriesQuery(), ct);
            return Results.Ok(ApiResponse<List<ProductCategoryDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.View")
        .WithName("GetProductCategories")
        .WithTags("Products");
    }
}
