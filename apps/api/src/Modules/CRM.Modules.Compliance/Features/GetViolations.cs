using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Compliance.Data;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Compliance.Features;

public record GetViolationsQuery(
    string? Status = null,
    string? ModuleSource = null,
    string? Severity = null,
    int Page = 1,
    int PageSize = 50
) : IQuery<PagedResult<ComplianceViolationDto>>;

public class ComplianceViolationDto
{
    public Guid Id { get; set; }
    public Guid? RuleId { get; set; }
    public string RuleCode { get; set; } = string.Empty;
    public string LawReference { get; set; } = string.Empty;
    public Guid? EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string ModuleSource { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string Severity { get; set; } = "Warning";
    public string Details { get; set; } = string.Empty;
    public string ViolationDataJson { get; set; } = "{}";
    public bool IsOverridden { get; set; }
    public Guid? OverriddenByUserId { get; set; }
    public string? OverrideReason { get; set; }
    public DateTimeOffset? OverriddenAt { get; set; }
    public string Status { get; set; } = "Active";
    public DateTimeOffset CreatedAt { get; set; }
}

public class GetViolationsHandler(
    ComplianceDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetViolationsQuery, PagedResult<ComplianceViolationDto>>
{
    public async Task<Result<PagedResult<ComplianceViolationDto>>> Handle(GetViolationsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<PagedResult<ComplianceViolationDto>>(Error.Unauthorized);
        }

        var query = dbContext.Violations.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "all")
        {
            query = query.Where(v => v.Status.ToLower() == request.Status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(request.ModuleSource) && request.ModuleSource != "all")
        {
            query = query.Where(v => v.ModuleSource.ToLower() == request.ModuleSource.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(request.Severity) && request.Severity != "all")
        {
            query = query.Where(v => v.Severity.ToLower() == request.Severity.ToLower());
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var list = await query
            .OrderByDescending(v => v.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = list.Select(v => new ComplianceViolationDto
        {
            Id = v.Id,
            RuleId = v.RuleId,
            RuleCode = v.RuleCode,
            LawReference = v.LawReference,
            EmployeeId = v.EmployeeId,
            EmployeeName = v.EmployeeName,
            ModuleSource = v.ModuleSource,
            EntityId = v.EntityId,
            Severity = v.Severity,
            Details = v.Details,
            ViolationDataJson = v.ViolationDataJson,
            IsOverridden = v.IsOverridden,
            OverriddenByUserId = v.OverriddenByUserId,
            OverrideReason = v.OverrideReason,
            OverriddenAt = v.OverriddenAt,
            Status = v.Status,
            CreatedAt = v.CreatedAt
        }).ToList();

        return Result.Success(new PagedResult<ComplianceViolationDto>(items, totalCount, request.Page, request.PageSize));
    }
}

public class GetViolationsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/compliance/violations", async (
            string? status,
            string? moduleSource,
            string? severity,
            int? page,
            int? pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetViolationsQuery(
                Status: status,
                ModuleSource: moduleSource,
                Severity: severity,
                Page: page ?? 1,
                PageSize: pageSize ?? 50
            );

            var result = await sender.Send(query, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<PagedResult<ComplianceViolationDto>>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<PagedResult<ComplianceViolationDto>>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("GetComplianceViolations")
        .WithTags("Compliance")
        .RequirePermission("Compliance.View");
    }
}
