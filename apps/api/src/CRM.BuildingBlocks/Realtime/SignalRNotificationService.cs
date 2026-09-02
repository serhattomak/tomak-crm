using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CRM.BuildingBlocks.Realtime;

public class SignalRNotificationService(
    IHubContext<CrmHub> hubContext,
    IServiceProvider serviceProvider,
    ILogger<SignalRNotificationService> logger) : ICrmNotificationService
{
    public async Task SendToTenantAsync(Guid tenantId, string eventName, object data, CancellationToken ct = default)
    {
        try
        {
            await hubContext.Clients.Group($"tenant_{tenantId}").SendAsync(eventName, data, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send SignalR event {EventName} to tenant {TenantId}", eventName, tenantId);
        }
    }

    public async Task SendToUserAsync(Guid tenantId, Guid userId, string eventName, object data, CancellationToken ct = default)
    {
        try
        {
            await hubContext.Clients.Group($"user_{userId}").SendAsync(eventName, data, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send SignalR event {EventName} to user {UserId}", eventName, userId);
        }
    }

    public async Task SendNotificationAsync(
        Guid tenantId,
        Guid? userId,
        string title,
        string message,
        string? linkUrl = null,
        string type = "info",
        CancellationToken ct = default)
    {
        var notificationId = Guid.NewGuid();

        // 1. Try to persist into database if INotificationStore is available
        try
        {
            using var scope = serviceProvider.CreateScope();
            var store = scope.ServiceProvider.GetService<INotificationStore>();
            if (store != null)
            {
                notificationId = await store.CreateNotificationAsync(
                    tenantId,
                    userId,
                    title,
                    message,
                    linkUrl,
                    type,
                    "general",
                    ct);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not persist notification to database for tenant {TenantId}", tenantId);
        }

        // 2. Broadcast over SignalR
        var payload = new CrmNotificationPayload(
            Id: notificationId,
            Title: title,
            Message: message,
            LinkUrl: linkUrl,
            Type: type,
            CreatedAt: DateTime.UtcNow);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            await SendToUserAsync(tenantId, userId.Value, "ReceiveNotification", payload, ct);
        }
        else
        {
            await SendToTenantAsync(tenantId, "ReceiveNotification", payload, ct);
        }
    }
}
