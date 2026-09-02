using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.DTOs;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.QuoteTemplates;

public record GetQuoteTemplatesQuery : IQuery<List<QuoteTemplateDto>>;

public record GetQuoteTemplateDetailsQuery(Guid Id) : IQuery<QuoteTemplateDto>;

public record CreateQuoteTemplateCommand(
    string Name,
    string? TermsAndConditions,
    string? PaymentTerms,
    string? DeliveryTerms,
    string? BankDetails,
    bool IsDefault,
    string? Subject = null,
    string? HtmlBody = null,
    string[]? Variables = null) : ICommand<Guid>;

public record UpdateQuoteTemplateCommand(
    Guid Id,
    string Name,
    string? TermsAndConditions,
    string? PaymentTerms,
    string? DeliveryTerms,
    string? BankDetails,
    bool IsDefault,
    string? Subject = null,
    string? HtmlBody = null,
    string[]? Variables = null) : ICommand<Guid>;

public record DeleteQuoteTemplateCommand(Guid Id) : ICommand<bool>;

public class CreateQuoteTemplateValidator : AbstractValidator<CreateQuoteTemplateCommand>
{
    public CreateQuoteTemplateValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Şablon adı gereklidir.")
            .MaximumLength(150);

        RuleFor(x => x.Subject)
            .MaximumLength(200).WithMessage("Konu en fazla 200 karakter olabilir.")
            .When(x => x.Subject != null);

        RuleFor(x => x.HtmlBody)
            .Must(h => !string.IsNullOrWhiteSpace(h!))
            .When(x => x.HtmlBody != null)
            .WithMessage("HtmlBody boş olamaz.");

        RuleFor(x => x.Variables)
            .Must(v => v == null || v.All(s => !string.IsNullOrWhiteSpace(s)))
            .WithMessage("Variables boş değer içeremez.");
    }
}

public class UpdateQuoteTemplateValidator : AbstractValidator<UpdateQuoteTemplateCommand>
{
    public UpdateQuoteTemplateValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Şablon adı gereklidir.")
            .MaximumLength(150);

        RuleFor(x => x.Subject)
            .MaximumLength(200).WithMessage("Konu en fazla 200 karakter olabilir.")
            .When(x => x.Subject != null);

        RuleFor(x => x.HtmlBody)
            .Must(h => !string.IsNullOrWhiteSpace(h!))
            .When(x => x.HtmlBody != null)
            .WithMessage("HtmlBody boş olamaz.");

        RuleFor(x => x.Variables)
            .Must(v => v == null || v.All(s => !string.IsNullOrWhiteSpace(s)))
            .WithMessage("Variables boş değer içeremez.");
    }
}

public class QuoteTemplatesHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant) :
    IQueryHandler<GetQuoteTemplatesQuery, List<QuoteTemplateDto>>,
    IQueryHandler<GetQuoteTemplateDetailsQuery, QuoteTemplateDto>,
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
            .ToListAsync(cancellationToken);

        // Map via extension to include Subject/HtmlBody/Variables; PreviewHtml null by default
        var dtos = templates.Select(t => t.ToDto()).ToList();

        return Result.Success(dtos);
    }

    public async Task<Result<QuoteTemplateDto>> Handle(GetQuoteTemplateDetailsQuery request, CancellationToken cancellationToken)
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

        return Result.Success(template.ToDto());
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

        var subjectTrimmed = request.Subject?.Trim();
        if (string.IsNullOrWhiteSpace(subjectTrimmed))
        {
            subjectTrimmed = null;
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
            Subject = subjectTrimmed,
            HtmlBody = request.HtmlBody,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.Variables != null)
        {
            template.SetVariables(request.Variables);
        }

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

        var subjectTrimmed = request.Subject?.Trim();
        if (string.IsNullOrWhiteSpace(subjectTrimmed))
        {
            subjectTrimmed = null;
        }

        template.Name = request.Name.Trim();
        template.TermsAndConditions = request.TermsAndConditions?.Trim();
        template.PaymentTerms = request.PaymentTerms?.Trim();
        template.DeliveryTerms = request.DeliveryTerms?.Trim();
        template.BankDetails = request.BankDetails?.Trim();
        template.IsDefault = request.IsDefault;
        template.Subject = subjectTrimmed;
        template.HtmlBody = request.HtmlBody;
        template.UpdatedAt = DateTime.UtcNow;

        if (request.Variables != null)
        {
            template.SetVariables(request.Variables);
        }

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

        app.MapGet("/api/quotes/templates/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetQuoteTemplateDetailsQuery(id), ct);
            return Results.Ok(ApiResponse<QuoteTemplateDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.View")
        .WithName("GetQuoteTemplateDetails")
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
                dto.IsDefault,
                dto.Subject,
                dto.HtmlBody,
                dto.Variables != null ? [.. dto.Variables] : null
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
