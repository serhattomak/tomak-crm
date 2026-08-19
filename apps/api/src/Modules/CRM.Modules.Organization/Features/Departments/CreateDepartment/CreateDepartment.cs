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

namespace CRM.Modules.Organization.Features.Departments.CreateDepartment;

public record CreateDepartmentRequest(
    string Name,
    string? Code,
    string? Description,
    Guid? ParentId,
    Guid? LeadId,
    string? CostCenter);

public record CreateDepartmentResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Code,
    string? Description,
    Guid? ParentId,
    Guid? LeadId,
    string? CostCenter,
    DateTime CreatedAt);

public record CreateDepartmentCommand(
    string Name,
    string? Code,
    string? Description,
    Guid? ParentId,
    Guid? LeadId,
    string? CostCenter) : ICommand<CreateDepartmentResponse>;

public class CreateDepartmentValidator : AbstractValidator<CreateDepartmentCommand>
{
    public CreateDepartmentValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Department name is required.")
            .MaximumLength(150).WithMessage("Department name cannot exceed 150 characters.");

        RuleFor(x => x.Code)
            .MaximumLength(50).WithMessage("Department code cannot exceed 50 characters.");

        RuleFor(x => x.CostCenter)
            .MaximumLength(100).WithMessage("Cost center cannot exceed 100 characters.");
    }
}

public class CreateDepartmentHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateDepartmentCommand, CreateDepartmentResponse>
{
    public async Task<Result<CreateDepartmentResponse>> Handle(CreateDepartmentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        if (request.ParentId.HasValue)
        {
            var parentExists = await dbContext.Departments
                .AnyAsync(d => d.Id == request.ParentId.Value && d.TenantId == tenantId, cancellationToken);
            if (!parentExists)
            {
                throw new NotFoundException($"Parent department with ID '{request.ParentId.Value}' was not found.");
            }
        }

        if (request.LeadId.HasValue)
        {
            var leadExists = await dbContext.Employees
                .AnyAsync(e => e.Id == request.LeadId.Value && e.TenantId == tenantId, cancellationToken);
            if (!leadExists)
            {
                throw new NotFoundException($"Lead employee with ID '{request.LeadId.Value}' was not found.");
            }
        }

        var department = new Department
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Code = request.Code?.Trim().ToUpperInvariant(),
            Description = request.Description?.Trim(),
            ParentId = request.ParentId,
            LeadId = request.LeadId,
            CostCenter = request.CostCenter?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Departments.Add(department);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new CreateDepartmentResponse(
            department.Id,
            department.TenantId,
            department.Name,
            department.Code,
            department.Description,
            department.ParentId,
            department.LeadId,
            department.CostCenter,
            department.CreatedAt);

        return Result.Success(response);
    }
}

public class CreateDepartmentEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/organization/departments", async (CreateDepartmentRequest request, MediatR.ISender sender, CancellationToken ct) =>
        {
            var command = new CreateDepartmentCommand(
                request.Name,
                request.Code,
                request.Description,
                request.ParentId,
                request.LeadId,
                request.CostCenter);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<CreateDepartmentResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Departments.Create")
        .WithName("CreateDepartment")
        .WithTags("Organization");
    }
}
