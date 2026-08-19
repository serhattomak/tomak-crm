using CRM.BuildingBlocks.Messaging;
using CRM.BuildingBlocks.Security;
using CRM.Modules.Identity.Data;
using CRM.Modules.Identity.Entities;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Identity.Consumers;

public class RolePermissionsUpdatedConsumer(
    IPermissionService permissionService,
    ILogger<RolePermissionsUpdatedConsumer> logger) : IConsumer<RolePermissionsUpdatedIntegrationEvent>
{
    public async Task Consume(ConsumeContext<RolePermissionsUpdatedIntegrationEvent> context)
    {
        var message = context.Message;
        logger.LogInformation("Role permissions updated for Role {RoleId} in Tenant {TenantId}. Invalidating cache.", message.RoleId, message.TenantId);
        await permissionService.InvalidateUserPermissionsCacheAsync(message.TenantId, null, context.CancellationToken);
    }
}

public class UserRolesChangedConsumer(
    IPermissionService permissionService,
    ILogger<UserRolesChangedConsumer> logger) : IConsumer<UserRolesChangedIntegrationEvent>
{
    public async Task Consume(ConsumeContext<UserRolesChangedIntegrationEvent> context)
    {
        var message = context.Message;
        logger.LogInformation("User {UserId} roles updated in Tenant {TenantId}. Invalidating cache.", message.UserId, message.TenantId);
        await permissionService.InvalidateUserPermissionsCacheAsync(message.TenantId, message.UserId, context.CancellationToken);
    }
}

public class TenantCreatedConsumer(
    IdentityDbContext dbContext,
    ILogger<TenantCreatedConsumer> logger) : IConsumer<TenantCreatedIntegrationEvent>
{
    public async Task Consume(ConsumeContext<TenantCreatedIntegrationEvent> context)
    {
        var message = context.Message;
        logger.LogInformation("Initializing Identity roles and permissions for new Tenant {TenantId} ({Name})", message.TenantId, message.Name);

        // Check if Owner role already exists (e.g. if created via trigger)
        var exists = await dbContext.Roles.IgnoreQueryFilters().AnyAsync(r => r.TenantId == message.TenantId, context.CancellationToken);
        if (exists)
        {
            return;
        }

        var allPermissions = await dbContext.Permissions.ToListAsync(context.CancellationToken);

        var ownerRole = new Role
        {
            TenantId = message.TenantId,
            Name = "Owner",
            Description = "Full access to all tenant resources and management",
            IsDefault = true
        };

        var memberRole = new Role
        {
            TenantId = message.TenantId,
            Name = "Member",
            Description = "Standard tenant member with view and update access",
            IsDefault = false
        };

        dbContext.Roles.AddRange(ownerRole, memberRole);

        foreach (var p in allPermissions)
        {
            dbContext.RolePermissions.Add(new RolePermission
            {
                RoleId = ownerRole.Id,
                PermissionId = p.Id
            });
        }

        dbContext.UserRoles.Add(new UserRole
        {
            TenantId = message.TenantId,
            UserId = message.OwnerUserId,
            RoleId = ownerRole.Id
        });

        await dbContext.SaveChangesAsync(context.CancellationToken);
    }
}
