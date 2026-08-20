using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Features.Runs.GetPayrollRunById;
using CRM.Modules.Payroll.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Runs.UpdateEmployeePuantaj;

public record UpdateEmployeePuantajCommand(
    Guid RunId,
    Guid EmployeePayrollId,
    decimal BaseSalary,
    string ContractSalaryType,
    decimal WorkedDays,
    decimal WeekendDays,
    decimal HolidayDays,
    decimal PaidLeaveDays,
    decimal UnpaidLeaveDays,
    decimal SickLeaveDays,
    decimal OvertimeHours,
    decimal BonusGross,
    decimal MealAllowanceGross,
    decimal TravelAllowanceGross,
    decimal OtherGross,
    bool HasBes,
    decimal BesRate,
    decimal IcraDeduction,
    decimal AdvanceDeduction,
    decimal PrivateHealthInsurance) : ICommand<EmployeePayrollDetailDto>;

public class UpdateEmployeePuantajHandler(
    PayrollDbContext dbContext,
    IPayrollCalculationEngine calculationEngine,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateEmployeePuantajCommand, EmployeePayrollDetailDto>
{
    public async Task<Result<EmployeePayrollDetailDto>> Handle(UpdateEmployeePuantajCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var run = await dbContext.PayrollRuns
            .Include(r => r.EmployeePayrolls)
            .FirstOrDefaultAsync(x => x.Id == request.RunId && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (run == null)
        {
            throw new NotFoundException("Bordro dönemi bulunamadı.");
        }

        if (run.Status == "Locked")
        {
            throw new BadRequestException("Kilitlenmiş bordro dönemleri üzerinde değişiklik yapılamaz.");
        }

        var ep = run.EmployeePayrolls.FirstOrDefault(x => x.Id == request.EmployeePayrollId);
        if (ep == null)
        {
            throw new NotFoundException("Çalışan bordro kaydı bulunamadı.");
        }

        var param = await dbContext.PayrollParameters
            .FirstOrDefaultAsync(x => x.Year == run.Year && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (param == null)
        {
            throw new NotFoundException("Mevzuat parametreleri bulunamadı.");
        }

        // Hesaplama motorunu çalıştır
        var calcInput = new PayrollCalculationInput(
            BaseSalary: request.BaseSalary,
            ContractSalaryType: request.ContractSalaryType,
            WorkedDays: request.WorkedDays,
            WeekendDays: request.WeekendDays,
            HolidayDays: request.HolidayDays,
            PaidLeaveDays: request.PaidLeaveDays,
            UnpaidLeaveDays: request.UnpaidLeaveDays,
            SickLeaveDays: request.SickLeaveDays,
            OvertimeHours: request.OvertimeHours,
            BonusGross: request.BonusGross,
            MealAllowance: request.MealAllowanceGross,
            TravelAllowance: request.TravelAllowanceGross,
            OtherGross: request.OtherGross,
            PriorCumulativeIncomeTaxBase: ep.PriorCumulativeIncomeTaxBase,
            Apply5510Incentive: true,
            HasBes: request.HasBes,
            BesRate: request.BesRate,
            IcraDeduction: request.IcraDeduction,
            AdvanceDeduction: request.AdvanceDeduction,
            PrivateHealthInsurance: request.PrivateHealthInsurance);

        var calc = calculationEngine.Calculate(calcInput, param);

        // Kaydı güncelle
        ep.BaseSalary = request.BaseSalary;
        ep.ContractSalaryType = request.ContractSalaryType;
        ep.WorkedDays = calc.WorkedDays;
        ep.WeekendDays = calc.WeekendDays;
        ep.HolidayDays = calc.HolidayDays;
        ep.PaidLeaveDays = calc.PaidLeaveDays;
        ep.UnpaidLeaveDays = calc.UnpaidLeaveDays;
        ep.SickLeaveDays = calc.SickLeaveDays;
        ep.TotalPaidDays = calc.TotalPaidDays;
        ep.OvertimeHours = calc.OvertimeHours;
        ep.NormalGross = calc.NormalGross;
        ep.OvertimeGross = calc.OvertimeGross;
        ep.BonusGross = calc.BonusGross;
        ep.MealAllowanceGross = calc.MealAllowanceGross;
        ep.TravelAllowanceGross = calc.TravelAllowanceGross;
        ep.OtherGross = calc.OtherGross;
        ep.TotalGross = calc.TotalGross;
        ep.SgkBase = calc.SgkBase;
        ep.SgkEmployeeDeduction = calc.SgkEmployeeDeduction;
        ep.UnemploymentEmployeeDeduction = calc.UnemploymentEmployeeDeduction;
        ep.CurrentIncomeTaxBase = calc.CurrentIncomeTaxBase;
        ep.CurrentCumulativeIncomeTaxBase = calc.CurrentCumulativeIncomeTaxBase;
        ep.CalculatedIncomeTax = calc.CalculatedIncomeTax;
        ep.MinWageIncomeTaxExemption = calc.MinWageIncomeTaxExemption;
        ep.PayableIncomeTax = calc.PayableIncomeTax;
        ep.CalculatedStampTax = calc.CalculatedStampTax;
        ep.MinWageStampTaxExemption = calc.MinWageStampTaxExemption;
        ep.PayableStampTax = calc.PayableStampTax;
        ep.BesDeduction = calc.BesDeduction;
        ep.IcraDeduction = calc.IcraDeduction;
        ep.AdvanceDeduction = calc.AdvanceDeduction;
        ep.PrivateHealthInsuranceDeduction = calc.PrivateHealthInsuranceDeduction;
        ep.TotalDeductions = calc.TotalDeductions;
        ep.NetSalary = calc.NetSalary;
        ep.PayableNetSalary = calc.PayableNetSalary;
        ep.SgkEmployerDeduction = calc.SgkEmployerDeduction;
        ep.SgkEmployerDiscount5510 = calc.SgkEmployerDiscount5510;
        ep.UnemploymentEmployerDeduction = calc.UnemploymentEmployerDeduction;
        ep.TotalEmployerCost = calc.TotalEmployerCost;
        ep.UpdatedAt = DateTime.UtcNow;

        // Run toplamlarını yeniden hesapla
        run.TotalGross = run.EmployeePayrolls.Sum(x => x.TotalGross);
        run.TotalNet = run.EmployeePayrolls.Sum(x => x.PayableNetSalary);
        run.TotalSgkEmployee = run.EmployeePayrolls.Sum(x => x.SgkEmployeeDeduction + x.UnemploymentEmployeeDeduction);
        run.TotalSgkEmployer = run.EmployeePayrolls.Sum(x => x.SgkEmployerDeduction - x.SgkEmployerDiscount5510 + x.UnemploymentEmployerDeduction);
        run.TotalIncomeTax = run.EmployeePayrolls.Sum(x => x.PayableIncomeTax);
        run.TotalStampTax = run.EmployeePayrolls.Sum(x => x.PayableStampTax);
        run.TotalEmployerCost = run.EmployeePayrolls.Sum(x => x.TotalEmployerCost);
        run.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = new EmployeePayrollDetailDto(
            ep.Id,
            ep.PayrollRunId,
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
            ep.Status,
            ep.CreatedAt,
            ep.UpdatedAt);

        return Result.Success(dto);
    }
}

public class UpdateEmployeePuantajEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/payroll/runs/{runId:guid}/employees/{employeePayrollId:guid}", async (
            Guid runId,
            Guid employeePayrollId,
            UpdateEmployeePuantajCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command with { RunId = runId, EmployeePayrollId = employeePayrollId }, ct);
            return Results.Ok(ApiResponse<EmployeePayrollDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.Manage")
        .WithName("UpdateEmployeePuantaj")
        .WithTags("Payroll");
    }
}
