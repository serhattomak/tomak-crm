using CRM.BuildingBlocks.Realtime;
using CRM.Modules.Identity.Data;
using CRM.Modules.Identity.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Identity.Services;

public class NotificationStore(IdentityDbContext dbContext) : INotificationStore
{
    public async Task<Guid> CreateNotificationAsync(
        Guid tenantId,
        Guid? userId,
        string title,
        string message,
        string? linkUrl,
        string type = "info",
        string category = "general",
        CancellationToken ct = default)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Title = title,
            Message = message,
            LinkUrl = linkUrl,
            Type = type,
            Category = category,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Notifications.Add(notification);
        await dbContext.SaveChangesAsync(ct);

        return notification.Id;
    }

    public async Task<PagedNotificationsResult> GetNotificationsAsync(
        Guid tenantId,
        Guid? userId,
        bool? isRead,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.TenantId == tenantId);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(n => n.UserId == null || n.UserId == userId.Value);
        }

        var unreadCount = await query.CountAsync(n => !n.IsRead, ct);

        if (isRead.HasValue)
        {
            query = query.Where(n => n.IsRead == isRead.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationItemDto(
                n.Id,
                n.TenantId,
                n.UserId,
                n.Title,
                n.Message,
                n.LinkUrl,
                n.Type,
                n.Category,
                n.IsRead,
                n.ReadAt,
                n.CreatedAt))
            .ToListAsync(ct);

        return new PagedNotificationsResult(items, totalCount, unreadCount);
    }

    public async Task<int> GetUnreadCountAsync(
        Guid tenantId,
        Guid? userId,
        CancellationToken ct = default)
    {
        var query = dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.TenantId == tenantId && !n.IsRead);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(n => n.UserId == null || n.UserId == userId.Value);
        }

        return await query.CountAsync(ct);
    }

    public async Task<bool> MarkAsReadAsync(
        Guid tenantId,
        Guid notificationId,
        CancellationToken ct = default)
    {
        var notification = await dbContext.Notifications
            .FirstOrDefaultAsync(n => n.TenantId == tenantId && n.Id == notificationId, ct);

        if (notification == null)
        {
            return false;
        }

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> MarkAllAsReadAsync(
        Guid tenantId,
        Guid? userId,
        CancellationToken ct = default)
    {
        var query = dbContext.Notifications
            .Where(n => n.TenantId == tenantId && !n.IsRead);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(n => n.UserId == null || n.UserId == userId.Value);
        }

        var now = DateTime.UtcNow;
        var unreadList = await query.ToListAsync(ct);
        foreach (var n in unreadList)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }

        await dbContext.SaveChangesAsync(ct);
        return unreadList.Count;
    }

    public async Task<bool> DeleteAsync(
        Guid tenantId,
        Guid notificationId,
        CancellationToken ct = default)
    {
        var notification = await dbContext.Notifications
            .FirstOrDefaultAsync(n => n.TenantId == tenantId && n.Id == notificationId, ct);

        if (notification == null)
        {
            return false;
        }

        dbContext.Notifications.Remove(notification);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> ClearAllAsync(
        Guid tenantId,
        Guid? userId,
        CancellationToken ct = default)
    {
        var query = dbContext.Notifications
            .Where(n => n.TenantId == tenantId);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(n => n.UserId == null || n.UserId == userId.Value);
        }

        var list = await query.ToListAsync(ct);
        dbContext.Notifications.RemoveRange(list);
        await dbContext.SaveChangesAsync(ct);
        return list.Count;
    }
}
