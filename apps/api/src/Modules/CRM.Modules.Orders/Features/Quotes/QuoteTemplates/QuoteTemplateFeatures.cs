using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.QuoteTemplates;

public record GetQuoteTemplatesQuery : IQuery<List<QuoteTemplateDto>>;
public record CreateQuoteTemplateCommand(string Name, string? TermsAndConditions, string? PaymentTerms, string? DeliveryTerms, string? BankDetails, bool IsDefault) : ICommand<Guid>;
public record UpdateQuoteTemplateCommand(Guid Id, string Name, string? TermsAndConditions, string? PaymentTerms, string? DeliveryTerms, string? BankDetails, bool IsDefault) : ICommand<Guid>;
public record DeleteQuoteTemplateCommand(Guid Id) : ICommand<bool>;

public class QuoteTemplatesHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) :
    IQueryHandler<GetQuoteTemplatesQuery, List<QuoteTemplateDto>>,
    ICommandHandler<CreateQuoteTemplateCommand, Guid>,
    ICommandHandler<UpdateQuoteTemplateCommand, Guid>,
    ICommandHandler<DeleteQuoteTemplateCommand, bool>
{
    public async Task<Result<List<QuoteTemplateDto>>> Handle(GetQuoteTemplatesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var templates = await dbContext.QuoteTemplates
            .Where(t => t.TenantId == tenantId)
            .OrderByDescending(t => t.IsDefault)
            .ThenBy(t => t.Name)
            .Select(t => new QuoteTemplateDto(
                t.Id,
                t.Name,
                t.TermsAndConditions,
                t.PaymentTerms,
                t.DeliveryTerms,
                t.BankDetails,
                t.IsDefault,
                t.CreatedAt,
                t.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(templates);
    }

    public async Task<Result<Guid>> Handle(CreateQuoteTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        if (request.IsDefault)
        {
            var existingDefaults = await dbContext.QuoteTemplates
                .Where(t => t.TenantId == tenantId && t.IsDefault)
                .ToListAsync(cancellationToken);
            foreach (var d in existingDefaults)
            {
                d.IsDefault = false;
            }
        }

        var template = new QuoteTemplate
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name.Trim(),
            TermsAndConditions = request.TermsAndConditions?.Trim(),
            PaymentTerms = request.PaymentTerms?.Trim(),
            DeliveryTerms = request.DeliveryTerms?.Trim(),
            BankDetails = request.BankDetails?.Trim(),
            IsDefault = request.IsDefault,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.QuoteTemplates.Add(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(template.Id);
    }

    public async Task<Result<Guid>> Handle(UpdateQuoteTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var template = await dbContext.QuoteTemplates
            .FirstOrDefaultAsync(t => t.Id == request.Id && t.TenantId == tenantId, cancellationToken);

        if (template == null)
        {
            throw new NotFoundException($"Template with ID '{request.Id}' was not found.");
        }

        if (request.IsDefault && !template.IsDefault)
        {
            var existingDefaults = await dbContext.QuoteTemplates
                .Where(t => t.TenantId == tenantId && t.IsDefault)
                .ToListAsync(cancellationToken);
            foreach (var d in existingDefaults)
            {
                d.IsDefault = false;
            }
        }

        template.Name = request.Name.Trim();
        template.TermsAndConditions = request.TermsAndConditions?.Trim();
        template.PaymentTerms = request.PaymentTerms?.Trim();
        template.DeliveryTerms = request.DeliveryTerms?.Trim();
        template.BankDetails = request.BankDetails?.Trim();
        template.IsDefault = request.IsDefault;
        template.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(template.Id);
    }

    public async Task<Result<bool>> Handle(DeleteQuoteTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var template = await dbContext.QuoteTemplates
            .FirstOrDefaultAsync(t => t.Id == request.Id && t.TenantId == tenantId, cancellationToken);

        if (template == null)
        {
            throw new NotFoundException($"Template with ID '{request.Id}' was not found.");
        }

        dbContext.QuoteTemplates.Remove(template);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class QuoteTemplatesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/quotes/templates", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetQuoteTemplatesQuery(), ct);
            return Results.Ok(ApiResponse<List<QuoteTemplateDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.View")
        .WithName("GetQuoteTemplates")
        .WithTags("Quotes");

        app.MapPost("/api/quotes/templates", async (
            CreateQuoteTemplateCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Templates")
        .WithName("CreateQuoteTemplate")
        .WithTags("Quotes");

        app.MapPut("/api/quotes/templates/{id:guid}", async (
            Guid id,
            QuoteTemplateDto dto,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateQuoteTemplateCommand(
                id,
                dto.Name,
                dto.TermsAndConditions,
                dto.PaymentTerms,
                dto.DeliveryTerms,
                dto.BankDetails,
                dto.IsDefault
            );
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Templates")
        .WithName("UpdateQuoteTemplate")
        .WithTags("Quotes");

        app.MapDelete("/api/quotes/templates/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteQuoteTemplateCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Templates")
        .WithName("DeleteQuoteTemplate")
        .WithTags("Quotes");
    }
}
