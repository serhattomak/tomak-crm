using System.Globalization;
using System.Net;
using System.Text;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
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

/// <summary>
/// Preview request body. QuoteId optional — if provided, real quote data is used; otherwise mock.
/// Variables overrides allow caller-supplied replacements.
/// </summary>
public record PreviewQuoteTemplateRequest(
    Guid? QuoteId,
    Dictionary<string, string>? Variables);

public record PreviewQuoteTemplateCommand(
    Guid TemplateId,
    Guid? QuoteId,
    Dictionary<string, string>? Variables) : IQuery<PreviewQuoteTemplateResponse>;

public record PreviewQuoteTemplateResponse(
    string Html,
    string Subject);

public class PreviewQuoteTemplateValidator : AbstractValidator<PreviewQuoteTemplateCommand>
{
    public PreviewQuoteTemplateValidator()
    {
        RuleFor(x => x.TemplateId).NotEmpty();
    }
}

public class PreviewQuoteTemplateHandler(
    OrdersDbContext dbContext,
    ICurrentTenant currentTenant,
    ITemplateRenderer renderer,
    ILogger<PreviewQuoteTemplateHandler> logger) : IQueryHandler<PreviewQuoteTemplateCommand, PreviewQuoteTemplateResponse>
{
    private static readonly CultureInfo TrCulture = CultureInfo.GetCultureInfo("tr-TR");

    public async Task<Result<PreviewQuoteTemplateResponse>> Handle(PreviewQuoteTemplateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
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
                logger.LogWarning("Preview requested for template {TemplateId} with non-existent quote {QuoteId}, falling back to mock", request.TemplateId, request.QuoteId);
            }
        }

        var variables = BuildVariables(template, quote, quoteItems, request.Variables);

        string html = await renderer.RenderSingleAsync(template.HtmlBody, variables, cancellationToken);
        string subject = await renderer.RenderSingleAsync(template.Subject, variables, cancellationToken);

        // Ensure html is not empty — provide fallback wrapper if template had no htmlBody
        if (string.IsNullOrWhiteSpace(html) && !string.IsNullOrWhiteSpace(template.HtmlBody))
        {
            html = WebUtility.HtmlEncode(template.HtmlBody);
        }

        // If html is still empty, wrap mock content
        if (string.IsNullOrWhiteSpace(html))
        {
            html = "<div style=\"font-family: sans-serif; padding: 16px;\"><p>Önizleme için şablon içeriği boş.</p></div>";
        }

        return Result.Success(new PreviewQuoteTemplateResponse(html, subject));
    }

    internal static Dictionary<string, object> BuildVariables(
        QuoteTemplate template,
        Quote? quote,
        List<QuoteItem> items,
        Dictionary<string, string>? overrides)
    {
        var tr = TrCulture;

        string FormatCurrency(decimal amount) => amount.ToString("N2", tr) + " ₺";
        string FormatDate(DateTime? dt) => dt?.ToString("dd.MM.yyyy", tr) ?? DateTime.UtcNow.AddDays(15).ToString("dd.MM.yyyy", tr);

        // Base values — mock defaults
        string customerName = quote?.CustomerName ?? "Örnek Müşteri";
        string quoteNumber = quote?.QuoteNumber ?? "QT-2026-0001";
        string quoteTitle = quote?.Title ?? "Örnek Teklif";
        decimal subtotal = quote?.Subtotal ?? 10000m;
        decimal taxAmount = quote?.TaxAmount ?? 2000m;
        decimal totalAmount = quote?.TotalAmount ?? 12345.67m;
        DateTime? validUntil = quote?.ValidUntil ?? DateTime.UtcNow.AddDays(15);
        string companyName = "Örnek Şirket A.Ş.";
        // Try to infer companyName from quote's AssignedUserName or keep mock
        if (!string.IsNullOrWhiteSpace(quote?.AssignedUserName))
        {
            // Keep mock companyName; assigned user is not company
        }

        string paymentTerms = template.PaymentTerms ?? quote?.PaymentTerms ?? "Peşin ödeme, 15 gün vade";
        string deliveryTerms = template.DeliveryTerms ?? quote?.DeliveryTerms ?? "3 iş günü içerisinde teslim";
        string bankDetails = template.BankDetails ?? quote?.BankDetails ?? "TR00 0000 0000 0000 0000 0000 00 - Örnek Banka";
        string notes = quote?.Notes ?? "Bu teklif örnektir.";
        string termsAndConditions = template.TermsAndConditions ?? quote?.TermsAndConditions ?? string.Empty;

        string itemsTable = BuildItemsTable(items, tr);

        var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
        {
            ["customerName"] = customerName,
            ["quoteNumber"] = quoteNumber,
            ["quoteTitle"] = quoteTitle,
            ["totalAmount"] = FormatCurrency(totalAmount),
            ["subtotal"] = FormatCurrency(subtotal),
            ["taxAmount"] = FormatCurrency(taxAmount),
            ["validUntil"] = FormatDate(validUntil),
            ["companyName"] = companyName,
            ["itemsTable"] = itemsTable,
            ["paymentTerms"] = paymentTerms,
            ["deliveryTerms"] = deliveryTerms,
            ["bankDetails"] = bankDetails,
            ["notes"] = notes,
            ["termsAndConditions"] = termsAndConditions,
            ["companyAddress"] = "Örnek Mah. Örnek Cad. No:1, İstanbul",
            ["companyPhone"] = "+90 212 000 00 00",
            ["companyEmail"] = "info@ornek-sirket.com.tr",
            ["quoteDate"] = (quote?.CreatedAt ?? DateTime.UtcNow).ToString("dd.MM.yyyy", tr),
            ["currency"] = quote?.Currency ?? "TRY"
        };

        // Merge overrides (caller-supplied variables win)
        if (overrides != null)
        {
            foreach (var kv in overrides)
            {
                if (!string.IsNullOrWhiteSpace(kv.Key))
                {
                    dict[kv.Key.Trim()] = kv.Value ?? string.Empty;
                }
            }
        }

        return dict;
    }

    private static string BuildItemsTable(List<QuoteItem> items, CultureInfo culture)
    {
        var sb = new StringBuilder();
        sb.Append("<table style=\"width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px;\">");
        sb.Append("<thead><tr>");
        sb.Append("<th style=\"border:1px solid #e5e7eb;padding:8px;text-align:left;background:#f9fafb;\">Ürün</th>");
        sb.Append("<th style=\"border:1px solid #e5e7eb;padding:8px;text-align:right;background:#f9fafb;\">Miktar</th>");
        sb.Append("<th style=\"border:1px solid #e5e7eb;padding:8px;text-align:right;background:#f9fafb;\">Birim Fiyat</th>");
        sb.Append("<th style=\"border:1px solid #e5e7eb;padding:8px;text-align:right;background:#f9fafb;\">Toplam</th>");
        sb.Append("</tr></thead><tbody>");

        IReadOnlyList<(string ProductName, decimal Quantity, decimal UnitPrice, decimal TotalPrice)> rows;

        if (items.Count > 0)
        {
            rows = items.Select(i => (i.ProductName, i.Quantity, i.UnitPrice, i.TotalPrice)).ToList();
        }
        else
        {
            // Mock items for preview when no quote
            rows = new List<(string, decimal, decimal, decimal)>
            {
                ("Örnek Ürün A", 2m, 3500m, 7000m),
                ("Örnek Ürün B", 1m, 5345.67m, 5345.67m)
            };
        }

        foreach (var r in rows)
        {
            sb.Append("<tr>");
            sb.Append($"<td style=\"border:1px solid #e5e7eb;padding:8px;\">{WebUtility.HtmlEncode(r.ProductName)}</td>");
            sb.Append($"<td style=\"border:1px solid #e5e7eb;padding:8px;text-align:right;\">{r.Quantity.ToString("N2", culture)}</td>");
            sb.Append($"<td style=\"border:1px solid #e5e7eb;padding:8px;text-align:right;\">{r.UnitPrice.ToString("N2", culture)} ₺</td>");
            sb.Append($"<td style=\"border:1px solid #e5e7eb;padding:8px;text-align:right;font-weight:600;\">{r.TotalPrice.ToString("N2", culture)} ₺</td>");
            sb.Append("</tr>");
        }

        sb.Append("</tbody></table>");
        return sb.ToString();
    }
}

public class PreviewQuoteTemplateEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes/templates/{id:guid}/preview", async (
            Guid id,
            PreviewQuoteTemplateRequest? request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new PreviewQuoteTemplateCommand(
                id,
                request?.QuoteId,
                request?.Variables
            );
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<PreviewQuoteTemplateResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.View")
        .WithName("PreviewQuoteTemplate")
        .WithTags("Quotes");
    }
}
