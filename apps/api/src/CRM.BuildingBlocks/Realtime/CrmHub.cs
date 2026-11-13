using System.Security.Claims;
using CRM.BuildingBlocks.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CRM.BuildingBlocks.Realtime;

/// <summary>
/// Pushes per-user and per-tenant notifications.
/// <para>
/// Authenticated only: the tenant a connection subscribes to arrives in the query string, so
/// without an explicit authorization requirement and a membership check any anonymous caller
/// could read another tenant's notification stream by supplying its id.
/// </para>
/// </summary>
[Authorize]
public class CrmHub(
    ILogger<CrmHub> logger,
    ITenantMembershipVerifier membershipVerifier) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId is null)
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId.Value}");

        var requestedTenantId = GetRequestedTenantId();
        if (requestedTenantId is null)
        {
            await base.OnConnectedAsync();
            return;
        }

        if (await membershipVerifier.IsMemberAsync(userId.Value, requestedTenantId.Value, Context.ConnectionAborted))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant_{requestedTenantId.Value}");
            logger.LogInformation(
                "SignalR client {ConnectionId} joined tenant group {TenantId}",
                Context.ConnectionId,
                requestedTenantId);
        }
        else
        {
            logger.LogWarning(
                "SignalR client {ConnectionId} denied tenant group {TenantId}: user {UserId} is not a member",
                Context.ConnectionId,
                requestedTenantId,
                userId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        logger.LogInformation("SignalR client {ConnectionId} disconnected. Exception: {Exception}", Context.ConnectionId, exception?.Message);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Joins an extra room. Only the caller's own user room and the tenant room they are a
    /// verified member of are accepted; any other name is refused, because joining an arbitrary
    /// group name is the same privilege as reading that tenant's notifications.
    /// </summary>
    public async Task JoinRoom(string roomName)
    {
        var userId = GetUserId();
        if (userId is null || string.IsNullOrWhiteSpace(roomName))
        {
            return;
        }

        if (roomName == $"user_{userId.Value}")
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
            return;
        }

        var requestedTenantId = GetRequestedTenantId();
        var isOwnTenantRoom = requestedTenantId is not null &&
                              roomName == $"tenant_{requestedTenantId.Value}";

        if (isOwnTenantRoom &&
            await membershipVerifier.IsMemberAsync(userId.Value, requestedTenantId!.Value, Context.ConnectionAborted))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
            return;
        }

        logger.LogWarning(
            "SignalR client {ConnectionId} denied join to room {Room}",
            Context.ConnectionId,
            roomName);
    }

    public async Task LeaveRoom(string roomName)
    {
        if (!string.IsNullOrWhiteSpace(roomName))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
            logger.LogInformation("SignalR client {ConnectionId} left room {Room}", Context.ConnectionId, roomName);
        }
    }

    private Guid? GetUserId()
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value;

        return Guid.TryParse(userIdStr, out var userId) ? userId : null;
    }

    private Guid? GetRequestedTenantId()
    {
        var tenantIdStr = Context.GetHttpContext()?.Request.Query["tenantId"].ToString();

        if (string.IsNullOrWhiteSpace(tenantIdStr))
        {
            tenantIdStr = Context.User?.FindFirst("tenant_id")?.Value
                ?? Context.User?.FindFirst("tenantId")?.Value;
        }

        return Guid.TryParse(tenantIdStr, out var tenantId) ? tenantId : null;
    }
}
