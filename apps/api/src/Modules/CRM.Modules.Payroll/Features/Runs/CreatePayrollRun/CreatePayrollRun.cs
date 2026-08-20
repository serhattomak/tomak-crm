using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Entities;
using CRM.Modules.Payroll.Features.Parameters.GetPayrollParameters;
using CRM.Modules.Payroll.Features.Runs.GetPayrollRuns;
using CRM.Modules.Payroll.Services;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Runs.CreatePayrollRun;

public record CreatePayrollRunCommand(
    int Year,
    int Month,
    string? Title = null,
    string? Notes = null) : ICommand<PayrollRunDto>;

public class CreatePayrollRunValidator : AbstractValidator<CreatePayrollRunCommand>
{
    public CreatePayrollRunValidator()
    {
        RuleFor(x => x.Year).InclusiveBetween(2020, 2099).WithMessage("Geçerli bir yıl giriniz.");
        RuleFor(x => x.Month).InclusiveBetween(1, 12).WithMessage("Geçerli bir ay (1-12) giriniz.");
    }
}

public class CreatePayrollRunHandler(
    PayrollDbContext payrollDbContext,
    OrganizationDbContext orgDbContext,
    IPayrollCalculationEngine calculationEngine,
    ICurrentTenant currentTenant) : ICommandHandler<CreatePayrollRunCommand, PayrollRunDto>
{
    private static readonly string[] MonthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    public async Task<Result<PayrollRunDto>> Handle(CreatePayrollRunCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var existingRun = await payrollDbContext.PayrollRuns
            .AnyAsync(x => x.Year == request.Year && x.Month == request.Month && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (existingRun)
        {
            throw new ConflictException($"{request.Year} yılı {MonthNames[request.Month - 1]} ayı için zaten bir bordro dönemi mevcut.");
        }

        // Parametreleri al veya oluştur
        var param = await payrollDbContext.PayrollParameters
            .FirstOrDefaultAsync(x => x.Year == request.Year && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (param == null)
        {
            param = new PayrollParameter
            {
                TenantId = currentTenant.Id.Value,
                Year = request.Year,
                Title = $"{request.Year} Yılı Türkiye Yasal Parametreleri"
            };
            payrollDbContext.PayrollParameters.Add(param);
            await payrollDbContext.SaveChangesAsync(cancellationToken);
        }

        // Aktif çalışanları çek
        var employees = await orgDbContext.Employees
            .AsNoTracking()
            .Include(e => e.Department)
            .Include(e => e.JobPosition)
            .Where(e => e.TenantId == currentTenant.Id.Value && e.Status == "Active")
            .ToListAsync(cancellationToken);

        var monthName = MonthNames[request.Month - 1];
        var title = string.IsNullOrWhiteSpace(request.Title)
            ? $"{monthName} {request.Year} Bordrosu"
            : request.Title.Trim();

        var run = new PayrollRun
        {
            TenantId = currentTenant.Id.Value,
            Year = request.Year,
            Month = request.Month,
            Title = title,
            Status = "Calculated",
            Notes = request.Notes,
            CalculatedAt = DateTime.UtcNow
        };

        decimal totalGross = 0m;
        decimal totalNet = 0m;
        decimal totalSgkEmployee = 0m;
        decimal totalSgkEmployer = 0m;
        decimal totalIncomeTax = 0m;
        decimal totalStampTax = 0m;
        decimal totalEmployerCost = 0m;

        foreach (var emp in employees)
        {
            var baseSalary = emp.Salary ?? param.MinWageGross;
            var contractType = "Gross";

            // Yıl başından önceki aylardaki kümülatif matrahı hesapla
            var priorCumulative = await payrollDbContext.EmployeePayrolls
                .Where(x => x.EmployeeId == emp.Id && x.PayrollRun!.Year == request.Year && x.PayrollRun.Month < request.Month && x.PayrollRun.Status != "Draft")
                .OrderByDescending(x => x.PayrollRun!.Month)
                .Select(x => (decimal?)x.CurrentCumulativeIncomeTaxBase)
                .FirstOrDefaultAsync(cancellationToken) ?? 0m;

            var calcInput = new PayrollCalculationInput(
                BaseSalary: baseSalary,
                ContractSalaryType: contractType,
                WorkedDays: 22m,
                WeekendDays: 8m,
                HolidayDays: 0m,
                PaidLeaveDays: 0m,
                UnpaidLeaveDays: 0m,
                SickLeaveDays: 0m,
                PriorCumulativeIncomeTaxBase: priorCumulative,
                Apply5510Incentive: true);

            var calc = calculationEngine.Calculate(calcInput, param);

            var ep = new EmployeePayroll
            {
                TenantId = currentTenant.Id.Value,
                PayrollRunId = run.Id,
                EmployeeId = emp.Id,
                EmployeeName = emp.FullName,
                EmployeeNumber = emp.EmployeeNumber,
                DepartmentId = emp.DepartmentId,
                DepartmentName = emp.Department?.Name,
                JobTitle = emp.Title ?? emp.JobPosition?.Title,
                ContractSalaryType = contractType,
                BaseSalary = baseSalary,
                WorkedDays = calc.WorkedDays,
                WeekendDays = calc.WeekendDays,
                HolidayDays = calc.HolidayDays,
                PaidLeaveDays = calc.PaidLeaveDays,
                UnpaidLeaveDays = calc.UnpaidLeaveDays,
                SickLeaveDays = calc.SickLeaveDays,
                TotalPaidDays = calc.TotalPaidDays,
                OvertimeHours = calc.OvertimeHours,
                NormalGross = calc.NormalGross,
                OvertimeGross = calc.OvertimeGross,
                BonusGross = calc.BonusGross,
                MealAllowanceGross = calc.MealAllowanceGross,
                TravelAllowanceGross = calc.TravelAllowanceGross,
                OtherGross = calc.OtherGross,
                TotalGross = calc.TotalGross,
                SgkBase = calc.SgkBase,
                SgkEmployeeDeduction = calc.SgkEmployeeDeduction,
                UnemploymentEmployeeDeduction = calc.UnemploymentEmployeeDeduction,
                PriorCumulativeIncomeTaxBase = calc.PriorCumulativeIncomeTaxBase,
                CurrentIncomeTaxBase = calc.CurrentIncomeTaxBase,
                CurrentCumulativeIncomeTaxBase = calc.CurrentCumulativeIncomeTaxBase,
                CalculatedIncomeTax = calc.CalculatedIncomeTax,
                MinWageIncomeTaxExemption = calc.MinWageIncomeTaxExemption,
                PayableIncomeTax = calc.PayableIncomeTax,
                CalculatedStampTax = calc.CalculatedStampTax,
                MinWageStampTaxExemption = calc.MinWageStampTaxExemption,
                PayableStampTax = calc.PayableStampTax,
                BesDeduction = calc.BesDeduction,
                IcraDeduction = calc.IcraDeduction,
                AdvanceDeduction = calc.AdvanceDeduction,
                PrivateHealthInsuranceDeduction = calc.PrivateHealthInsuranceDeduction,
                TotalDeductions = calc.TotalDeductions,
                NetSalary = calc.NetSalary,
                PayableNetSalary = calc.PayableNetSalary,
                SgkEmployerDeduction = calc.SgkEmployerDeduction,
                SgkEmployerDiscount5510 = calc.SgkEmployerDiscount5510,
                UnemploymentEmployerDeduction = calc.UnemploymentEmployerDeduction,
                TotalEmployerCost = calc.TotalEmployerCost,
                Status = "Calculated"
            };

            run.EmployeePayrolls.Add(ep);

            totalGross += calc.TotalGross;
            totalNet += calc.PayableNetSalary;
            totalSgkEmployee += (calc.SgkEmployeeDeduction + calc.UnemploymentEmployeeDeduction);
            totalSgkEmployer += (calc.SgkEmployerDeduction - calc.SgkEmployerDiscount5510 + calc.UnemploymentEmployerDeduction);
            totalIncomeTax += calc.PayableIncomeTax;
            totalStampTax += calc.PayableStampTax;
            totalEmployerCost += calc.TotalEmployerCost;
        }

        run.TotalEmployees = employees.Count;
        run.TotalGross = totalGross;
        run.TotalNet = totalNet;
        run.TotalSgkEmployee = totalSgkEmployee;
        run.TotalSgkEmployer = totalSgkEmployer;
        run.TotalIncomeTax = totalIncomeTax;
        run.TotalStampTax = totalStampTax;
        run.TotalEmployerCost = totalEmployerCost;

        payrollDbContext.PayrollRuns.Add(run);
        await payrollDbContext.SaveChangesAsync(cancellationToken);

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

public class CreatePayrollRunEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payroll/runs", async (
            CreatePayrollRunCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<PayrollRunDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.Manage")
        .WithName("CreatePayrollRun")
        .WithTags("Payroll");
    }
}
