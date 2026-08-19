using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Messaging;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Identity.Data;
using CRM.Modules.Identity.Entities;
using FluentValidation;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Identity.Features.UpdateRolePermissions;

public record UpdateRolePermissionsCommand(
    Guid RoleId,
    string? Name,
    string? Description,
    IReadOnlyList<Guid> PermissionIds) : ICommand;

public class UpdateRolePermissionsValidator : AbstractValidator<UpdateRolePermissionsCommand>
{
    public UpdateRolePermissionsValidator()
    {
        RuleFor(x => x.RoleId).NotEmpty();
        RuleFor(x => x.PermissionIds).NotNull();
    }
}

public class UpdateRolePermissionsHandler(
    IdentityDbContext dbContext,
    ICurrentTenant currentTenant,
    IPublishEndpoint publishEndpoint) : ICommandHandler<UpdateRolePermissionsCommand>
{
    public async Task<Result> Handle(UpdateRolePermissionsCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var role = await dbContext.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.TenantId == tenantId, cancellationToken);

        if (role is null)
        {
            throw new NotFoundException($"Role with ID '{request.RoleId}' was not found.");
        }

        if (!string.IsNullOrWhiteSpace(request.Name) && !role.IsDefault)
        {
            role.Name = request.Name.Trim();
        }

        if (request.Description is not null)
        {
            role.Description = request.Description;
        }

        role.UpdatedAt = DateTime.UtcNow;

        // Sync permissions
        dbContext.RolePermissions.RemoveRange(role.RolePermissions);

        var distinctPermIds = request.PermissionIds.Distinct().ToList();
        var validPerms = await dbContext.Permissions
            .Where(p => distinctPermIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);

        foreach (var permId in validPerms)
        {
            dbContext.RolePermissions.Add(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permId
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Invalidate cached user permissions
        await publishEndpoint.Publish(new RolePermissionsUpdatedIntegrationEvent(
            tenantId,
            role.Id,
            Guid.NewGuid(),
            DateTime.UtcNow), cancellationToken);

        return Result.Success();
    }
}

public class UpdateRolePermissionsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/identity/roles/{id:guid}/permissions", async (
            Guid id,
            UpdateRolePermissionsCommand command,
            ICommandHandler<UpdateRolePermissionsCommand> handler,
            CancellationToken ct) =>
        {
            if (id != command.RoleId)
            {
                return Results.BadRequest(ApiResponse<string>.Fail("IdMismatch", "Route ID does not match body RoleId."));
            }

            var result = await handler.Handle(command, ct);
            return Results.Ok(ApiResponse<string>.Ok("Permissions updated successfully."));
        })
        .RequireAuthorization()
        .RequirePermission("Roles.Update")
        .WithName("UpdateRolePermissions")
        .WithTags("Identity");
    }
}
