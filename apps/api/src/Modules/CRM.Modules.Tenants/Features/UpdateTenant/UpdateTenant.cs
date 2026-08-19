using CRM.BuildingBlocks.Caching;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Tenants.Data;
using CRM.Modules.Tenants.Features.CreateTenant;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Tenants.Features.UpdateTenant;

public record UpdateTenantCommand(Guid Id, string Name, string? LogoUrl) : ICommand<TenantDto>;

public class UpdateTenantValidator : AbstractValidator<UpdateTenantCommand>
{
    public UpdateTenantValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public class UpdateTenantHandler(
    TenantsDbContext dbContext,
    ICacheService cacheService) : ICommandHandler<UpdateTenantCommand, TenantDto>
{
    public async Task<Result<TenantDto>> Handle(UpdateTenantCommand request, CancellationToken cancellationToken)
    {
        var tenant = await dbContext.Tenants.FindAsync([request.Id], cancellationToken);
        if (tenant is null)
        {
            throw new NotFoundException($"Tenant with ID '{request.Id}' was not found.");
        }

        tenant.Name = request.Name.Trim();
        tenant.LogoUrl = request.LogoUrl;
        tenant.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        // Invalidate Redis caches
        await cacheService.RemoveAsync($"tenant:slug:{tenant.Slug.ToLowerInvariant()}", cancellationToken);
        await cacheService.RemoveByTagAsync("tenants", cancellationToken);

        return new TenantDto(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            tenant.LogoUrl,
            tenant.IsActive,
            true,
            tenant.CreatedAt);
    }
}

public class UpdateTenantEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/tenants/{id:guid}", async (Guid id, UpdateTenantCommand command, ICommandHandler<UpdateTenantCommand, TenantDto> handler, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<TenantDto>.Fail("IdMismatch", "Route ID does not match body ID."));
            }

            var result = await handler.Handle(command, ct);
            return Results.Ok(ApiResponse<TenantDto>.Ok(result.Value, "Tenant updated successfully."));
        })
        .RequireAuthorization()
        .RequirePermission("Tenants.Update")
        .WithName("UpdateTenant")
        .WithTags("Tenants");
    }
}
