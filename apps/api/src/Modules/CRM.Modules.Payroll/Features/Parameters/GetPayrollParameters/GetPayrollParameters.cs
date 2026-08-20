using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Parameters.GetPayrollParameters;

public record PayrollParameterDto(
    Guid Id,
    int Year,
    string Title,
    decimal MinWageGross,
    decimal MinWageNet,
    decimal SgkFloor,
    decimal SgkCeiling,
    decimal SgkEmployeeRate,
    decimal UnemploymentEmployeeRate,
    decimal SgkEmployerRate,
    decimal SgkEmployerDiscount5510Rate,
    decimal UnemploymentEmployerRate,
    decimal StampTaxRate,
    decimal BesDefaultRate,
    decimal TaxBracket1Limit,
    decimal TaxBracket1Rate,
    decimal TaxBracket2Limit,
    decimal TaxBracket2Rate,
    decimal TaxBracket3Limit,
    decimal TaxBracket3Rate,
    decimal TaxBracket4Limit,
    decimal TaxBracket4Rate,
    decimal TaxBracket5Rate,
    decimal MinWageTaxExemption,
    decimal MinWageStampExemption,
    decimal MealExemptionDaily,
    decimal TravelExemptionDaily,
    bool IsActive);

public record GetPayrollParametersQuery(int? Year = null) : IQuery<PayrollParameterDto>;

public class GetPayrollParametersHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetPayrollParametersQuery, PayrollParameterDto>
{
    public async Task<Result<PayrollParameterDto>> Handle(GetPayrollParametersQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var year = request.Year ?? DateTime.UtcNow.Year;

        var param = await dbContext.PayrollParameters
            .FirstOrDefaultAsync(x => x.Year == year, cancellationToken);

        if (param == null)
        {
            // Seed default 2025/2026 Turkey parameters
            param = new PayrollParameter
            {
                TenantId = currentTenant.Id.Value,
                Year = year,
                Title = $"{year} Yılı Türkiye Yasal Parametreleri",
                MinWageGross = 26005.50m,
                MinWageNet = 22104.68m,
                SgkFloor = 26005.50m,
                SgkCeiling = 195041.25m,
                SgkEmployeeRate = 0.1400m,
                UnemploymentEmployeeRate = 0.0100m,
                SgkEmployerRate = 0.2050m,
                SgkEmployerDiscount5510Rate = 0.0500m,
                UnemploymentEmployerRate = 0.0200m,
                StampTaxRate = 0.00759m,
                BesDefaultRate = 0.0300m,
                TaxBracket1Limit = 158000.00m,
                TaxBracket1Rate = 0.1500m,
                TaxBracket2Limit = 380000.00m,
                TaxBracket2Rate = 0.2000m,
                TaxBracket3Limit = 1400000.00m,
                TaxBracket3Rate = 0.2700m,
                TaxBracket4Limit = 4300000.00m,
                TaxBracket4Rate = 0.3500m,
                TaxBracket5Rate = 0.4000m,
                MinWageTaxExemption = 3315.70m,
                MinWageStampExemption = 197.38m,
                MealExemptionDaily = 240.00m,
                TravelExemptionDaily = 126.00m,
                IsActive = true
            };

            dbContext.PayrollParameters.Add(param);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var dto = new PayrollParameterDto(
            param.Id,
            param.Year,
            param.Title,
            param.MinWageGross,
            param.MinWageNet,
            param.SgkFloor,
            param.SgkCeiling,
            param.SgkEmployeeRate,
            param.UnemploymentEmployeeRate,
            param.SgkEmployerRate,
            param.SgkEmployerDiscount5510Rate,
            param.UnemploymentEmployerRate,
            param.StampTaxRate,
            param.BesDefaultRate,
            param.TaxBracket1Limit,
            param.TaxBracket1Rate,
            param.TaxBracket2Limit,
            param.TaxBracket2Rate,
            param.TaxBracket3Limit,
            param.TaxBracket3Rate,
            param.TaxBracket4Limit,
            param.TaxBracket4Rate,
            param.TaxBracket5Rate,
            param.MinWageTaxExemption,
            param.MinWageStampExemption,
            param.MealExemptionDaily,
            param.TravelExemptionDaily,
            param.IsActive);

        return Result.Success(dto);
    }
}

public class GetPayrollParametersEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payroll/parameters", async (
            [AsParameters] GetPayrollParametersQuery query,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PayrollParameterDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.View")
        .WithName("GetPayrollParameters")
        .WithTags("Payroll");
    }
}
