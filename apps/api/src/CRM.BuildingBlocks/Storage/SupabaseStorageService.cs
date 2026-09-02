using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CRM.BuildingBlocks.Storage;

public class SupabaseStorageService(
    HttpClient httpClient,
    IOptions<SupabaseStorageOptions> options,
    ILogger<SupabaseStorageService> logger) : IFileStorageService
{
    private readonly SupabaseStorageOptions _options = options.Value;

    public async Task<string> UploadAsync(string bucket, string path, Stream content, string contentType, CancellationToken ct = default)
    {
        var cleanPath = path.TrimStart('/');
        var url = $"{_options.Url.TrimEnd('/')}/storage/v1/object/{bucket}/{cleanPath}";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("apikey", _options.ServiceRoleKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Headers.Add("x-upsert", "true");

        request.Content = new StreamContent(content);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType);

        var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Supabase Storage upload failed ({StatusCode}): {ErrorBody}", response.StatusCode, errorBody);
            throw new InvalidOperationException($"Dosya yükleme başarısız oldu: {response.StatusCode} - {errorBody}");
        }

        logger.LogInformation("File successfully uploaded to Supabase Storage: {Bucket}/{Path}", bucket, cleanPath);

        if (bucket == _options.PublicBucket)
        {
            return GetPublicUrl(bucket, cleanPath);
        }

        return await GetSignedUrlAsync(bucket, cleanPath, 900, ct);
    }

    public async Task<string> GetSignedUrlAsync(string bucket, string path, int expiresInSeconds = 900, CancellationToken ct = default)
    {
        var cleanPath = path.TrimStart('/');
        var url = $"{_options.Url.TrimEnd('/')}/storage/v1/object/sign/{bucket}/{cleanPath}";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("apikey", _options.ServiceRoleKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Content = JsonContent.Create(new { expiresIn = expiresInSeconds });

        var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Supabase Storage signed URL creation failed ({StatusCode}): {ErrorBody}", response.StatusCode, errorBody);
            throw new InvalidOperationException($"İmzalı URL üretilemedi: {response.StatusCode} - {errorBody}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        string? signedUrl = null;
        if (json.TryGetProperty("signedURL", out var prop))
        {
            signedUrl = prop.GetString();
        }
        else if (json.TryGetProperty("signedUrl", out prop))
        {
            signedUrl = prop.GetString();
        }

        if (string.IsNullOrWhiteSpace(signedUrl))
        {
            throw new InvalidOperationException("Supabase signed URL yanıtı geçersiz.");
        }

        if (signedUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || signedUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return signedUrl;
        }

        return $"{_options.Url.TrimEnd('/')}/storage/v1{signedUrl}";
    }

    public string GetPublicUrl(string bucket, string path)
    {
        var cleanPath = path.TrimStart('/');
        return $"{_options.Url.TrimEnd('/')}/storage/v1/object/public/{bucket}/{cleanPath}";
    }

    public async Task<bool> DeleteAsync(string bucket, string path, CancellationToken ct = default)
    {
        var cleanPath = path.TrimStart('/');
        var url = $"{_options.Url.TrimEnd('/')}/storage/v1/object/{bucket}";

        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Add("apikey", _options.ServiceRoleKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Content = JsonContent.Create(new { prefixes = new[] { cleanPath } });

        var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("Supabase Storage delete failed ({StatusCode}): {ErrorBody}", response.StatusCode, errorBody);
            return false;
        }

        return true;
    }
}
