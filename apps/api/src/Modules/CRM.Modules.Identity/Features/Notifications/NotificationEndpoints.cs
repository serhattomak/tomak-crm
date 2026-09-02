using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Realtime;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Identity.Features.Notifications;

public class NotificationEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications")
            .WithTags("Notifications")
            .RequireAuthorization();

        // 1. Get notifications
        group.MapGet("/", async (
            bool? isRead,
            int? page,
            int? pageSize,
            INotificationStore store,
            ICurrentTenant currentTenant,
            ICurrentUser currentUser,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new ForbiddenException("Tenant context is required.");
            }

            var result = await store.GetNotificationsAsync(
                currentTenant.Id.Value,
                currentUser.Id,
                isRead,
                page ?? 1,
                pageSize ?? 20,
                ct);

            return Results.Ok(ApiResponse<PagedNotificationsResult>.Ok(result));
        })
        .WithName("GetNotifications")
        .WithSummary("Kullanıcıya veya kiracıya ait bildirimleri listeler.");

        // 2. Mark notification as read
        group.MapPost("/{id:guid}/read", async (
            Guid id,
            INotificationStore store,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new ForbiddenException("Tenant context is required.");
            }

            var success = await store.MarkAsReadAsync(currentTenant.Id.Value, id, ct);
            return Results.Ok(ApiResponse<bool>.Ok(success));
        })
        .WithName("MarkNotificationAsRead")
        .WithSummary("Bildirimi okundu olarak işaretler.");

        // 3. Mark all as read
        group.MapPost("/read-all", async (
            INotificationStore store,
            ICurrentTenant currentTenant,
            ICurrentUser currentUser,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new ForbiddenException("Tenant context is required.");
            }

            var count = await store.MarkAllAsReadAsync(currentTenant.Id.Value, currentUser.Id, ct);
            return Results.Ok(ApiResponse<int>.Ok(count));
        })
        .WithName("MarkAllNotificationsAsRead")
        .WithSummary("Tüm bildirimleri okundu olarak işaretler.");

        // 4. Delete notification
        group.MapDelete("/{id:guid}", async (
            Guid id,
            INotificationStore store,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new ForbiddenException("Tenant context is required.");
            }

            var success = await store.DeleteAsync(currentTenant.Id.Value, id, ct);
            return Results.Ok(ApiResponse<bool>.Ok(success));
        })
        .WithName("DeleteNotification")
        .WithSummary("Tek bir bildirimi siler.");

        // 5. Clear all notifications
        group.MapDelete("/clear-all", async (
            INotificationStore store,
            ICurrentTenant currentTenant,
            ICurrentUser currentUser,
            CancellationToken ct) =>
        {
            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                throw new ForbiddenException("Tenant context is required.");
            }

            var count = await store.ClearAllAsync(currentTenant.Id.Value, currentUser.Id, ct);
            return Results.Ok(ApiResponse<int>.Ok(count));
        })
        .WithName("ClearAllNotifications")
        .WithSummary("Tüm bildirimleri temizler.");
    }
}
