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

            var cleanFolder = string.IsNullOrWhiteSpace(folder) ? "general" : Regex.Replace(folder.Trim().ToLower(), @"[^a-z0-9_-]", "");
            var cleanFileName = Regex.Replace(Path.GetFileName(file.FileName), @"[^a-zA-Z0-9_.-]", "_");
            var uniquePath = $"{tenantId.Value}/{cleanFolder}/{Guid.NewGuid():N}_{cleanFileName}";

            var opt = options.Value;
            var targetBucket = (isPublic == true) ? opt.PublicBucket : opt.PrivateBucket;

            await using var stream = file.OpenReadStream();
            var url = await storageService.UploadAsync(targetBucket, uniquePath, stream, file.ContentType, ct);

            var response = new StorageUploadResponse(
                FileKey: uniquePath,
                Bucket: targetBucket,
                Url: url,
                FileName: file.FileName,
                ContentType: file.ContentType,
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
