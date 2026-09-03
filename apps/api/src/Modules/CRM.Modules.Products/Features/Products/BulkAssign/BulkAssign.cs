using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Products.BulkAssign;

public record BulkAssignRequest(
    List<Guid> ProductIds,
    Guid? CategoryId,
    bool ClearCategory,
    string? Brand,
    string? Status,
    string[]? Tags,
    string[]? Images,
    bool AppendTags = true,
    bool AppendImages = true);

public record BulkAssignFailureDto(Guid ProductId, string Reason);

public record BulkAssignResponse(
    int UpdatedCount,
    int FailedCount,
    List<Guid> SucceededIds,
    List<BulkAssignFailureDto> Failures);

public record BulkAssignCommand(BulkAssignRequest Request) : ICommand<BulkAssignResponse>;

public class BulkAssignValidator : AbstractValidator<BulkAssignCommand>
{
    public BulkAssignValidator()
    {
        RuleFor(x => x.Request.ProductIds)
            .NotEmpty().WithMessage("En az bir ürün seçilmelidir.")
            .Must(ids => ids.Count <= 500).WithMessage("Tek seferde en fazla 500 ürün güncellenebilir.");
    }
}

public class BulkAssignHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<BulkAssignCommand, BulkAssignResponse>
{
    public async Task<Result<BulkAssignResponse>> Handle(BulkAssignCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var req = request.Request;
        var distinctIds = req.ProductIds.Distinct().ToList();

        // 1. Fetch all products belonging to current tenant in a single batch
        var products = await dbContext.Products
            .Where(p => distinctIds.Contains(p.Id) && p.TenantId == currentTenant.Id.Value)
            .ToListAsync(cancellationToken);

        var foundIds = products.Select(p => p.Id).ToHashSet();
        var failures = distinctIds
            .Where(id => !foundIds.Contains(id))
            .Select(id => new BulkAssignFailureDto(id, "Ürün bulunamadı veya bu işletmeye ait değil."))
            .ToList();

        var succeededIds = new List<Guid>();

        foreach (var product in products)
        {
            try
            {
                // Kategori atama / temizleme
                if (req.ClearCategory)
                {
                    product.CategoryId = null;
                }
                else if (req.CategoryId.HasValue)
                {
                    product.CategoryId = req.CategoryId.Value;
                }

                // Marka atama
                if (req.Brand is not null)
                {
                    product.Brand = req.Brand.Trim().Length > 0 ? req.Brand.Trim() : null;
                }

                // Durum atama
                if (!string.IsNullOrWhiteSpace(req.Status))
                {
                    product.Status = req.Status.Trim();
                }

                // Etiketler
                if (req.Tags is not null && req.Tags.Length > 0)
                {
                    if (req.AppendTags && product.Tags is not null && product.Tags.Length > 0)
                    {
                        var merged = new HashSet<string>(product.Tags, StringComparer.OrdinalIgnoreCase);
                        foreach (var tag in req.Tags)
                        {
                            if (!string.IsNullOrWhiteSpace(tag))
                                merged.Add(tag.Trim());
                        }
                        product.Tags = merged.ToArray();
                    }
                    else
                    {
                        product.Tags = req.Tags.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct().ToArray();
                    }
                }

                // Görseller
                if (req.Images is not null && req.Images.Length > 0)
                {
                    if (req.AppendImages && product.Images is not null && product.Images.Length > 0)
                    {
                        var merged = new HashSet<string>(product.Images, StringComparer.OrdinalIgnoreCase);
                        foreach (var img in req.Images)
                        {
                            if (!string.IsNullOrWhiteSpace(img))
                                merged.Add(img.Trim());
                        }
                        product.Images = merged.ToArray();
                    }
                    else
                    {
                        product.Images = req.Images.Where(i => !string.IsNullOrWhiteSpace(i)).Select(i => i.Trim()).Distinct().ToArray();
                    }
                }

                product.UpdatedAt = DateTime.UtcNow;
                succeededIds.Add(product.Id);
            }
            catch (Exception ex)
            {
                failures.Add(new BulkAssignFailureDto(product.Id, ex.Message));
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var result = new BulkAssignResponse(
            UpdatedCount: succeededIds.Count,
            FailedCount: failures.Count,
            SucceededIds: succeededIds,
            Failures: failures);

        return Result.Success(result);
    }
}

public class BulkAssignEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/products/bulk-assign", async (
            BulkAssignRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new BulkAssignCommand(request), ct);
            return Results.Ok(ApiResponse<BulkAssignResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Products.Update")
        .WithName("BulkAssignProducts")
        .WithTags("Products");
    }
}
