using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Payroll.Data;
using CRM.Modules.Payroll.Features.Parameters.GetPayrollParameters;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Payroll.Features.Parameters.UpdatePayrollParameters;

public record UpdatePayrollParametersCommand(
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
    bool IsActive) : ICommand<PayrollParameterDto>;

public class UpdatePayrollParametersHandler(
    PayrollDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdatePayrollParametersCommand, PayrollParameterDto>
{
    public async Task<Result<PayrollParameterDto>> Handle(UpdatePayrollParametersCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var param = await dbContext.PayrollParameters
            .FirstOrDefaultAsync(x => x.Year == request.Year, cancellationToken);

        if (param == null)
        {
            param = new Entities.PayrollParameter
            {
                TenantId = currentTenant.Id.Value,
                Year = request.Year
            };
            dbContext.PayrollParameters.Add(param);
        }

        param.Title = request.Title;
        param.MinWageGross = request.MinWageGross;
        param.MinWageNet = request.MinWageNet;
        param.SgkFloor = request.SgkFloor;
        param.SgkCeiling = request.SgkCeiling;
        param.SgkEmployeeRate = request.SgkEmployeeRate;
        param.UnemploymentEmployeeRate = request.UnemploymentEmployeeRate;
        param.SgkEmployerRate = request.SgkEmployerRate;
        param.SgkEmployerDiscount5510Rate = request.SgkEmployerDiscount5510Rate;
        param.UnemploymentEmployerRate = request.UnemploymentEmployerRate;
        param.StampTaxRate = request.StampTaxRate;
        param.BesDefaultRate = request.BesDefaultRate;
        param.TaxBracket1Limit = request.TaxBracket1Limit;
        param.TaxBracket1Rate = request.TaxBracket1Rate;
        param.TaxBracket2Limit = request.TaxBracket2Limit;
        param.TaxBracket2Rate = request.TaxBracket2Rate;
        param.TaxBracket3Limit = request.TaxBracket3Limit;
        param.TaxBracket3Rate = request.TaxBracket3Rate;
        param.TaxBracket4Limit = request.TaxBracket4Limit;
        param.TaxBracket4Rate = request.TaxBracket4Rate;
        param.TaxBracket5Rate = request.TaxBracket5Rate;
        param.MinWageTaxExemption = request.MinWageTaxExemption;
        param.MinWageStampExemption = request.MinWageStampExemption;
        param.MealExemptionDaily = request.MealExemptionDaily;
        param.TravelExemptionDaily = request.TravelExemptionDaily;
        param.IsActive = request.IsActive;
        param.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

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

public class UpdatePayrollParametersEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/payroll/parameters", async (
            UpdatePayrollParametersCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<PayrollParameterDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Payroll.ManageParameters")
        .WithName("UpdatePayrollParameters")
        .WithTags("Payroll");
    }
}
