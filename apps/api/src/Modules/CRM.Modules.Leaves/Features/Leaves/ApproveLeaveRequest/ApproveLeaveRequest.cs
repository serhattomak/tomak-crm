using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.ApproveLeaveRequest;

public record ApproveLeaveRequestCommand(Guid Id, string? ApproverName = null) : ICommand<bool>;

public class ApproveLeaveRequestHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ApproveLeaveRequestCommand, bool>
{
    public async Task<Result<bool>> Handle(ApproveLeaveRequestCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var leave = await dbContext.LeaveRequests
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == tenantId, cancellationToken);

        if (leave == null)
        {
            throw new NotFoundException($"Leave request '{request.Id}' not found.");
        }

        if (leave.Status != "Pending")
        {
            throw new AppException($"Leave request is already '{leave.Status}'.");
        }

        leave.Status = "Approved";
        leave.ApprovedAt = DateTime.UtcNow;
        leave.ApprovedByUserName = !string.IsNullOrWhiteSpace(request.ApproverName) ? request.ApproverName.Trim() : "Yönetici";
        leave.UpdatedAt = DateTime.UtcNow;

        // If Annual leave, adjust balance
        if (leave.LeaveType.Equals("Annual", StringComparison.OrdinalIgnoreCase))
        {
            var year = leave.StartDate.Year;
            var balance = await dbContext.LeaveBalances
                .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.EmployeeId == leave.EmployeeId && x.Year == year, cancellationToken);

            if (balance != null)
            {
                balance.PendingDays = Math.Max(0, balance.PendingDays - leave.TotalDays);
                balance.UsedDays += leave.TotalDays;
                balance.RemainingDays = Math.Max(0, balance.TotalDays - balance.UsedDays);
                balance.UpdatedAt = DateTime.UtcNow;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class ApproveLeaveRequestEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/leaves/{id:guid}/approve", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ApproveLeaveRequestCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.Approve")
        .WithName("ApproveLeaveRequest")
        .WithTags("Leaves");
    }
}
