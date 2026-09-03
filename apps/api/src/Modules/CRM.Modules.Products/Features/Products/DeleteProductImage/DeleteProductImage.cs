using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Storage;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Products.DeleteProductImage;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

public record DeleteProductImageResponse(
    Guid ProductId,
    string RemovedImageUrl,
    int TotalImages);

// ---------------------------------------------------------------------------
// Command / Handler — physical delete via Supabase + DB images[] update
// ---------------------------------------------------------------------------

public record DeleteProductImageCommand(
    Guid ProductId,
    string ImageUrl) : ICommand<DeleteProductImageResponse>;

public class DeleteProductImageValidator : AbstractValidator<DeleteProductImageCommand>
{
    public DeleteProductImageValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.ImageUrl).NotEmpty().MaximumLength(2000);
    }
}

public class DeleteProductImageHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant,
    IFileStorageService storageService) : ICommandHandler<DeleteProductImageCommand, DeleteProductImageResponse>
{
    public const string Bucket = "product-images";

    public async Task<Result<DeleteProductImageResponse>> Handle(DeleteProductImageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var product = await dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId && p.TenantId == tenantId, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product '{request.ProductId}' not found.");
        }

        var currentImages = product.Images ?? [];
        var matched = currentImages.FirstOrDefault(u =>
            string.Equals(u, request.ImageUrl, StringComparison.OrdinalIgnoreCase));

        if (matched == null)
        {
            throw new NotFoundException("Image not found on this product.");
        }

        // Tenant isolation: only allow deleting images under this tenant's prefix
        var storagePath = ExtractStoragePath(matched);
        if (storagePath == null || !storagePath.StartsWith($"{tenantId}/", StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenException("Image does not belong to this tenant.");
        }

        try
        {
            await storageService.DeleteAsync(Bucket, storagePath, cancellationToken);
        }
        catch (Exception ex) when (ex is not AppException)
        {
            throw new BadRequestException($"Image delete failed: {ex.Message}", "IMAGE_DELETE_FAILED");
        }

        product.Images = currentImages
            .Where(u => !string.Equals(u, matched, StringComparison.OrdinalIgnoreCase))
            .ToArray();
        product.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new DeleteProductImageResponse(
            product.Id,
            matched,
            product.Images.Length));
    }

    /// <summary>
    /// Extracts the storage path ({tenant_id}/{product_id}/{file}) from a stored
    /// public URL or a raw storage path. Returns null when it cannot be resolved.
    /// </summary>
    internal static string? ExtractStoragePath(string stored)
    {
        if (string.IsNullOrWhiteSpace(stored))
        {
            return null;
        }

        var value = stored.Trim().TrimStart('/');

        // Public URL form: .../storage/v1/object/public/{bucket}/{tenant}/{product}/{file}
        const string marker = "/storage/v1/object/public/";
        var markerIdx = value.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIdx >= 0)
        {
            var after = value[(markerIdx + marker.Length)..];
            var slashIdx = after.IndexOf('/');
            if (slashIdx < 0)
            {
                return null;
            }

            return after[(slashIdx + 1)..].TrimStart('/');
        }

        // Already a raw storage path
        return value;
    }
}

// ---------------------------------------------------------------------------
// Endpoint — DELETE /api/products/{id}/images?imageUrl=...
// ---------------------------------------------------------------------------

public class DeleteProductImageEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/products/{id:guid}/images", async (
            Guid id,
            [FromQuery] string imageUrl,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(imageUrl))
            {
                return Results.BadRequest(ApiResponse<DeleteProductImageResponse>.Fail("IMAGE_URL_REQUIRED", "Query parameter 'imageUrl' is required."));
            }

            try
            {
                var result = await sender.Send(new DeleteProductImageCommand(id, imageUrl), ct);
                return result.IsSuccess
                    ? Results.Ok(ApiResponse<DeleteProductImageResponse>.Ok(result.Value, "Görsel silindi."))
                    : Results.BadRequest(ApiResponse<DeleteProductImageResponse>.Fail(result.Error.Code, result.Error.Description));
            }
            catch (NotFoundException ex)
            {
                return Results.NotFound(ApiResponse<DeleteProductImageResponse>.Fail(ex.Code, ex.Message));
            }
            catch (Exception ex) when (ex is AppException appEx)
            {
                return Results.BadRequest(ApiResponse<DeleteProductImageResponse>.Fail(appEx.Code, appEx.Message));
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ApiResponse<DeleteProductImageResponse>.Fail("IMAGE_DELETE_FAILED", $"Image delete failed: {ex.Message}"));
            }
        })
        .RequireAuthorization()
        .RequirePermission("Products.Update")
        .WithName("DeleteProductImage")
        .WithSummary("Delete product image — physical Supabase delete + DB update")
        .WithDescription("Removes the image URL from product.images and physically deletes the object from Supabase Storage bucket 'product-images'. Tenant isolation enforced.")
        .WithTags("Products");
    }
}
