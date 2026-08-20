using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Payslips.GetEmployeePayslip;

public record PayslipDto(
    Guid Id,
    Guid PayrollRunId,
    int Year,
    int Month,
    string RunTitle,
    string RunStatus,
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
    DateTime? CalculatedAt,
    DateTime? ApprovedAt,
    DateTime CreatedAt);

public record GetEmployeePayslipQuery(Guid Id) : IQuery<PayslipDto>;

public class GetEmployeePayslipHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetEmployeePayslipQuery, PayslipDto>
{
    public async Task<Result<PayslipDto>> Handle(GetEmployeePayslipQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var ep = await dbContext.EmployeePayrolls
            .AsNoTracking()
            .Include(x => x.PayrollRun)
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (ep == null)
        {
            throw new NotFoundException("Bordro pusulası bulunamadı.");
        }

        var dto = new PayslipDto(
            ep.Id,
            ep.PayrollRunId,
            ep.PayrollRun?.Year ?? DateTime.UtcNow.Year,
            ep.PayrollRun?.Month ?? DateTime.UtcNow.Month,
            ep.PayrollRun?.Title ?? "Bordro",
            ep.PayrollRun?.Status ?? "Calculated",
            ep.EmployeeId,
            ep.EmployeeName,
            ep.EmployeeNumber,
            ep.TcIdentityNumber,
            ep.DepartmentId,
            ep.DepartmentName,
            ep.JobTitle,
            ep.Iban,
            ep.ContractSalaryType,
            ep.BaseSalary,
            ep.WorkedDays,
            ep.WeekendDays,
            ep.HolidayDays,
            ep.PaidLeaveDays,
            ep.UnpaidLeaveDays,
            ep.SickLeaveDays,
            ep.TotalPaidDays,
            ep.OvertimeHours,
            ep.NormalGross,
            ep.OvertimeGross,
            ep.BonusGross,
            ep.MealAllowanceGross,
            ep.TravelAllowanceGross,
            ep.OtherGross,
            ep.TotalGross,
            ep.SgkBase,
            ep.SgkEmployeeDeduction,
            ep.UnemploymentEmployeeDeduction,
            ep.PriorCumulativeIncomeTaxBase,
            ep.CurrentIncomeTaxBase,
            ep.CurrentCumulativeIncomeTaxBase,
            ep.CalculatedIncomeTax,
            ep.MinWageIncomeTaxExemption,
            ep.PayableIncomeTax,
            ep.CalculatedStampTax,
            ep.MinWageStampTaxExemption,
            ep.PayableStampTax,
            ep.BesDeduction,
            ep.IcraDeduction,
            ep.AdvanceDeduction,
            ep.PrivateHealthInsuranceDeduction,
            ep.TotalDeductions,
            ep.NetSalary,
            ep.PayableNetSalary,
            ep.SgkEmployerDeduction,
            ep.SgkEmployerDiscount5510,
            ep.UnemploymentEmployerDeduction,
            ep.TotalEmployerCost,
            ep.PayrollRun?.CalculatedAt,
            ep.PayrollRun?.ApprovedAt,
            ep.CreatedAt);

        return Result.Success(dto);
    }
}

public class GetEmployeePayslipEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payroll/payslips/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetEmployeePayslipQuery(id), ct);
            return Results.Ok(ApiResponse<PayslipDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.View")
        .WithName("GetEmployeePayslip")
        .WithTags("Payroll");
    }
}
