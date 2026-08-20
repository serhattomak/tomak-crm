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

namespace CRM.Modules.Payroll.Features.Runs.GetPayrollRunById;

public record EmployeePayrollDetailDto(
    Guid Id,
    Guid PayrollRunId,
    Guid EmployeeId,
    string EmployeeName,
    string? EmployeeNumber,
    string? TcIdentityNumber,
    Guid? DepartmentId,
    string? DepartmentName,
    string? JobTitle,
    string? Iban,
    string ContractSalaryType,
    decimal BaseSalary,
    decimal WorkedDays,
    decimal WeekendDays,
    decimal HolidayDays,
    decimal PaidLeaveDays,
    decimal UnpaidLeaveDays,
    decimal SickLeaveDays,
    decimal TotalPaidDays,
    decimal OvertimeHours,
    decimal NormalGross,
    decimal OvertimeGross,
    decimal BonusGross,
    decimal MealAllowanceGross,
    decimal TravelAllowanceGross,
    decimal OtherGross,
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
    decimal PrivateHealthInsuranceDeduction,
    decimal TotalDeductions,
    decimal NetSalary,
    decimal PayableNetSalary,
    decimal SgkEmployerDeduction,
    decimal SgkEmployerDiscount5510,
    decimal UnemploymentEmployerDeduction,
    decimal TotalEmployerCost,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PayrollRunDetailResponse(
    PayrollRunDto Run,
    List<EmployeePayrollDetailDto> Employees);

public record GetPayrollRunByIdQuery(Guid Id) : IQuery<PayrollRunDetailResponse>;

public class GetPayrollRunByIdHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetPayrollRunByIdQuery, PayrollRunDetailResponse>
{
    public async Task<Result<PayrollRunDetailResponse>> Handle(GetPayrollRunByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var run = await dbContext.PayrollRuns
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (run == null)
        {
            throw new NotFoundException("Bordro dönemi bulunamadı.");
        }

        var runDto = new PayrollRunDto(
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

        var employeePayrolls = await dbContext.EmployeePayrolls
            .AsNoTracking()
            .Where(x => x.PayrollRunId == request.Id && x.TenantId == currentTenant.Id.Value)
            .OrderBy(x => x.EmployeeName)
            .Select(x => new EmployeePayrollDetailDto(
                x.Id,
                x.PayrollRunId,
                x.EmployeeId,
                x.EmployeeName,
                x.EmployeeNumber,
                x.TcIdentityNumber,
                x.DepartmentId,
                x.DepartmentName,
                x.JobTitle,
                x.Iban,
                x.ContractSalaryType,
                x.BaseSalary,
                x.WorkedDays,
                x.WeekendDays,
                x.HolidayDays,
                x.PaidLeaveDays,
                x.UnpaidLeaveDays,
                x.SickLeaveDays,
                x.TotalPaidDays,
                x.OvertimeHours,
                x.NormalGross,
                x.OvertimeGross,
                x.BonusGross,
                x.MealAllowanceGross,
                x.TravelAllowanceGross,
                x.OtherGross,
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
                x.PrivateHealthInsuranceDeduction,
                x.TotalDeductions,
                x.NetSalary,
                x.PayableNetSalary,
                x.SgkEmployerDeduction,
                x.SgkEmployerDiscount5510,
                x.UnemploymentEmployerDeduction,
                x.TotalEmployerCost,
                x.Status,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new PayrollRunDetailResponse(runDto, employeePayrolls));
    }
}

public class GetPayrollRunByIdEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payroll/runs/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetPayrollRunByIdQuery(id), ct);
            return Results.Ok(ApiResponse<PayrollRunDetailResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.View")
        .WithName("GetPayrollRunById")
        .WithTags("Payroll");
    }
}
