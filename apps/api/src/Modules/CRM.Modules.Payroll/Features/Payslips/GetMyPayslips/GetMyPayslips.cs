using System.Security.Claims;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Features.Payslips.GetEmployeePayslip;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Payslips.GetMyPayslips;

public record GetMyPayslipsQuery : IQuery<List<PayslipDto>>;

public class GetMyPayslipsHandler(
    PayrollDbContext payrollDbContext,
    OrganizationDbContext orgDbContext,
    ICurrentTenant currentTenant,
    IHttpContextAccessor httpContextAccessor) : IQueryHandler<GetMyPayslipsQuery, List<PayslipDto>>
{
    public async Task<Result<List<PayslipDto>>> Handle(GetMyPayslipsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? httpContextAccessor.HttpContext?.User?.FindFirstValue("sub");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedException("Kullanıcı kimliği doğrulanamadı.");
        }

        var employee = await orgDbContext.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.TenantId == currentTenant.Id.Value, cancellationToken);

        if (employee == null)
        {
            return Result.Success(new List<PayslipDto>());
        }

        var payslips = await payrollDbContext.EmployeePayrolls
            .AsNoTracking()
            .Include(x => x.PayrollRun)
            .Where(x => x.EmployeeId == employee.Id && x.TenantId == currentTenant.Id.Value && x.PayrollRun!.Status != "Draft")
            .OrderByDescending(x => x.PayrollRun!.Year)
            .ThenByDescending(x => x.PayrollRun!.Month)
            .Select(ep => new PayslipDto(
                ep.Id,
                ep.PayrollRunId,
                ep.PayrollRun!.Year,
                ep.PayrollRun.Month,
                ep.PayrollRun.Title,
                ep.PayrollRun.Status,
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
                ep.PayrollRun.CalculatedAt,
                ep.PayrollRun.ApprovedAt,
                ep.CreatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(payslips);
    }
}

public class GetMyPayslipsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payroll/my-payslips", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetMyPayslipsQuery(), ct);
            return Results.Ok(ApiResponse<List<PayslipDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetMyPayslips")
        .WithTags("Payroll");
    }
}
