using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CRM.BuildingBlocks.Realtime;

public class CrmHub(ILogger<CrmHub> logger) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        
        // 1. Resolve Tenant ID from query string or JWT claim
        var tenantIdStr = httpContext?.Request.Query["tenantId"].ToString();
        if (string.IsNullOrWhiteSpace(tenantIdStr))
        {
            tenantIdStr = Context.User?.FindFirst("tenant_id")?.Value
                ?? Context.User?.FindFirst("tenantId")?.Value;
        }

        if (Guid.TryParse(tenantIdStr, out var tenantId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant_{tenantId}");
            logger.LogInformation("SignalR client {ConnectionId} joined tenant group {TenantId}", Context.ConnectionId, tenantId);
        }

        // 2. Resolve User ID from claims
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value;

        if (Guid.TryParse(userIdStr, out var userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            logger.LogInformation("SignalR client {ConnectionId} joined user group {UserId}", Context.ConnectionId, userId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        logger.LogInformation("SignalR client {ConnectionId} disconnected. Exception: {Exception}", Context.ConnectionId, exception?.Message);
        await base.OnDisconnectedAsync(exception);
    }

    // Client action to join a specific channel (e.g. Chat channel or Deal room)
    public async Task JoinRoom(string roomName)
    {
        if (!string.IsNullOrWhiteSpace(roomName))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
            logger.LogInformation("SignalR client {ConnectionId} joined room {Room}", Context.ConnectionId, roomName);
        }
    }

    public async Task LeaveRoom(string roomName)
    {
        if (!string.IsNullOrWhiteSpace(roomName))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
            logger.LogInformation("SignalR client {ConnectionId} left room {Room}", Context.ConnectionId, roomName);
        }
    }
}
