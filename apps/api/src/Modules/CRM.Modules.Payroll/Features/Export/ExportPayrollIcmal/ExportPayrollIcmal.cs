using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Export.ExportPayrollIcmal;

public record PayrollIcmalRowDto(
    string EmployeeNumber,
    string TcIdentityNumber,
    string EmployeeName,
    string DepartmentName,
    string JobTitle,
    string Iban,
    decimal BaseSalary,
    decimal TotalPaidDays,
    decimal WorkedDays,
    decimal OvertimeHours,
    decimal TotalGross,
    decimal SgkBase,
    decimal SgkEmployeeDeduction,
    decimal UnemploymentEmployeeDeduction,
    decimal PriorCumulativeIncomeTaxBase,
    decimal CurrentIncomeTaxBase,
    decimal CurrentCumulativeIncomeTaxBase,
    decimal CalculatedIncomeTax,
    decimal MinWageIncomeTaxExemption,
    decimal PayableIncomeTax,
    decimal CalculatedStampTax,
    decimal MinWageStampTaxExemption,
    decimal PayableStampTax,
    decimal BesDeduction,
    decimal IcraDeduction,
    decimal AdvanceDeduction,
    decimal TotalDeductions,
    decimal PayableNetSalary,
    decimal SgkEmployerDeduction,
    decimal SgkEmployerDiscount5510,
    decimal UnemploymentEmployerDeduction,
    decimal TotalEmployerCost);

public record PayrollIcmalResponse(
    Guid RunId,
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
    List<PayrollIcmalRowDto> Rows);

public record ExportPayrollIcmalQuery(Guid RunId) : IQuery<PayrollIcmalResponse>;

public class ExportPayrollIcmalHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<ExportPayrollIcmalQuery, PayrollIcmalResponse>
{
    public async Task<Result<PayrollIcmalResponse>> Handle(ExportPayrollIcmalQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var run = await dbContext.PayrollRuns
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.RunId && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (run == null)
        {
            throw new NotFoundException("Bordro dönemi bulunamadı.");
        }

        var rows = await dbContext.EmployeePayrolls
            .AsNoTracking()
            .Where(x => x.PayrollRunId == request.RunId && x.TenantId == currentTenant.Id.Value)
            .OrderBy(x => x.EmployeeName)
            .Select(x => new PayrollIcmalRowDto(
                x.EmployeeNumber ?? "-",
                x.TcIdentityNumber ?? "-",
                x.EmployeeName,
                x.DepartmentName ?? "-",
                x.JobTitle ?? "-",
                x.Iban ?? "-",
                x.BaseSalary,
                x.TotalPaidDays,
                x.WorkedDays,
                x.OvertimeHours,
                x.TotalGross,
                x.SgkBase,
                x.SgkEmployeeDeduction,
                x.UnemploymentEmployeeDeduction,
                x.PriorCumulativeIncomeTaxBase,
                x.CurrentIncomeTaxBase,
                x.CurrentCumulativeIncomeTaxBase,
                x.CalculatedIncomeTax,
                x.MinWageIncomeTaxExemption,
                x.PayableIncomeTax,
                x.CalculatedStampTax,
                x.MinWageStampTaxExemption,
                x.PayableStampTax,
                x.BesDeduction,
                x.IcraDeduction,
                x.AdvanceDeduction,
                x.TotalDeductions,
                x.PayableNetSalary,
                x.SgkEmployerDeduction,
                x.SgkEmployerDiscount5510,
                x.UnemploymentEmployerDeduction,
                x.TotalEmployerCost))
            .ToListAsync(cancellationToken);

        return Result.Success(new PayrollIcmalResponse(
            run.Id,
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
            rows));
    }
}

public class ExportPayrollIcmalEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payroll/runs/{runId:guid}/icmal", async (
            Guid runId,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ExportPayrollIcmalQuery(runId), ct);
            return Results.Ok(ApiResponse<PayrollIcmalResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.View")
        .WithName("ExportPayrollIcmal")
        .WithTags("Payroll");
    }
}
