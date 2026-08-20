using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Runs.GetPayrollRuns;

public record PayrollRunDto(
    Guid Id,
    Guid TenantId,
    int Year,
    int Month,
    string Title,
    string Status,
    int TotalEmployees,
    decimal TotalGross,
    decimal TotalNet,
    decimal TotalSgkEmployee,
    decimal TotalSgkEmployer,
    decimal TotalIncomeTax,
    decimal TotalStampTax,
    decimal TotalEmployerCost,
    DateTime? CalculatedAt,
    DateTime? ApprovedAt,
    string? ApprovedByUserName,
    DateTime? LockedAt,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedPayrollRunsResponse(
    List<PayrollRunDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record GetPayrollRunsQuery(
    int? Year = null,
    int? Month = null,
    string? Status = null,
    int Page = 1,
    int PageSize = 25) : IQuery<PagedPayrollRunsResponse>;

public class GetPayrollRunsHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetPayrollRunsQuery, PagedPayrollRunsResponse>
{
    public async Task<Result<PagedPayrollRunsResponse>> Handle(GetPayrollRunsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var query = dbContext.PayrollRuns
            .AsNoTracking()
            .Where(x => x.TenantId == currentTenant.Id.Value);

        if (request.Year.HasValue)
        {
            query = query.Where(x => x.Year == request.Year.Value);
        }

        if (request.Month.HasValue)
        {
            query = query.Where(x => x.Month == request.Month.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 ? request.PageSize : 25;

        var items = await query
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new PayrollRunDto(
                x.Id,
                x.TenantId,
                x.Year,
                x.Month,
                x.Title,
                x.Status,
                x.TotalEmployees,
                x.TotalGross,
                x.TotalNet,
                x.TotalSgkEmployee,
                x.TotalSgkEmployer,
                x.TotalIncomeTax,
                x.TotalStampTax,
                x.TotalEmployerCost,
                x.CalculatedAt,
                x.ApprovedAt,
                x.ApprovedByUserName,
                x.LockedAt,
                x.Notes,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedPayrollRunsResponse(items, totalCount, page, pageSize));
    }
}

public class GetPayrollRunsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payroll/runs", async (
            [AsParameters] GetPayrollRunsQuery query,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedPayrollRunsResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.View")
        .WithName("GetPayrollRuns")
        .WithTags("Payroll");
    }
}
