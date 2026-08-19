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

namespace CRM.Modules.Identity.Features.CreateRole;

public record CreateRoleCommand(string Name, string? Description, IReadOnlyList<Guid>? PermissionIds) : ICommand<Guid>;

public class CreateRoleValidator : AbstractValidator<CreateRoleCommand>
{
    public CreateRoleValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}

public class CreateRoleHandler(
    IdentityDbContext dbContext,
    ICurrentTenant currentTenant,
    IPublishEndpoint publishEndpoint) : ICommandHandler<CreateRoleCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateRoleCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var roleName = request.Name.Trim();

        var exists = await dbContext.Roles.AnyAsync(r => r.TenantId == tenantId && r.Name.ToLower() == roleName.ToLower(), cancellationToken);
        if (exists)
        {
            throw new AppException($"A role with name '{roleName}' already exists in this tenant.", "Role.DuplicateName");
        }

        var role = new Role
        {
            TenantId = tenantId,
            Name = roleName,
            Description = request.Description,
            IsDefault = false
        };

        dbContext.Roles.Add(role);

        if (request.PermissionIds != null && request.PermissionIds.Count != 0)
        {
            foreach (var permId in request.PermissionIds.Distinct())
            {
                role.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = permId
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await publishEndpoint.Publish(new RolePermissionsUpdatedIntegrationEvent(
            tenantId,
            role.Id,
            Guid.NewGuid(),
            DateTime.UtcNow), cancellationToken);

        return Result.Success(role.Id);
    }
}

public class CreateRoleEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/identity/roles", async (CreateRoleCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value, "Role created successfully."));
        })
        .RequireAuthorization()
        .RequirePermission("Roles.Create")
        .WithName("CreateRole")
        .WithTags("Identity");
    }
}
