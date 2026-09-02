using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net;
using System.Text;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Realtime;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Services;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Orders.Features.Quotes.QuoteTemplates;

public record TestSendQuoteTemplateRequest(
    string ToEmail,
    Guid? QuoteId);

public record TestSendQuoteTemplateCommand(
    Guid TemplateId,
    string ToEmail,
    Guid? QuoteId) : ICommand<TestSendQuoteTemplateResponse>;

public record TestSendQuoteTemplateResponse(
    string PreviewHtml,
    string Subject,
    bool Sent,
    string Message,
    string ToEmail);

public class TestSendQuoteTemplateValidator : AbstractValidator<TestSendQuoteTemplateCommand>
{
    public TestSendQuoteTemplateValidator()
    {
        RuleFor(x => x.TemplateId).NotEmpty();
        RuleFor(x => x.ToEmail)
            .NotEmpty().WithMessage("Alıcı e-posta gereklidir.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.")
            .MaximumLength(254);
    }

    // Also validate request DTO directly via EmailAddressAttribute fallback
    public static bool IsValidEmail(string email)
    {
        return new EmailAddressAttribute().IsValid(email);
    }
}

public class TestSendQuoteTemplateHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant,
    ITemplateRenderer renderer,
    ILogger<TestSendQuoteTemplateHandler> logger,
    ICrmNotificationService notificationService,
    ICurrentUser currentUser) : ICommandHandler<TestSendQuoteTemplateCommand, TestSendQuoteTemplateResponse>
{
    private static readonly CultureInfo TrCulture = CultureInfo.GetCultureInfo("tr-TR");

    public async Task<Result<TestSendQuoteTemplateResponse>> Handle(TestSendQuoteTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        // Explicit email validation via attribute as spec requires EmailAddressAttribute check
        if (!new EmailAddressAttribute().IsValid(request.ToEmail))
        {
            throw new BadRequestException("Geçerli bir e-posta adresi giriniz.", "Validation.Email");
        }

        var tenantId = currentTenant.Id.Value;

        var template = await dbContext.QuoteTemplates
            .FirstOrDefaultAsync(t => t.Id == request.TemplateId && t.TenantId == tenantId, cancellationToken);

        if (template == null)
        {
            throw new NotFoundException($"Template with ID '{request.TemplateId}' was not found.");
        }

        Quote? quote = null;
        List<QuoteItem> quoteItems = [];

        if (request.QuoteId.HasValue)
        {
            quote = await dbContext.Quotes
                .Include(q => q.Items)
                .FirstOrDefaultAsync(q => q.Id == request.QuoteId.Value && q.TenantId == tenantId, cancellationToken);

            if (quote != null)
            {
                quoteItems = quote.Items.OrderBy(i => i.OrderIndex).ToList();
            }
            else
            {
                logger.LogWarning("Test-send requested for template {TemplateId} with missing quote {QuoteId}", request.TemplateId, request.QuoteId);
            }
        }

        var variables = PreviewQuoteTemplateHandler.BuildVariables(template, quote, quoteItems, null);

        string previewHtml = await renderer.RenderSingleAsync(template.HtmlBody, variables, cancellationToken);
        string subject = await renderer.RenderSingleAsync(template.Subject, variables, cancellationToken);

        if (string.IsNullOrWhiteSpace(previewHtml) && !string.IsNullOrWhiteSpace(template.HtmlBody))
        {
            previewHtml = WebUtility.HtmlEncode(template.HtmlBody);
        }

        if (string.IsNullOrWhiteSpace(previewHtml))
        {
            previewHtml = "<div style=\"font-family: sans-serif; padding: 16px;\"><p>Önizleme için şablon içeriği boş.</p></div>";
        }

        if (string.IsNullOrWhiteSpace(subject))
        {
            subject = template.Subject?.Trim() ?? $"Teklif {variables["quoteNumber"]} - {variables["customerName"]}";
        }

        string toEmailTrimmed = request.ToEmail.Trim();
        logger.LogInformation("Test send template {TemplateId} to {ToEmail} preview {Length}", request.TemplateId, toEmailTrimmed, previewHtml.Length);

        // Phase 1: no real SMTP — log only + in-app notification warning if SMTP not configured
        try
        {
            string title = "Test e-posta hazırlandı";
            string message = $"Test e-posta {toEmailTrimmed} için hazırlandı (şablon: {template.Name}) — SMTP yapılandırılmadı, yalnızca önizleme döndürüldü.";
            // Send to current user if available, otherwise broadcast to tenant
            Guid? userId = currentUser.Id;
            await notificationService.SendNotificationAsync(tenantId, userId, title, message, null, "warning", cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send in-app notification for test-send {TemplateId}", request.TemplateId);
        }

        var response = new TestSendQuoteTemplateResponse(
            PreviewHtml: previewHtml,
            Subject: subject,
            Sent: false,
            Message: "SMTP not configured — preview only",
            ToEmail: toEmailTrimmed
        );

        return Result.Success(response);
    }
}

public class TestSendQuoteTemplateEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes/templates/{id:guid}/test-send", async (
            Guid id,
            TestSendQuoteTemplateRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            // Ensure route id wins over body if mismatched
            var command = new TestSendQuoteTemplateCommand(
                id,
                request.ToEmail,
                request.QuoteId
            );
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<TestSendQuoteTemplateResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Manage")
        .WithName("TestSendQuoteTemplate")
        .WithTags("Quotes");

        // Alias with Quotes.Templates permission for backward compat per prompt
        app.MapPost("/api/quotes/templates/{id:guid}/test-send-alias", async (
            Guid id,
            TestSendQuoteTemplateRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new TestSendQuoteTemplateCommand(id, request.ToEmail, request.QuoteId);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<TestSendQuoteTemplateResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Templates")
        .WithName("TestSendQuoteTemplateAlias")
        .WithTags("Quotes");
    }
}
