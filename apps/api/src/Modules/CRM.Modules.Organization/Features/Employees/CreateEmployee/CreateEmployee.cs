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

namespace CRM.Modules.Organization.Features.Employees.CreateEmployee;

public record CreateEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? EmployeeNumber,
    string? Title,
    Guid? DepartmentId,
    Guid? JobPositionId,
    Guid? ManagerId,
    string EmploymentType = "FullTime",
    string Status = "Active",
    DateTime? HireDate = null,
    string? AvatarUrl = null,
    decimal? Salary = null,
    string Currency = "USD",
    Guid? UserId = null);

public record CreateEmployeeResponse(
    Guid Id,
    Guid TenantId,
    string FullName,
    string Email,
    string? Title,
    Guid? DepartmentId,
    Guid? JobPositionId,
    Guid? ManagerId,
    string EmploymentType,
    string Status,
    DateTime CreatedAt);

public record CreateEmployeeCommand(
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
    Guid? UserId) : ICommand<CreateEmployeeResponse>;

public class CreateEmployeeValidator : AbstractValidator<CreateEmployeeCommand>
{
    public CreateEmployeeValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.EmploymentType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Status).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
    }
}

public class CreateEmployeeHandler(
    OrganizationDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateEmployeeCommand, CreateEmployeeResponse>
{
    public async Task<Result<CreateEmployeeResponse>> Handle(CreateEmployeeCommand request, CancellationToken cancellationToken)
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

        if (request.JobPositionId.HasValue)
        {
            var posExists = await dbContext.JobPositions
                .AnyAsync(p => p.Id == request.JobPositionId.Value && p.TenantId == tenantId, cancellationToken);
            if (!posExists)
            {
                throw new NotFoundException($"Job position with ID '{request.JobPositionId.Value}' was not found.");
            }
        }

        if (request.ManagerId.HasValue)
        {
            var mgrExists = await dbContext.Employees
                .AnyAsync(e => e.Id == request.ManagerId.Value && e.TenantId == tenantId, cancellationToken);
            if (!mgrExists)
            {
                throw new NotFoundException($"Manager with ID '{request.ManagerId.Value}' was not found.");
            }
        }

        var employee = new Employee
        {
            TenantId = tenantId,
            UserId = request.UserId,
            DepartmentId = request.DepartmentId,
            JobPositionId = request.JobPositionId,
            ManagerId = request.ManagerId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone?.Trim(),
            EmployeeNumber = request.EmployeeNumber?.Trim(),
            Title = request.Title?.Trim(),
            EmploymentType = request.EmploymentType.Trim(),
            Status = request.Status.Trim(),
            HireDate = request.HireDate.HasValue ? DateTime.SpecifyKind(request.HireDate.Value, DateTimeKind.Utc) : null,
            AvatarUrl = request.AvatarUrl?.Trim(),
            Salary = request.Salary,
            Currency = request.Currency.Trim().ToUpperInvariant(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Employees.Add(employee);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new CreateEmployeeResponse(
            employee.Id,
            employee.TenantId,
            employee.FullName,
            employee.Email,
            employee.Title,
            employee.DepartmentId,
            employee.JobPositionId,
            employee.ManagerId,
            employee.EmploymentType,
            employee.Status,
            employee.CreatedAt));
    }
}

public class CreateEmployeeEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/organization/employees", async (CreateEmployeeRequest request, MediatR.ISender sender, CancellationToken ct) =>
        {
            var command = new CreateEmployeeCommand(
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
            return Results.Ok(ApiResponse<CreateEmployeeResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Employees.Create")
        .WithName("CreateEmployee")
        .WithTags("Organization");
    }
}
