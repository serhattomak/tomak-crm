using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Organization.Data;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Services;

public interface IPipelineAssignmentService
{
    Task<(Guid? UserId, string? UserName)> DetermineNextAssigneeAsync(
        Guid tenantId,
        Guid pipelineId,
        Guid stageId,
        CancellationToken ct = default);
}

public class PipelineAssignmentService(
    CustomersDbContext dbContext,
    OrganizationDbContext orgDbContext) : IPipelineAssignmentService
{
    public async Task<(Guid? UserId, string? UserName)> DetermineNextAssigneeAsync(
        Guid tenantId,
        Guid pipelineId,
        Guid stageId,
        CancellationToken ct = default)
    {
        var pipeline = await dbContext.Pipelines
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == pipelineId, ct);

        if (pipeline == null)
        {
            return (null, null);
        }

        var stage = await dbContext.PipelineStages
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == stageId, ct);

        var strategy = stage?.RoutingRuleOverride ?? pipeline.RoutingStrategy;

        if (string.Equals(strategy, "Manual", StringComparison.OrdinalIgnoreCase))
        {
            return (null, null); // Leave in pool
        }

        // Get candidate employees / users
        var empQuery = orgDbContext.Employees
            .Where(e => e.TenantId == tenantId && e.Status == "Active" && e.UserId.HasValue);

        if (pipeline.TargetDepartmentId.HasValue)
        {
            empQuery = empQuery.Where(e => e.DepartmentId == pipeline.TargetDepartmentId.Value);
        }

        var candidateEmployees = await empQuery
            .Select(e => new
            {
                UserId = e.UserId!.Value,
                FullName = (e.FirstName + " " + e.LastName).Trim(),
                EmployeeId = e.Id
            })
            .ToListAsync(ct);

        if (candidateEmployees.Count == 0)
        {
            // Fallback: search all active employees with user id in tenant
            candidateEmployees = await orgDbContext.Employees
                .Where(e => e.TenantId == tenantId && e.Status == "Active" && e.UserId.HasValue)
                .Select(e => new
                {
                    UserId = e.UserId!.Value,
                    FullName = (e.FirstName + " " + e.LastName).Trim(),
                    EmployeeId = e.Id
                })
                .ToListAsync(ct);

            if (candidateEmployees.Count == 0)
            {
                return (null, null);
            }
        }

        var candidateUserIds = candidateEmployees.Select(c => c.UserId).ToList();

        if (string.Equals(strategy, "LeastLoaded", StringComparison.OrdinalIgnoreCase))
        {
            // Count open deals per user in this tenant
            var dealCounts = await dbContext.Deals
                .Where(d => d.TenantId == tenantId && d.Status == "Open" && d.AssignedUserId.HasValue && candidateUserIds.Contains(d.AssignedUserId.Value))
                .GroupBy(d => d.AssignedUserId!.Value)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

            // Find candidate with lowest count
            var bestCandidate = candidateEmployees
                .OrderBy(c => dealCounts.TryGetValue(c.UserId, out var count) ? count : 0)
                .ThenBy(_ => Guid.NewGuid()) // Tie-breaker random
                .First();

            return (bestCandidate.UserId, bestCandidate.FullName);
        }

        // Default: Round-Robin (find user whose last deal assignment was longest ago)
        var lastAssignedTimes = await dbContext.Deals
            .Where(d => d.TenantId == tenantId && d.AssignedUserId.HasValue && candidateUserIds.Contains(d.AssignedUserId.Value))
            .GroupBy(d => d.AssignedUserId!.Value)
            .Select(g => new { UserId = g.Key, LastAssigned = g.Max(d => d.CreatedAt) })
            .ToDictionaryAsync(x => x.UserId, x => x.LastAssigned, ct);

        var selected = candidateEmployees
            .OrderBy(c => lastAssignedTimes.TryGetValue(c.UserId, out var dt) ? dt : DateTime.MinValue)
            .First();

        return (selected.UserId, selected.FullName);
    }
}
