using System.Text.RegularExpressions;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Storage;
using CRM.BuildingBlocks.Tenancy;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

namespace CRM.Api.Endpoints;

public record StorageUploadResponse(
    string FileKey,
    string Bucket,
    string Url,
    string FileName,
    string ContentType,
    long Size);

public class StorageEndpoints : IEndpoint
{
    private const long MaxUploadBytes = 25 * 1024 * 1024;

    // The bucket serves whatever content type it was given, from the Supabase
    // origin. Script-capable types (.svg, .html, .js) are refused by extension,
    // and the declared content type must agree with a known safe family.
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".csv", ".txt",
        ".doc", ".docx", ".xls", ".xlsx", ".zip", ".rar", ".7z",
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/png", "image/jpeg", "image/webp", "image/gif",
        "text/csv", "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip", "application/x-zip-compressed",
        "application/x-rar-compressed", "application/x-7z-compressed",
    };

    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/storage")
            .RequireAuthorization()
            .WithTags("Storage");

        // 1. Upload File
        group.MapPost("/upload", async (
            [FromForm] IFormFile file,
            [FromForm] string? folder,
            [FromForm] bool? isPublic,
            IFileStorageService storageService,
            ICurrentTenant currentTenant,
            IOptions<SupabaseStorageOptions> options,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id;
            if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
            {
                return Results.BadRequest(ApiResponse<StorageUploadResponse>.Fail("Storage.TenantRequired", "Tenant bilgisi bulunamadı."));
            }

            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(ApiResponse<StorageUploadResponse>.Fail("Storage.FileRequired", "Yüklenecek dosya seçilmedi."));
            }

            if (file.Length > MaxUploadBytes)
            {
                return Results.BadRequest(ApiResponse<StorageUploadResponse>.Fail(
                    "Storage.FileTooLarge",
                    $"Dosya boyutu en fazla {MaxUploadBytes / (1024 * 1024)} MB olabilir."));
            }

            var extension = Path.GetExtension(file.FileName);
            var contentType = (file.ContentType ?? string.Empty).Split(';')[0].Trim();
            if (!AllowedExtensions.Contains(extension) || !AllowedContentTypes.Contains(contentType))
            {
                return Results.BadRequest(ApiResponse<StorageUploadResponse>.Fail(
                    "Storage.FileTypeNotAllowed",
                    "Desteklenmeyen dosya türü. PDF, görsel, Office, CSV, metin veya arşiv yükleyin."));
            }

            if (isPublic == true && !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(ApiResponse<StorageUploadResponse>.Fail(
                    "Storage.PublicImagesOnly",
                    "Herkese açık bucket yalnız görsel kabul eder."));
            }

            var cleanFolder = string.IsNullOrWhiteSpace(folder) ? "general" : Regex.Replace(folder.Trim().ToLower(), @"[^a-z0-9_-]", "");
            var cleanFileName = Regex.Replace(Path.GetFileName(file.FileName), @"[^a-zA-Z0-9_.-]", "_");
            var uniquePath = $"{tenantId.Value}/{cleanFolder}/{Guid.NewGuid():N}_{cleanFileName}";

            var opt = options.Value;
            var targetBucket = (isPublic == true) ? opt.PublicBucket : opt.PrivateBucket;

            await using var stream = file.OpenReadStream();
            var url = await storageService.UploadAsync(targetBucket, uniquePath, stream, contentType, ct);

            var response = new StorageUploadResponse(
                FileKey: uniquePath,
                Bucket: targetBucket,
                Url: url,
                FileName: file.FileName,
                ContentType: contentType,
                Size: file.Length);

            return Results.Ok(ApiResponse<StorageUploadResponse>.Ok(response));
        })
        .DisableAntiforgery()
        .WithName("UploadFile");

        // 2. Get Signed URL for private documents
        group.MapGet("/signed-url", async (
            [FromQuery] string fileKey,
            [FromQuery] string? bucket,
            [FromQuery] int? expiresIn,
            IFileStorageService storageService,
            ICurrentTenant currentTenant,
            IOptions<SupabaseStorageOptions> options,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id;
            if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
            {
                return Results.BadRequest(ApiResponse<string>.Fail("Storage.TenantRequired", "Tenant bilgisi bulunamadı."));
            }

            if (string.IsNullOrWhiteSpace(fileKey))
            {
                return Results.BadRequest(ApiResponse<string>.Fail("Storage.KeyRequired", "Dosya anahtarı (fileKey) zorunludur."));
            }

            // Security: Ensure tenant can only access their own directory
            var expectedPrefix = $"{tenantId.Value}/";
            if (!fileKey.TrimStart('/').StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Forbid();
            }

            var targetBucket = string.IsNullOrWhiteSpace(bucket) ? options.Value.PrivateBucket : bucket;
            var seconds = expiresIn.HasValue && expiresIn.Value > 0 ? expiresIn.Value : 900;

            var url = await storageService.GetSignedUrlAsync(targetBucket, fileKey, seconds, ct);
            return Results.Ok(ApiResponse<string>.Ok(url));
        })
        .WithName("GetSignedUrl");

        // 3. Delete File
        group.MapDelete("/file", async (
            [FromQuery] string fileKey,
            [FromQuery] string? bucket,
            IFileStorageService storageService,
            ICurrentTenant currentTenant,
            IOptions<SupabaseStorageOptions> options,
            CancellationToken ct) =>
        {
            var tenantId = currentTenant.Id;
            if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
            {
                return Results.BadRequest(ApiResponse<bool>.Fail("Storage.TenantRequired", "Tenant bilgisi bulunamadı."));
            }

            if (string.IsNullOrWhiteSpace(fileKey))
            {
                return Results.BadRequest(ApiResponse<bool>.Fail("Storage.KeyRequired", "Dosya anahtarı (fileKey) zorunludur."));
            }

            var expectedPrefix = $"{tenantId.Value}/";
            if (!fileKey.TrimStart('/').StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Forbid();
            }

            var targetBucket = string.IsNullOrWhiteSpace(bucket) ? options.Value.PrivateBucket : bucket;
            var success = await storageService.DeleteAsync(targetBucket, fileKey, ct);
            return Results.Ok(ApiResponse<bool>.Ok(success));
        })
        .WithName("DeleteFile");
    }
}
