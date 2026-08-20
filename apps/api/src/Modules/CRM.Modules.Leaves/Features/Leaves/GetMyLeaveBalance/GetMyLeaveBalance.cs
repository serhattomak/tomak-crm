using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using CRM.Modules.Leaves.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.GetMyLeaveBalance;

public record LeaveBalanceDto(
    Guid Id,
    Guid EmployeeId,
    int Year,
    decimal TotalDays,
    decimal UsedDays,
    decimal PendingDays,
    decimal RemainingDays);

public record GetMyLeaveBalanceQuery(Guid? EmployeeId = null, int? Year = null) : IQuery<LeaveBalanceDto>;

public class GetMyLeaveBalanceHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetMyLeaveBalanceQuery, LeaveBalanceDto>
{
    public async Task<Result<LeaveBalanceDto>> Handle(GetMyLeaveBalanceQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var year = request.Year ?? DateTime.UtcNow.Year;

        if (!request.EmployeeId.HasValue || request.EmployeeId.Value == Guid.Empty)
        {
            // Return empty default or search for first balance
            var firstBalance = await dbContext.LeaveBalances
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Year == year, cancellationToken);

            if (firstBalance != null)
            {
                return Result.Success(new LeaveBalanceDto(
                    firstBalance.Id,
                    firstBalance.EmployeeId,
                    firstBalance.Year,
                    firstBalance.TotalDays,
                    firstBalance.UsedDays,
                    firstBalance.PendingDays,
                    firstBalance.RemainingDays));
            }

            return Result.Success(new LeaveBalanceDto(
                Guid.Empty,
                Guid.Empty,
                year,
                14.00m,
                0.00m,
                0.00m,
                14.00m));
        }

        var employeeId = request.EmployeeId.Value;

        var balance = await dbContext.LeaveBalances
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.EmployeeId == employeeId && x.Year == year, cancellationToken);

        if (balance == null)
        {
            balance = new LeaveBalance
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                EmployeeId = employeeId,
                Year = year,
                TotalDays = 14.00m,
                UsedDays = 0.00m,
                PendingDays = 0.00m,
                RemainingDays = 14.00m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            dbContext.LeaveBalances.Add(balance);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Result.Success(new LeaveBalanceDto(
            balance.Id,
            balance.EmployeeId,
            balance.Year,
            balance.TotalDays,
            balance.UsedDays,
            balance.PendingDays,
            balance.RemainingDays));
    }
}

public class GetMyLeaveBalanceEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/leaves/my-balance", async (
            [AsParameters] GetMyLeaveBalanceQuery query,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<LeaveBalanceDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.View")
        .WithName("GetMyLeaveBalance")
        .WithTags("Leaves");
    }
}
