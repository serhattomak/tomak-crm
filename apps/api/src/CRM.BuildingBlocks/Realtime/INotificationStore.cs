namespace CRM.BuildingBlocks.Realtime;

public record NotificationItemDto(
    Guid Id,
    Guid TenantId,
    Guid? UserId,
    string Title,
    string Message,
    string? LinkUrl,
    string Type,
    string Category,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt);

public record PagedNotificationsResult(
    List<NotificationItemDto> Items,
    int TotalCount,
    int UnreadCount);

public interface INotificationStore
{
    Task<Guid> CreateNotificationAsync(
        Guid tenantId,
        Guid? userId,
        string title,
        string message,
        string? linkUrl,
        string type = "info",
        string category = "general",
        CancellationToken ct = default);

    Task<PagedNotificationsResult> GetNotificationsAsync(
        Guid tenantId,
        Guid? userId,
        bool? isRead,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<int> GetUnreadCountAsync(
        Guid tenantId,
        Guid? userId,
        CancellationToken ct = default);

    Task<bool> MarkAsReadAsync(
        Guid tenantId,
        Guid notificationId,
        CancellationToken ct = default);

    Task<int> MarkAllAsReadAsync(
        Guid tenantId,
        Guid? userId,
        CancellationToken ct = default);

    Task<bool> DeleteAsync(
        Guid tenantId,
        Guid notificationId,
        CancellationToken ct = default);

    Task<int> ClearAllAsync(
        Guid tenantId,
        Guid? userId,
        CancellationToken ct = default);
}
