using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Features.Runs.GetPayrollRuns;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Runs.ApprovePayrollRun;

public record ApprovePayrollRunCommand(Guid Id) : ICommand<PayrollRunDto>;

public class ApprovePayrollRunHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ApprovePayrollRunCommand, PayrollRunDto>
{
    public async Task<Result<PayrollRunDto>> Handle(ApprovePayrollRunCommand request, CancellationToken cancellationToken)
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
            throw new BadRequestException("Bordro dönemi zaten kilitlenmiştir.");
        }

        run.Status = "Approved";
        run.ApprovedAt = DateTime.UtcNow;
        run.ApprovedByUserName = "İK Yöneticisi";
        run.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = new PayrollRunDto(
            run.Id,
            run.TenantId,
            run.Year,
            run.Month,
            run.Title,
            run.Status,
            run.TotalEmployees,
            run.TotalGross,
            run.TotalNet,
            run.TotalSgkEmployee,
            run.TotalSgkEmployer,
            run.TotalIncomeTax,
            run.TotalStampTax,
            run.TotalEmployerCost,
            run.CalculatedAt,
            run.ApprovedAt,
            run.ApprovedByUserName,
            run.LockedAt,
            run.Notes,
            run.CreatedAt,
            run.UpdatedAt);

        return Result.Success(dto);
    }
}

public class ApprovePayrollRunEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payroll/runs/{id:guid}/approve", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ApprovePayrollRunCommand(id), ct);
            return Results.Ok(ApiResponse<PayrollRunDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.Approve")
        .WithName("ApprovePayrollRun")
        .WithTags("Payroll");
    }
}
