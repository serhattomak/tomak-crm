using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using CRM.Modules.Organization.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Organization.Features.JobPositions.CreateJobPosition;

public record CreateJobPositionRequest(
    string Title,
    string Level,
    Guid? DepartmentId,
    string? JobDescription,
    decimal? MinSalary,
    decimal? MaxSalary);

public record CreateJobPositionResponse(
    Guid Id,
    Guid TenantId,
    string Title,
    string Level,
    Guid? DepartmentId,
    string? JobDescription,
    decimal? MinSalary,
    decimal? MaxSalary,
    DateTime CreatedAt);

public record CreateJobPositionCommand(
    string Title,
    string Level,
    Guid? DepartmentId,
    string? JobDescription,
    decimal? MinSalary,
    decimal? MaxSalary) : ICommand<CreateJobPositionResponse>;

public class CreateJobPositionValidator : AbstractValidator<CreateJobPositionCommand>
{
    public CreateJobPositionValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Job title is required.")
            .MaximumLength(150);

        RuleFor(x => x.Level)
            .NotEmpty().WithMessage("Career level is required.")
            .MaximumLength(50);
    }
}

public class CreateJobPositionHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateJobPositionCommand, CreateJobPositionResponse>
{
    public async Task<Result<CreateJobPositionResponse>> Handle(CreateJobPositionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        if (request.DepartmentId.HasValue)
        {
            var deptExists = await dbContext.Departments
                .AnyAsync(d => d.Id == request.DepartmentId.Value && d.TenantId == tenantId, cancellationToken);
            if (!deptExists)
            {
                throw new NotFoundException($"Department with ID '{request.DepartmentId.Value}' was not found.");
            }
        }

        var position = new JobPosition
        {
            TenantId = tenantId,
            Title = request.Title.Trim(),
            Level = request.Level.Trim(),
            DepartmentId = request.DepartmentId,
            JobDescription = request.JobDescription?.Trim(),
            MinSalary = request.MinSalary,
            MaxSalary = request.MaxSalary,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.JobPositions.Add(position);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new CreateJobPositionResponse(
            position.Id,
            position.TenantId,
            position.Title,
            position.Level,
            position.DepartmentId,
            position.JobDescription,
            position.MinSalary,
            position.MaxSalary,
            position.CreatedAt));
    }
}

public class CreateJobPositionEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/organization/positions", async (CreateJobPositionRequest request, MediatR.ISender sender, CancellationToken ct) =>
        {
            var command = new CreateJobPositionCommand(
                request.Title,
                request.Level,
                request.DepartmentId,
                request.JobDescription,
                request.MinSalary,
                request.MaxSalary);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<CreateJobPositionResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("JobPositions.Manage")
        .WithName("CreateJobPosition")
        .WithTags("Organization");
    }
}
