using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Features.Quotes.Services;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.GetQuotePdf;

public record GetQuotePdfQuery(Guid Id) : IQuery<(byte[] Bytes, string FileName)>;

public class GetQuotePdfHandler(
    OrdersDbContext dbContext,
    TenantsDbContext tenantsDbContext,
    IQuotePdfGenerator pdfGenerator,
    ICurrentTenant currentTenant) : IQueryHandler<GetQuotePdfQuery, (byte[] Bytes, string FileName)>
{
    public async Task<Result<(byte[] Bytes, string FileName)>> Handle(GetQuotePdfQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var quote = await dbContext.Quotes
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == request.Id && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{request.Id}' was not found.");
        }

        var tenant = await tenantsDbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var pdfBytes = pdfGenerator.GenerateQuotePdf(
            quote,
            companyName: tenant?.Name,
            companyAddress: null,
            companyPhone: null,
            companyEmail: null);

        var fileName = $"Teklif-{quote.QuoteNumber}.pdf";
        return Result.Success((pdfBytes, fileName));
    }
}

public class GetQuotePdfEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/quotes/{id:guid}/pdf", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetQuotePdfQuery(id), ct);
            return Results.File(result.Value.Bytes, "application/pdf", result.Value.FileName);
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.View")
        .WithName("GetQuotePdf")
        .WithTags("Quotes");
    }
}
