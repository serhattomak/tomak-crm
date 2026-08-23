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

namespace CRM.Modules.Identity.Features.AssignUserRole;

public record AssignUserRoleCommand(Guid UserId, Guid? RoleId) : ICommand;

public record AssignUserRoleRequest(Guid? RoleId);

public class AssignUserRoleValidator : AbstractValidator<AssignUserRoleCommand>
{
    public AssignUserRoleValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public class AssignUserRoleHandler(
    IdentityDbContext dbContext,
    ICurrentTenant currentTenant,
    IPublishEndpoint publishEndpoint) : ICommandHandler<AssignUserRoleCommand>
{
    public async Task<Result> Handle(AssignUserRoleCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        // If RoleId is null or Guid.Empty, unassign / remove any role for this user
        if (!request.RoleId.HasValue || request.RoleId.Value == Guid.Empty)
        {
            var existing = await dbContext.UserRoles
                .FirstOrDefaultAsync(ur => ur.TenantId == tenantId && ur.UserId == request.UserId, cancellationToken);

            if (existing is not null)
            {
                dbContext.UserRoles.Remove(existing);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            await publishEndpoint.Publish(new UserRolesChangedIntegrationEvent(
                tenantId,
                request.UserId,
                Guid.NewGuid(),
                DateTime.UtcNow), cancellationToken);

            return Result.Success();
        }

        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Id == request.RoleId.Value && r.TenantId == tenantId, cancellationToken);
        if (role is null)
        {
            throw new NotFoundException($"Role with ID '{request.RoleId.Value}' was not found in this tenant.");
        }

        var existingUserRole = await dbContext.UserRoles
            .FirstOrDefaultAsync(ur => ur.TenantId == tenantId && ur.UserId == request.UserId, cancellationToken);

        if (existingUserRole is not null)
        {
            existingUserRole.RoleId = role.Id;
        }
        else
        {
            dbContext.UserRoles.Add(new UserRole
            {
                TenantId = tenantId,
                UserId = request.UserId,
                RoleId = role.Id
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await publishEndpoint.Publish(new UserRolesChangedIntegrationEvent(
            tenantId,
            request.UserId,
            Guid.NewGuid(),
            DateTime.UtcNow), cancellationToken);

        return Result.Success();
    }
}

public class AssignUserRoleEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/identity/users/{userId:guid}/role", async (
            Guid userId,
            AssignUserRoleRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new AssignUserRoleCommand(userId, request?.RoleId);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<string>.Ok("User role updated successfully."));
        })
        .RequireAuthorization()
        .RequirePermission("Roles.Assign")
        .WithName("AssignUserRole")
        .WithTags("Identity");
    }
}
