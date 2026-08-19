using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Customers.GetCustomerById;

public record CustomerContactDto(
    Guid Id,
    Guid CustomerId,
    string FirstName,
    string LastName,
    string FullName,
    string? Title,
    string? Department,
    string? Email,
    string? Phone,
    string? Mobile,
    bool IsPrimary,
    string? Notes,
    DateTime CreatedAt);

public record CustomerActivityDto(
    Guid Id,
    Guid CustomerId,
    Guid? UserId,
    string ActivityType,
    string Title,
    string? Description,
    DateTime PerformedAt,
    DateTime CreatedAt);

public record CustomerNoteDto(
    Guid Id,
    Guid CustomerId,
    Guid? UserId,
    string Content,
    bool IsPinned,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CustomerDetailDto(
    Guid Id,
    Guid TenantId,
    string Type,
    string Name,
    string? Email,
    string? Phone,
    string? Website,
    string Status,
    string Tier,
    string? Industry,
    string[]? Tags,
    string? TaxOffice,
    string? TaxNumber,
    string? AddressLine,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    Guid? AssignedEmployeeId,
    string? AssignedEmployeeName,
    string? AssignedEmployeeAvatar,
    Guid? AssignedUserId,
    decimal TotalRevenue,
    string Currency,
    int DealsCount,
    int NotesCount,
    IReadOnlyList<CustomerContactDto> Contacts,
    IReadOnlyList<CustomerActivityDto> Activities,
    IReadOnlyList<CustomerNoteDto> Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GetCustomerByIdQuery(Guid Id) : IQuery<CustomerDetailDto>;

public class GetCustomerByIdHandler(
    CustomersDbContext dbContext,
    CRM.Modules.Organization.Data.OrganizationDbContext orgDbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCustomerByIdQuery, CustomerDetailDto>
{
    public async Task<Result<CustomerDetailDto>> Handle(GetCustomerByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var customer = await dbContext.Customers
            .Where(c => c.Id == request.Id && c.TenantId == currentTenant.Id.Value)
            .Include(c => c.Contacts)
            .Include(c => c.Activities)
            .Include(c => c.Notes)
            .FirstOrDefaultAsync(cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException($"Customer '{request.Id}' not found.");
        }

        CRM.Modules.Organization.Entities.Employee? assignedEmployee = null;
        if (customer.AssignedEmployeeId.HasValue)
        {
            assignedEmployee = await orgDbContext.Employees
                .FirstOrDefaultAsync(e => e.Id == customer.AssignedEmployeeId.Value, cancellationToken);
        }

        var contactsDto = customer.Contacts
            .OrderByDescending(c => c.IsPrimary)
            .ThenBy(c => c.FirstName)
            .Select(c => new CustomerContactDto(
                c.Id,
                c.CustomerId,
                c.FirstName,
                c.LastName,
                c.FullName,
                c.Title,
                c.Department,
                c.Email,
                c.Phone,
                c.Mobile,
                c.IsPrimary,
                c.Notes,
                c.CreatedAt))
            .ToList();

        var activitiesDto = customer.Activities
            .OrderByDescending(a => a.PerformedAt)
            .Select(a => new CustomerActivityDto(
                a.Id,
                a.CustomerId,
                a.UserId,
                a.ActivityType,
                a.Title,
                a.Description,
                a.PerformedAt,
                a.CreatedAt))
            .ToList();

        var notesDto = customer.Notes
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.CreatedAt)
            .Select(n => new CustomerNoteDto(
                n.Id,
                n.CustomerId,
                n.UserId,
                n.Content,
                n.IsPinned,
                n.CreatedAt,
                n.UpdatedAt))
            .ToList();

        var detail = new CustomerDetailDto(
            customer.Id,
            customer.TenantId,
            customer.Type,
            customer.Name,
            customer.Email,
            customer.Phone,
            customer.Website,
            customer.Status,
            customer.Tier,
            customer.Industry,
            customer.Tags,
            customer.TaxOffice,
            customer.TaxNumber,
            customer.AddressLine,
            customer.City,
            customer.State,
            customer.PostalCode,
            customer.Country,
            customer.AssignedEmployeeId,
            assignedEmployee != null ? $"{assignedEmployee.FirstName} {assignedEmployee.LastName}".Trim() : null,
            assignedEmployee?.AvatarUrl,
            customer.AssignedUserId,
            customer.TotalRevenue,
            customer.Currency,
            customer.DealsCount,
            customer.NotesCount,
            contactsDto,
            activitiesDto,
            notesDto,
            customer.CreatedAt,
            customer.UpdatedAt);

        return Result.Success(detail);
    }
}

public class GetCustomerByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/customers/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetCustomerByIdQuery(id), ct);
            return Results.Ok(ApiResponse<CustomerDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.View")
        .WithName("GetCustomerById")
        .WithTags("Customers");
    }
}
