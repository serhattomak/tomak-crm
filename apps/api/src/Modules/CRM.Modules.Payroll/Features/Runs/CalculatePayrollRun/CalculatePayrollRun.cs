using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Features.Runs.GetPayrollRuns;
using CRM.Modules.Payroll.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Runs.CalculatePayrollRun;

public record CalculatePayrollRunCommand(Guid Id) : ICommand<PayrollRunDto>;

public class CalculatePayrollRunHandler(
    PayrollDbContext dbContext,
    IPayrollCalculationEngine calculationEngine,
    ICurrentTenant currentTenant) : ICommandHandler<CalculatePayrollRunCommand, PayrollRunDto>
{
    public async Task<Result<PayrollRunDto>> Handle(CalculatePayrollRunCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var run = await dbContext.PayrollRuns
            .Include(r => r.EmployeePayrolls)
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (run == null)
        {
            throw new NotFoundException("Bordro dönemi bulunamadı.");
        }

        if (run.Status == "Locked")
        {
            throw new BadRequestException("Kilitlenmiş bordro dönemleri tekrar hesaplanamaz.");
        }

        var param = await dbContext.PayrollParameters
            .FirstOrDefaultAsync(x => x.Year == run.Year && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (param == null)
        {
            throw new NotFoundException("Mevzuat parametreleri bulunamadı.");
        }

        decimal totalGross = 0m;
        decimal totalNet = 0m;
        decimal totalSgkEmployee = 0m;
        decimal totalSgkEmployer = 0m;
        decimal totalIncomeTax = 0m;
        decimal totalStampTax = 0m;
        decimal totalEmployerCost = 0m;

        foreach (var ep in run.EmployeePayrolls)
        {
            // Önceki ayların kümülatif gelir vergisi matrahını al
            var priorCumulative = await dbContext.EmployeePayrolls
                .Where(x => x.EmployeeId == ep.EmployeeId && x.PayrollRun!.Year == run.Year && x.PayrollRun.Month < run.Month && x.PayrollRun.Status != "Draft")
                .OrderByDescending(x => x.PayrollRun!.Month)
                .Select(x => (decimal?)x.CurrentCumulativeIncomeTaxBase)
                .FirstOrDefaultAsync(cancellationToken) ?? 0m;

            var calcInput = new PayrollCalculationInput(
                BaseSalary: ep.BaseSalary,
                ContractSalaryType: ep.ContractSalaryType,
                WorkedDays: ep.WorkedDays,
                WeekendDays: ep.WeekendDays,
                HolidayDays: ep.HolidayDays,
                PaidLeaveDays: ep.PaidLeaveDays,
                UnpaidLeaveDays: ep.UnpaidLeaveDays,
                SickLeaveDays: ep.SickLeaveDays,
                OvertimeHours: ep.OvertimeHours,
                BonusGross: ep.BonusGross,
                MealAllowance: ep.MealAllowanceGross,
                TravelAllowance: ep.TravelAllowanceGross,
                OtherGross: ep.OtherGross,
                PriorCumulativeIncomeTaxBase: priorCumulative,
                Apply5510Incentive: true,
                HasBes: ep.BesDeduction > 0,
                BesRate: 0.03m,
                IcraDeduction: ep.IcraDeduction,
                AdvanceDeduction: ep.AdvanceDeduction,
                PrivateHealthInsurance: ep.PrivateHealthInsuranceDeduction);

            var calc = calculationEngine.Calculate(calcInput, param);

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
            ep.PriorCumulativeIncomeTaxBase = calc.PriorCumulativeIncomeTaxBase;
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
            ep.Status = "Calculated";
            ep.UpdatedAt = DateTime.UtcNow;

            totalGross += calc.TotalGross;
            totalNet += calc.PayableNetSalary;
            totalSgkEmployee += (calc.SgkEmployeeDeduction + calc.UnemploymentEmployeeDeduction);
            totalSgkEmployer += (calc.SgkEmployerDeduction - calc.SgkEmployerDiscount5510 + calc.UnemploymentEmployerDeduction);
            totalIncomeTax += calc.PayableIncomeTax;
            totalStampTax += calc.PayableStampTax;
            totalEmployerCost += calc.TotalEmployerCost;
        }

        run.Status = "Calculated";
        run.TotalGross = totalGross;
        run.TotalNet = totalNet;
        run.TotalSgkEmployee = totalSgkEmployee;
        run.TotalSgkEmployer = totalSgkEmployer;
        run.TotalIncomeTax = totalIncomeTax;
        run.TotalStampTax = totalStampTax;
        run.TotalEmployerCost = totalEmployerCost;
        run.CalculatedAt = DateTime.UtcNow;
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

public class CalculatePayrollRunEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payroll/runs/{id:guid}/calculate", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new CalculatePayrollRunCommand(id), ct);
            return Results.Ok(ApiResponse<PayrollRunDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.Manage")
        .WithName("CalculatePayrollRun")
        .WithTags("Payroll");
    }
}
