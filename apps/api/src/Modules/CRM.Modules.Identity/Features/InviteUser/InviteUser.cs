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

namespace CRM.Modules.Identity.Features.InviteUser;

public record InviteUserCommand(string Email, Guid RoleId) : ICommand<Guid>;

public class InviteUserValidator : AbstractValidator<InviteUserCommand>
{
    public InviteUserValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.RoleId).NotEmpty();
    }
}

public class InviteUserHandler(
    IdentityDbContext dbContext,
    ICurrentTenant currentTenant,
    IPublishEndpoint publishEndpoint) : ICommandHandler<InviteUserCommand, Guid>
{
    public async Task<Result<Guid>> Handle(InviteUserCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // 1. Verify role belongs to this tenant
        var role = await dbContext.Roles.FirstOrDefaultAsync(r => r.Id == request.RoleId && r.TenantId == tenantId, cancellationToken);
        if (role is null)
        {
            throw new NotFoundException($"Role with ID '{request.RoleId}' was not found in this tenant.");
        }

        // 2. Find user by email in public.users or create placeholder
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);
        if (user is null)
        {
            // Note: In Supabase production, an email invitation via Supabase Auth GoTrue API can also be sent.
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                FullName = normalizedEmail.Split('@')[0],
                IsActive = true
            };
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // 3. Check if already member
        var existingUserRole = await dbContext.UserRoles
            .FirstOrDefaultAsync(ur => ur.TenantId == tenantId && ur.UserId == user.Id, cancellationToken);

        if (existingUserRole is not null)
        {
            // Update role
            existingUserRole.RoleId = role.Id;
        }
        else
        {
            dbContext.UserRoles.Add(new UserRole
            {
                TenantId = tenantId,
                UserId = user.Id,
                RoleId = role.Id
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // 4. Publish event to invalidate user permission cache
        await publishEndpoint.Publish(new UserRolesChangedIntegrationEvent(
            tenantId,
            user.Id,
            Guid.NewGuid(),
            DateTime.UtcNow), cancellationToken);

        return Result.Success(user.Id);
    }
}

public class InviteUserEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/identity/users/invite", async (InviteUserCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value, "User added to workspace successfully."));
        })
        .RequireAuthorization()
        .RequirePermission("Users.Invite")
        .WithName("InviteUser")
        .WithTags("Identity");
    }
}
