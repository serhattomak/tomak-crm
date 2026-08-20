using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Leaves.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Leaves.Features.Leaves.RejectLeaveRequest;

public record RejectLeaveRequestDto(string RejectionReason);

public record RejectLeaveRequestCommand(Guid Id, string RejectionReason) : ICommand<bool>;

public class RejectLeaveRequestValidator : AbstractValidator<RejectLeaveRequestCommand>
{
    public RejectLeaveRequestValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.RejectionReason).NotEmpty().WithMessage("Ret gerekçesi belirtilmesi zorunludur.");
    }
}

public class RejectLeaveRequestHandler(
    LeavesDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<RejectLeaveRequestCommand, bool>
{
    public async Task<Result<bool>> Handle(RejectLeaveRequestCommand request, CancellationToken cancellationToken)
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

        leave.Status = "Rejected";
        leave.RejectionReason = request.RejectionReason.Trim();
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

public class RejectLeaveRequestEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/leaves/{id:guid}/reject", async (
            Guid id,
            RejectLeaveRequestDto body,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new RejectLeaveRequestCommand(id, body.RejectionReason), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Leaves.Approve")
        .WithName("RejectLeaveRequest")
        .WithTags("Leaves");
    }
}
