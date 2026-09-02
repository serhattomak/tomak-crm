using System.Globalization;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Services;
using CRM.Modules.Orders.Data;
using CRM.Modules.Orders.Entities;
using CRM.Modules.Orders.Features.Quotes.Services;
using CRM.Modules.Orders.Services;
using CRM.Modules.Tenants.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Orders.Features.Quotes.SendQuoteEmail;

public record SendQuoteEmailRequest(
    Guid? AccountId,
    string[]? To,
    string[]? Cc,
    string? Subject,
    string? Body,
    Guid? TemplateId,
    bool AttachPdf = true);

public record SendQuoteEmailResponse(
    bool Success,
    string QuoteNumber,
    string[] Recipients,
    DateTime SentAt,
    string? Message = null);

public record SendQuoteEmailCommand(Guid Id, SendQuoteEmailRequest Request) : ICommand<SendQuoteEmailResponse>;

public class SendQuoteEmailHandler(
    OrdersDbContext dbContext,
    CustomersDbContext customersDbContext,
    TenantsDbContext tenantsDbContext,
    EmailDbContext emailDbContext,
    IEmailService emailService,
    IQuotePdfGenerator pdfGenerator,
    ITemplateRenderer templateRenderer,
    ICurrentTenant currentTenant) : ICommandHandler<SendQuoteEmailCommand, SendQuoteEmailResponse>
{
    private static readonly CultureInfo TrCulture = new("tr-TR");

    public async Task<Result<SendQuoteEmailResponse>> Handle(SendQuoteEmailCommand command, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var req = command.Request;

        // 1. Fetch Quote
        var quote = await dbContext.Quotes
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.Id == command.Id && q.TenantId == tenantId, cancellationToken);

        if (quote == null)
        {
            throw new NotFoundException($"Quote with ID '{command.Id}' was not found.");
        }

        if (quote.Status == "PendingApproval")
        {
            throw new BadRequestException("Bu teklif yönetici onayı beklemektedir. Onaylanmadan müşteriye gönderilemez.");
        }

        // 2. Fetch Tenant details
        var tenant = await tenantsDbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        var companyName = tenant?.Name ?? "CRM PLATFORM";

        // 3. Determine Recipients (To)
        var toList = new List<string>();
        if (req.To != null && req.To.Length > 0)
        {
            toList.AddRange(req.To.Where(e => !string.IsNullOrWhiteSpace(e)).Select(e => e.Trim()));
        }

        if (toList.Count == 0 && quote.CustomerId.HasValue)
        {
            var customer = await customersDbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == quote.CustomerId.Value && c.TenantId == tenantId, cancellationToken);

            if (customer != null && !string.IsNullOrWhiteSpace(customer.Email))
            {
                toList.Add(customer.Email.Trim());
            }
        }

        if (toList.Count == 0)
        {
            throw new BadRequestException("Teklifin gönderileceği en az bir geçerli alıcı e-posta adresi belirtilmelidir.");
        }

        // 4. Determine Outbound Email Account
        Email.Entities.EmailAccount? account = null;
        if (req.AccountId.HasValue && req.AccountId.Value != Guid.Empty)
        {
            account = await emailDbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == req.AccountId.Value && a.TenantId == tenantId && a.IsActive, cancellationToken);

            if (account == null)
            {
                throw new BadRequestException("Belirtilen e-posta hesabı bulunamadı veya aktif değil.");
            }
        }
        else
        {
            account = await emailDbContext.Accounts
                .Where(a => a.TenantId == tenantId && a.IsActive)
                .OrderBy(a => a.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (account == null)
            {
                throw new BadRequestException("Teklif göndermek için kiracıya ait aktif bir e-posta hesabı bulunamadı. Lütfen E-posta modülü üzerinden bir hesap tanımlayın.");
            }
        }

        // 5. Template variables dictionary
        var variables = new Dictionary<string, object>
        {
            ["quoteNumber"] = quote.QuoteNumber,
            ["quoteTitle"] = quote.Title ?? "",
            ["customerName"] = quote.CustomerName,
            ["companyName"] = companyName,
            ["subtotal"] = quote.Subtotal.ToString("N2", TrCulture),
            ["taxAmount"] = quote.TaxAmount.ToString("N2", TrCulture),
            ["totalAmount"] = $"{quote.TotalAmount.ToString("N2", TrCulture)} {quote.Currency}",
            ["validUntil"] = quote.ValidUntil?.ToString("dd.MM.yyyy", TrCulture) ?? "-",
            ["paymentTerms"] = quote.PaymentTerms ?? "",
            ["deliveryTerms"] = quote.DeliveryTerms ?? "",
            ["bankDetails"] = quote.BankDetails ?? "",
            ["notes"] = quote.Notes ?? ""
        };

        // 6. Build Subject and HTML Body
        string subject = req.Subject?.Trim() ?? string.Empty;
        string htmlBody = req.Body?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(htmlBody))
        {
            QuoteTemplate? template = null;
            if (req.TemplateId.HasValue && req.TemplateId.Value != Guid.Empty)
            {
                template = await dbContext.QuoteTemplates
                    .FirstOrDefaultAsync(t => t.Id == req.TemplateId.Value && t.TenantId == tenantId, cancellationToken);
            }
            else
            {
                template = await dbContext.QuoteTemplates
                    .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.IsDefault, cancellationToken);
            }

            if (template != null)
            {
                if (string.IsNullOrWhiteSpace(subject))
                {
                    subject = await templateRenderer.RenderSingleAsync(template.Subject, variables, cancellationToken);
                }
                htmlBody = await templateRenderer.RenderSingleAsync(template.HtmlBody, variables, cancellationToken);
            }
        }

        if (string.IsNullOrWhiteSpace(subject))
        {
            subject = $"{companyName} - Fiyat Teklifi #{quote.QuoteNumber}";
        }

        if (string.IsNullOrWhiteSpace(htmlBody))
        {
            htmlBody = $@"
                <p>Sayın <strong>{quote.CustomerName}</strong>,</p>
                <p><strong>#{quote.QuoteNumber}</strong> numaralı fiyat teklifimiz hazırlanmış olup ekte bilgilerinize sunulmuştur.</p>
                <p>Teklif tutarı: <strong>{quote.TotalAmount:N2} {quote.Currency}</strong></p>
                <p>Geçerlilik tarihi: <strong>{(quote.ValidUntil.HasValue ? quote.ValidUntil.Value.ToString("dd.MM.yyyy", TrCulture) : "Belirtilmedi")}</strong></p>
                <p>Herhangi bir sorunuz olursa yanıtlamaktan memnuniyet duyarız.</p>
                <br/>
                <p>Saygılarımızla,<br/><strong>{companyName}</strong></p>";
        }

        // 7. Generate PDF attachment if requested
        var attachments = new List<(string Filename, string? MimeType, byte[] Content)>();
        if (req.AttachPdf)
        {
            var pdfBytes = pdfGenerator.GenerateQuotePdf(
                quote,
                companyName: companyName,
                companyAddress: null,
                companyPhone: null,
                companyEmail: account.Email);

            attachments.Add(($"Teklif-{quote.QuoteNumber}.pdf", "application/pdf", pdfBytes));
        }

        // 8. Dispatch Email via IEmailService
        var sendResult = await emailService.SendAsync(
            account.Id,
            toList.ToArray(),
            req.Cc,
            subject,
            htmlBody,
            attachments,
            isSimulation: false,
            cancellationToken);

        if (!sendResult.Sent)
        {
            throw new BadRequestException($"E-posta gönderimi başarısız: {sendResult.ErrorMessage}");
        }

        // 9. Update Quote status and record activity
        var now = DateTime.UtcNow;
        quote.Status = "Sent";
        quote.SentAt = now;
        quote.UpdatedAt = now;

        dbContext.QuoteActivities.Add(new QuoteActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            QuoteId = quote.Id,
            ActivityType = "EmailSent",
            Title = "Teklif E-posta ile Gönderildi",
            Description = $"Teklif #{quote.QuoteNumber} {(req.AttachPdf ? "PDF ekiyle birlikte " : "")}{string.Join(", ", toList)} adresine başarıyla iletildi.",
            CreatedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new SendQuoteEmailResponse(
            Success: true,
            QuoteNumber: quote.QuoteNumber,
            Recipients: toList.ToArray(),
            SentAt: now,
            Message: "Teklif e-posta ile başarıyla gönderildi."));
    }
}

public class SendQuoteEmailEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/quotes/{id:guid}/send-email", async (
            Guid id,
            SendQuoteEmailRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new SendQuoteEmailCommand(id, request), ct);
            return Results.Ok(result.Value);
        })
        .RequireAuthorization()
        .RequirePermission("Quotes.Update")
        .WithName("SendQuoteEmail")
        .WithTags("Quotes");
    }
}
