using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.CancelLeaveRequest;

public record CancelLeaveRequestCommand(Guid Id) : ICommand<bool>;

public class CancelLeaveRequestHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CancelLeaveRequestCommand, bool>
{
    public async Task<Result<bool>> Handle(CancelLeaveRequestCommand request, CancellationToken cancellationToken)
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
            throw new AppException("Sadece henüz onaylanmamış bekleyen talepler iptal edilebilir.");
        }

        leave.Status = "Cancelled";
        leave.UpdatedAt = DateTime.UtcNow;

        // If Annual leave, remove from pending days
        if (leave.LeaveType.Equals("Annual", StringComparison.OrdinalIgnoreCase))
        {
            var year = leave.StartDate.Year;
            var balance = await dbContext.LeaveBalances
                .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.EmployeeId == leave.EmployeeId && x.Year == year, cancellationToken);

            if (balance != null)
            {
                balance.PendingDays = Math.Max(0, balance.PendingDays - leave.TotalDays);
                balance.UpdatedAt = DateTime.UtcNow;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class CancelLeaveRequestEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/leaves/{id:guid}/cancel", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CancelLeaveRequestCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.Create")
        .WithName("CancelLeaveRequest")
        .WithTags("Leaves");
    }
}
