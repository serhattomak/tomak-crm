using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.JobPositions.UpdateJobPosition;

public record UpdateJobPositionRequest(
    string Title,
    string Level,
    Guid? DepartmentId,
    string? JobDescription,
    decimal? MinSalary,
    decimal? MaxSalary);

public record UpdateJobPositionResponse(
    Guid Id,
    string Title,
    string Level,
    Guid? DepartmentId,
    string? JobDescription,
    decimal? MinSalary,
    decimal? MaxSalary,
    DateTime UpdatedAt);

public record UpdateJobPositionCommand(
    Guid Id,
    string Title,
    string Level,
    Guid? DepartmentId,
    string? JobDescription,
    decimal? MinSalary,
    decimal? MaxSalary) : ICommand<UpdateJobPositionResponse>;

public class UpdateJobPositionValidator : AbstractValidator<UpdateJobPositionCommand>
{
    public UpdateJobPositionValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Level).NotEmpty().MaximumLength(50);
    }
}

public class UpdateJobPositionHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateJobPositionCommand, UpdateJobPositionResponse>
{
    public async Task<Result<UpdateJobPositionResponse>> Handle(UpdateJobPositionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var position = await dbContext.JobPositions
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.TenantId == tenantId, cancellationToken);

        if (position == null)
        {
            throw new NotFoundException($"Job position with ID '{request.Id}' was not found.");
        }

        if (request.DepartmentId.HasValue)
        {
            var deptExists = await dbContext.Departments
                .AnyAsync(d => d.Id == request.DepartmentId.Value && d.TenantId == tenantId, cancellationToken);
            if (!deptExists)
            {
                throw new NotFoundException($"Department with ID '{request.DepartmentId.Value}' was not found.");
            }
        }

        position.Title = request.Title.Trim();
        position.Level = request.Level.Trim();
        position.DepartmentId = request.DepartmentId;
        position.JobDescription = request.JobDescription?.Trim();
        position.MinSalary = request.MinSalary;
        position.MaxSalary = request.MaxSalary;
        position.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new UpdateJobPositionResponse(
            position.Id,
            position.Title,
            position.Level,
            position.DepartmentId,
            position.JobDescription,
            position.MinSalary,
            position.MaxSalary,
            position.UpdatedAt));
    }
}

public class UpdateJobPositionEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/organization/positions/{id:guid}", async (Guid id, UpdateJobPositionRequest request, MediatR.ISender sender, CancellationToken ct) =>
        {
            var command = new UpdateJobPositionCommand(
                id,
                request.Title,
                request.Level,
                request.DepartmentId,
                request.JobDescription,
                request.MinSalary,
                request.MaxSalary);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<UpdateJobPositionResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("JobPositions.Manage")
        .WithName("UpdateJobPosition")
        .WithTags("Organization");
    }
}
