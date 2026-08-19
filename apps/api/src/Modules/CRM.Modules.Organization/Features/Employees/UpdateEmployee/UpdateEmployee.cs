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

namespace CRM.Modules.Organization.Features.Employees.UpdateEmployee;

public record UpdateEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? EmployeeNumber,
    string? Title,
    Guid? DepartmentId,
    Guid? JobPositionId,
    Guid? ManagerId,
    string EmploymentType,
    string Status,
    DateTime? HireDate,
    string? AvatarUrl,
    decimal? Salary,
    string Currency,
    Guid? UserId);

public record UpdateEmployeeResponse(
    Guid Id,
    string FullName,
    string Email,
    string? Title,
    Guid? DepartmentId,
    Guid? JobPositionId,
    Guid? ManagerId,
    string EmploymentType,
    string Status,
    DateTime UpdatedAt);

public record UpdateEmployeeCommand(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? EmployeeNumber,
    string? Title,
    Guid? DepartmentId,
    Guid? JobPositionId,
    Guid? ManagerId,
    string EmploymentType,
    string Status,
    DateTime? HireDate,
    string? AvatarUrl,
    decimal? Salary,
    string Currency,
    Guid? UserId) : ICommand<UpdateEmployeeResponse>;

public class UpdateEmployeeValidator : AbstractValidator<UpdateEmployeeCommand>
{
    public UpdateEmployeeValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.EmploymentType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Status).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
    }
}

public class UpdateEmployeeHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateEmployeeCommand, UpdateEmployeeResponse>
{
    public async Task<Result<UpdateEmployeeResponse>> Handle(UpdateEmployeeCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var employee = await dbContext.Employees
            .FirstOrDefaultAsync(e => e.Id == request.Id && e.TenantId == tenantId, cancellationToken);

        if (employee == null)
        {
            throw new NotFoundException($"Employee with ID '{request.Id}' was not found.");
        }

        if (request.ManagerId.HasValue)
        {
            if (request.ManagerId.Value == request.Id)
            {
                throw new AppException("An employee cannot be their own manager.");
            }

            var mgrExists = await dbContext.Employees
                .AnyAsync(e => e.Id == request.ManagerId.Value && e.TenantId == tenantId, cancellationToken);
            if (!mgrExists)
            {
                throw new NotFoundException($"Manager with ID '{request.ManagerId.Value}' was not found.");
            }
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

        if (request.JobPositionId.HasValue)
        {
            var posExists = await dbContext.JobPositions
                .AnyAsync(p => p.Id == request.JobPositionId.Value && p.TenantId == tenantId, cancellationToken);
            if (!posExists)
            {
                throw new NotFoundException($"Job position with ID '{request.JobPositionId.Value}' was not found.");
            }
        }

        employee.FirstName = request.FirstName.Trim();
        employee.LastName = request.LastName.Trim();
        employee.Email = request.Email.Trim().ToLowerInvariant();
        employee.Phone = request.Phone?.Trim();
        employee.EmployeeNumber = request.EmployeeNumber?.Trim();
        employee.Title = request.Title?.Trim();
        employee.DepartmentId = request.DepartmentId;
        employee.JobPositionId = request.JobPositionId;
        employee.ManagerId = request.ManagerId;
        employee.EmploymentType = request.EmploymentType.Trim();
        employee.Status = request.Status.Trim();
        employee.HireDate = request.HireDate.HasValue ? DateTime.SpecifyKind(request.HireDate.Value, DateTimeKind.Utc) : null;
        employee.AvatarUrl = request.AvatarUrl?.Trim();
        employee.Salary = request.Salary;
        employee.Currency = request.Currency.Trim().ToUpperInvariant();
        employee.UserId = request.UserId;
        employee.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new UpdateEmployeeResponse(
            employee.Id,
            employee.FullName,
            employee.Email,
            employee.Title,
            employee.DepartmentId,
            employee.JobPositionId,
            employee.ManagerId,
            employee.EmploymentType,
            employee.Status,
            employee.UpdatedAt));
    }
}

public class UpdateEmployeeEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/organization/employees/{id:guid}", async (Guid id, UpdateEmployeeRequest request, MediatR.ISender sender, CancellationToken ct) =>
        {
            var command = new UpdateEmployeeCommand(
                id,
                request.FirstName,
                request.LastName,
                request.Email,
                request.Phone,
                request.EmployeeNumber,
                request.Title,
                request.DepartmentId,
                request.JobPositionId,
                request.ManagerId,
                request.EmploymentType,
                request.Status,
                request.HireDate,
                request.AvatarUrl,
                request.Salary,
                request.Currency,
                request.UserId);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<UpdateEmployeeResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Employees.Update")
        .WithName("UpdateEmployee")
        .WithTags("Organization");
    }
}
