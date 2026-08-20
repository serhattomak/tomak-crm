using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Entities;
using CRM.Modules.Payroll.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Payslips.SimulatePayroll;

public record SimulatePayrollCommand(
    decimal BaseSalary,
    string ContractSalaryType = "Gross", // "Gross" or "Net"
    int? Year = null,
    decimal WorkedDays = 22m,
    decimal WeekendDays = 8m,
    decimal HolidayDays = 0m,
    decimal PaidLeaveDays = 0m,
    decimal UnpaidLeaveDays = 0m,
    decimal SickLeaveDays = 0m,
    decimal OvertimeHours = 0m,
    decimal BonusGross = 0m,
    decimal MealAllowance = 0m,
    decimal TravelAllowance = 0m,
    decimal OtherGross = 0m,
    decimal PriorCumulativeIncomeTaxBase = 0m,
    bool Apply5510Incentive = true,
    bool HasBes = false,
    decimal BesRate = 0.03m,
    decimal IcraDeduction = 0m,
    decimal AdvanceDeduction = 0m,
    decimal PrivateHealthInsurance = 0m) : ICommand<PayrollCalculationResult>;

public class SimulatePayrollHandler(
    PayrollDbContext dbContext,
    IPayrollCalculationEngine calculationEngine,
    ICurrentTenant currentTenant) : ICommandHandler<SimulatePayrollCommand, PayrollCalculationResult>
{
    public async Task<Result<PayrollCalculationResult>> Handle(SimulatePayrollCommand request, CancellationToken cancellationToken)
    {
        var year = request.Year ?? DateTime.UtcNow.Year;

        PayrollParameter? param = null;
        if (currentTenant.Id.HasValue && currentTenant.Id.Value != Guid.Empty)
        {
            param = await dbContext.PayrollParameters
                .FirstOrDefaultAsync(x => x.Year == year && x.TenantId == currentTenant.Id.Value, cancellationToken);
        }

        param ??= new PayrollParameter
        {
            Year = year,
            Title = $"{year} Yasal Parametreleri"
        };

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
            MealAllowance: request.MealAllowance,
            TravelAllowance: request.TravelAllowance,
            OtherGross: request.OtherGross,
            PriorCumulativeIncomeTaxBase: request.PriorCumulativeIncomeTaxBase,
            Apply5510Incentive: request.Apply5510Incentive,
            HasBes: request.HasBes,
            BesRate: request.BesRate,
            IcraDeduction: request.IcraDeduction,
            AdvanceDeduction: request.AdvanceDeduction,
            PrivateHealthInsurance: request.PrivateHealthInsurance);

        var result = calculationEngine.Simulate(calcInput, param);

        return Result.Success(result);
    }
}

public class SimulatePayrollEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/payroll/simulate", async (
            SimulatePayrollCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<PayrollCalculationResult>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("SimulatePayroll")
        .WithTags("Payroll");
    }
}
