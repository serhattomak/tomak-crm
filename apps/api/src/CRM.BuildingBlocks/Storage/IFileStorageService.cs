namespace CRM.BuildingBlocks.Storage;

public interface IFileStorageService
{
    Task<string> UploadAsync(string bucket, string path, Stream content, string contentType, CancellationToken ct = default);
    Task<string> GetSignedUrlAsync(string bucket, string path, int expiresInSeconds = 900, CancellationToken ct = default);
    string GetPublicUrl(string bucket, string path);
    Task<bool> DeleteAsync(string bucket, string path, CancellationToken ct = default);
}
