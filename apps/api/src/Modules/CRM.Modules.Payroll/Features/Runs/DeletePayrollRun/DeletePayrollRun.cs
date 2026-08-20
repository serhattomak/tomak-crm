using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Runs.DeletePayrollRun;

public record DeletePayrollRunCommand(Guid Id) : ICommand<bool>;

public class DeletePayrollRunHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeletePayrollRunCommand, bool>
{
    public async Task<Result<bool>> Handle(DeletePayrollRunCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var run = await dbContext.PayrollRuns
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (run == null)
        {
            throw new NotFoundException("Bordro dönemi bulunamadı.");
        }

        if (run.Status == "Locked")
        {
            throw new BadRequestException("Kilitlenmiş bordro dönemleri silinemez.");
        }

        dbContext.PayrollRuns.Remove(run);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public class DeletePayrollRunEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/payroll/runs/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeletePayrollRunCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.Manage")
        .WithName("DeletePayrollRun")
        .WithTags("Payroll");
    }
}
