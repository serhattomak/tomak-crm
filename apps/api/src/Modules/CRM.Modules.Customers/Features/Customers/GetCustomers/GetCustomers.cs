using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Customers.GetCustomers;

public record CustomerListDto(
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
    string? City,
    string? Country,
    Guid? AssignedEmployeeId,
    string? AssignedEmployeeName,
    decimal TotalRevenue,
    string Currency,
    int DealsCount,
    int NotesCount,
    int ContactsCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedCustomersResponse(
    IReadOnlyList<CustomerListDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record GetCustomersQuery(
    string? Type = null,
    string? Status = null,
    string? Tier = null,
    string? Industry = null,
    Guid? AssignedEmployeeId = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50) : IQuery<PagedCustomersResponse>;

public class GetCustomersHandler(
    CustomersDbContext dbContext,
    CRM.Modules.Organization.Data.OrganizationDbContext orgDbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCustomersQuery, PagedCustomersResponse>
{
    public async Task<Result<PagedCustomersResponse>> Handle(GetCustomersQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var query = dbContext.Customers
            .Where(c => c.TenantId == tenantId)
            .Include(c => c.Contacts)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Type))
        {
            query = query.Where(c => c.Type == request.Type);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(c => c.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.Tier))
        {
            query = query.Where(c => c.Tier == request.Tier);
        }

        if (!string.IsNullOrWhiteSpace(request.Industry))
        {
            query = query.Where(c => c.Industry == request.Industry);
        }

        if (request.AssignedEmployeeId.HasValue)
        {
            query = query.Where(c => c.AssignedEmployeeId == request.AssignedEmployeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(search) ||
                (c.Email != null && c.Email.ToLower().Contains(search)) ||
                (c.Phone != null && c.Phone.ToLower().Contains(search)) ||
                (c.City != null && c.City.ToLower().Contains(search)) ||
                (c.TaxNumber != null && c.TaxNumber.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 200 ? request.PageSize : 50;

        var rawCustomers = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var employeeIds = rawCustomers
            .Where(c => c.AssignedEmployeeId.HasValue)
            .Select(c => c.AssignedEmployeeId!.Value)
            .Distinct()
            .ToList();

        var employeeNames = employeeIds.Count > 0
            ? await orgDbContext.Employees
                .Where(e => employeeIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => $"{e.FirstName} {e.LastName}".Trim(), cancellationToken)
            : new Dictionary<Guid, string>();

        var items = rawCustomers.Select(c => new CustomerListDto(
            c.Id,
            c.TenantId,
            c.Type,
            c.Name,
            c.Email,
            c.Phone,
            c.Website,
            c.Status,
            c.Tier,
            c.Industry,
            c.Tags,
            c.City,
            c.Country,
            c.AssignedEmployeeId,
            c.AssignedEmployeeId.HasValue && employeeNames.TryGetValue(c.AssignedEmployeeId.Value, out var empName) ? empName : null,
            c.TotalRevenue,
            c.Currency,
            c.DealsCount,
            c.NotesCount,
            c.Contacts.Count,
            c.CreatedAt,
            c.UpdatedAt)).ToList();

        return Result.Success(new PagedCustomersResponse(items, totalCount, page, pageSize));
    }
}

public class GetCustomersEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/customers", async (
            string? type,
            string? status,
            string? tier,
            string? industry,
            Guid? assignedEmployeeId,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetCustomersQuery(
                type,
                status,
                tier,
                industry,
                assignedEmployeeId,
                search,
                page ?? 1,
                pageSize ?? 50);

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedCustomersResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Customers.View")
        .WithName("GetCustomers")
        .WithTags("Customers");
    }
}
