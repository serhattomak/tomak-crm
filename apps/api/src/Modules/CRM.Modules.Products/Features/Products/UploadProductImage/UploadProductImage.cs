using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Storage;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Products.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Products.Features.Products.UploadProductImage;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

public record UploadProductImageResponse(
    Guid ProductId,
    string ImageUrl,
    string StoragePath,
    string FileName,
    long SizeBytes,
    int TotalImages);

// ---------------------------------------------------------------------------
// Command / Handler — 5MB, JPG/PNG/WebP, max 10, tenant/product/ts-slug path
// ---------------------------------------------------------------------------

public record UploadProductImageCommand(
    Guid ProductId,
    string FileName,
    byte[] Content,
    string ContentType) : ICommand<UploadProductImageResponse>;

public class UploadProductImageValidator : AbstractValidator<UploadProductImageCommand>
{
    public const long MaxBytes = 5 * 1024 * 1024;
    public const int MaxImages = 10;

    private static readonly string[] AllowedExt = [".jpg", ".jpeg", ".png", ".webp"];

    public UploadProductImageValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Content).NotNull().Must(b => b.Length > 0).WithMessage("File content is empty.");
        RuleFor(x => x.Content).Must(b => b.Length <= MaxBytes).WithMessage("Image exceeds 5MB limit.");
        RuleFor(x => x.FileName).Must(HaveAllowedExtension).WithMessage("Image must be JPG, PNG or WebP.");
        RuleFor(x => x.ContentType).Must(BeAllowedMime).WithMessage("MIME must be image/jpeg, image/png or image/webp.");
    }

    private static bool HaveAllowedExtension(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return AllowedExt.Contains(ext);
    }

    private static bool BeAllowedMime(string ct)
    {
        if (string.IsNullOrWhiteSpace(ct))
        {
            return true; // extension check is primary; allow empty ct from some clients
        }

        var v = ct.Trim().ToLowerInvariant();
        return v is "image/jpeg"
            or "image/png"
            or "image/webp"
            or "application/octet-stream"; // fallback when browser sends generic
    }
}

public class UploadProductImageHandler(
    ProductsDbContext dbContext,
    ICurrentTenant currentTenant,
    IFileStorageService storageService) : ICommandHandler<UploadProductImageCommand, UploadProductImageResponse>
{
    public const string Bucket = "product-images";
    private const long MaxBytes = 5 * 1024 * 1024;
    private const int MaxImages = 10;

    private static readonly HashSet<string> AllowedExt = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    public async Task<Result<UploadProductImageResponse>> Handle(UploadProductImageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        // Double-check size + ext even if validator runs (handler may be called directly)
        if (request.Content.Length > MaxBytes)
        {
            throw new BadRequestException($"Image exceeds 5MB limit ({request.Content.Length} bytes).", "IMAGE_TOO_LARGE");
        }

        var ext = Path.GetExtension(request.FileName).ToLowerInvariant();
        if (!AllowedExt.Contains(ext))
        {
            throw new BadRequestException("Image must be JPG, PNG or WebP.", "INVALID_IMAGE_TYPE");
        }

        var product = await dbContext.Products
            .FirstOrDefaultAsync(p => p.Id == request.ProductId && p.TenantId == tenantId, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"Product '{request.ProductId}' not found.");
        }

        var currentImages = product.Images ?? [];
        if (currentImages.Length >= MaxImages)
        {
            throw new BadRequestException($"Product already has the maximum of {MaxImages} images.", "IMAGE_LIMIT_REACHED");
        }

        var sanitized = SanitizeFileName(request.FileName);
        var ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var storagePath = $"{tenantId}/{request.ProductId}/{ts}-{sanitized}";

        string publicUrl;
        try
        {
            await using var stream = new MemoryStream(request.Content, writable: false);
            // Upload first; then resolve the stable public URL explicitly. (UploadAsync
            // only returns a public URL for the default public bucket, so we build it
            // via GetPublicUrl since 'product-images' is a dedicated public bucket.)
            await storageService.UploadAsync(Bucket, storagePath, stream, request.ContentType, cancellationToken);
            publicUrl = storageService.GetPublicUrl(Bucket, storagePath);
        }
        catch (Exception ex) when (ex is not AppException)
        {
            throw new BadRequestException($"Image upload failed: {ex.Message}", "IMAGE_UPLOAD_FAILED");
        }

        product.Images = [.. currentImages, publicUrl];
        product.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new UploadProductImageResponse(
            product.Id,
            publicUrl,
            storagePath,
            sanitized,
            request.Content.Length,
            product.Images.Length));
    }

    private static string SanitizeFileName(string fileName)
    {
        var name = Path.GetFileName(fileName.Trim()).ToLowerInvariant();
        var invalid = Path.GetInvalidFileNameChars();
        foreach (var c in invalid)
        {
            name = name.Replace(c, '_');
        }

        name = name.Replace(" ", "-");

        // Prevent path traversal
        name = name.Replace("/", "_").Replace("\\", "_");

        if (name.Length > 200)
        {
            var ext2 = Path.GetExtension(name);
            var stem = Path.GetFileNameWithoutExtension(name);
            name = stem[..Math.Min(stem.Length, 190)] + ext2;
        }

        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(Path.GetFileNameWithoutExtension(name)))
        {
            name = $"image-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.jpg";
        }

        return name;
    }
}

// ---------------------------------------------------------------------------
// Endpoint — POST /api/products/{id}/images/upload  multipart file field 'file'
// ---------------------------------------------------------------------------

public class UploadProductImageEndpoint : IEndpoint
{
    private const long MaxBytes = 5 * 1024 * 1024;

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/products/{id:guid}/images/upload", async (
            Guid id,
            HttpContext httpContext,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            if (!httpContext.Request.HasFormContentType)
            {
                return Results.BadRequest(ApiResponse<UploadProductImageResponse>.Fail("INVALID_CONTENT_TYPE", "Content-Type must be multipart/form-data with file field 'file'."));
            }

            var form = await httpContext.Request.ReadFormAsync(ct);
            var file = form.Files.GetFile("file") ?? form.Files.GetFile("image") ?? form.Files.FirstOrDefault();

            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(ApiResponse<UploadProductImageResponse>.Fail("IMAGE_EMPTY", "No file uploaded. Send multipart file field 'file'."));
            }

            if (file.Length > MaxBytes)
            {
                return Results.BadRequest(ApiResponse<UploadProductImageResponse>.Fail("IMAGE_TOO_LARGE", $"Image exceeds 5MB limit ({file.Length} bytes)."));
            }

            var fileName = string.IsNullOrWhiteSpace(file.FileName) ? "image.jpg" : file.FileName.Trim();
            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp")
            {
                return Results.BadRequest(ApiResponse<UploadProductImageResponse>.Fail("INVALID_IMAGE_TYPE", "Image must be JPG, PNG or WebP."));
            }

            byte[] content;
            await using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms, ct);
                content = ms.ToArray();
            }

            try
            {
                var cmd = new UploadProductImageCommand(id, fileName, content, file.ContentType ?? "application/octet-stream");
                var result = await sender.Send(cmd, ct);
                return result.IsSuccess
                    ? Results.Ok(ApiResponse<UploadProductImageResponse>.Ok(result.Value, "Görsel yüklendi."))
                    : Results.BadRequest(ApiResponse<UploadProductImageResponse>.Fail(result.Error.Code, result.Error.Description));
            }
            catch (Exception ex) when (ex is AppException appEx)
            {
                return Results.BadRequest(ApiResponse<UploadProductImageResponse>.Fail(appEx.Code, appEx.Message));
            }
            catch (Exception ex)
            {
                return Results.BadRequest(ApiResponse<UploadProductImageResponse>.Fail("IMAGE_UPLOAD_FAILED", $"Image upload failed: {ex.Message}"));
            }
        })
        .RequireAuthorization()
        .RequirePermission("Products.Update")
        .DisableAntiforgery()
        .WithName("UploadProductImage")
        .WithSummary("Upload image for product — 5MB JPG/PNG/WebP, max 10")
        .WithDescription("Validates 5MB limit and MIME whitelist JPG/PNG/WebP, uploads to Supabase Storage bucket 'product-images' path tenant/product/timestamp-slug, appends public URL to product.images. Tenant isolation enforced.")
        .WithTags("Products");
    }
}
