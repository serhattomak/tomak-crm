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

namespace CRM.Modules.Organization.Features.Departments.UpdateDepartment;

public record UpdateDepartmentRequest(
    string Name,
    string? Code,
    string? Description,
    Guid? ParentId,
    Guid? LeadId,
    string? CostCenter);

public record UpdateDepartmentResponse(
    Guid Id,
    string Name,
    string? Code,
    string? Description,
    Guid? ParentId,
    Guid? LeadId,
    string? CostCenter,
    DateTime UpdatedAt);

public record UpdateDepartmentCommand(
    Guid Id,
    string Name,
    string? Code,
    string? Description,
    Guid? ParentId,
    Guid? LeadId,
    string? CostCenter) : ICommand<UpdateDepartmentResponse>;

public class UpdateDepartmentValidator : AbstractValidator<UpdateDepartmentCommand>
{
    public UpdateDepartmentValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("Department ID is required.");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Code).MaximumLength(50);
        RuleFor(x => x.CostCenter).MaximumLength(100);
    }
}

public class UpdateDepartmentHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateDepartmentCommand, UpdateDepartmentResponse>
{
    public async Task<Result<UpdateDepartmentResponse>> Handle(UpdateDepartmentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var department = await dbContext.Departments
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.TenantId == tenantId, cancellationToken);

        if (department == null)
        {
            throw new NotFoundException($"Department with ID '{request.Id}' was not found.");
        }

        if (request.ParentId.HasValue)
        {
            if (request.ParentId.Value == request.Id)
            {
                throw new AppException("A department cannot be its own parent.");
            }

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

        department.Name = request.Name.Trim();
        department.Code = request.Code?.Trim().ToUpperInvariant();
        department.Description = request.Description?.Trim();
        department.ParentId = request.ParentId;
        department.LeadId = request.LeadId;
        department.CostCenter = request.CostCenter?.Trim();
        department.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new UpdateDepartmentResponse(
            department.Id,
            department.Name,
            department.Code,
            department.Description,
            department.ParentId,
            department.LeadId,
            department.CostCenter,
            department.UpdatedAt));
    }
}

public class UpdateDepartmentEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/organization/departments/{id:guid}", async (Guid id, UpdateDepartmentRequest request, MediatR.ISender sender, CancellationToken ct) =>
        {
            var command = new UpdateDepartmentCommand(
                id,
                request.Name,
                request.Code,
                request.Description,
                request.ParentId,
                request.LeadId,
                request.CostCenter);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<UpdateDepartmentResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Departments.Update")
        .WithName("UpdateDepartment")
        .WithTags("Organization");
    }
}
