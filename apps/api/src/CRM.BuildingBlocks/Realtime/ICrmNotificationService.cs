namespace CRM.BuildingBlocks.Realtime;

public record CrmNotificationPayload(
    Guid Id,
    string Title,
    string Message,
    string? LinkUrl,
    string Type, // "info", "success", "warning", "error"
    DateTime CreatedAt);

public interface ICrmNotificationService
{
    Task SendToTenantAsync(Guid tenantId, string eventName, object data, CancellationToken ct = default);
    Task SendToUserAsync(Guid tenantId, Guid userId, string eventName, object data, CancellationToken ct = default);
    Task SendNotificationAsync(Guid tenantId, Guid? userId, string title, string message, string? linkUrl = null, string type = "info", CancellationToken ct = default);
}
