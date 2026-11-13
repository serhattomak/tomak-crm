using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using CRM.Modules.Chat.Entities;
using CRM.Modules.Customers.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Chat.Features;

public record SendWhatsAppMessageRequest(
    Guid? CustomerId,
    string PhoneNumber,
    string MessageText);

public record WhatsAppSettingsRequest(
    string PhoneNumberId,
    string? WabaId,
    string? AccessToken,
    string WebhookVerifyToken,
    string? BusinessPhoneNumber,
    bool IsActive = true);

public record WhatsAppSettingsDto(
    string PhoneNumberId,
    string? WabaId,
    bool HasAccessToken,
    string WebhookVerifyToken,
    string? BusinessPhoneNumber,
    bool IsActive);

public class WhatsAppEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/whatsapp")
            .WithTags("WhatsApp")
            .RequireAuthorization();

        // 1. GET /api/v1/whatsapp/messages
        group.MapGet("/messages", async (
            ChatDbContext db,
            string? phoneNumber,
            Guid? customerId,
            int page = 1,
            int pageSize = 50,
            CancellationToken ct = default) =>
        {
            var query = db.WhatsAppMessages.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(phoneNumber))
            {
                query = query.Where(m => m.PhoneNumber.Contains(phoneNumber.Trim()));
            }

            if (customerId.HasValue)
            {
                query = query.Where(m => m.CustomerId == customerId.Value);
            }

            var totalCount = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return Results.Ok(new
            {
                items,
                page,
                pageSize,
                totalCount
            });
        }).RequirePermission("WhatsApp.View");

        // 2. POST /api/v1/whatsapp/send (Giden Mesaj)
        group.MapPost("/send", async (
            SendWhatsAppMessageRequest req,
            ChatDbContext db,
            CustomersDbContext custDb,
            ICurrentTenant currentTenant,
            IHttpClientFactory httpClientFactory,
            ILogger<WhatsAppEndpoints> logger,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.PhoneNumber) || string.IsNullOrWhiteSpace(req.MessageText))
            {
                return Results.BadRequest("Telefon numarası ve mesaj içeriği zorunludur.");
            }

            var cleanPhone = req.PhoneNumber.Replace("+", "").Replace(" ", "").Replace("-", "").Trim();
            string? customerName = null;

            if (req.CustomerId.HasValue)
            {
                var cust = await custDb.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == req.CustomerId.Value, ct);
                customerName = cust?.Name;
            }

            var msg = new WhatsAppMessage
            {
                TenantId = currentTenant.Id ?? Guid.Empty,
                CustomerId = req.CustomerId,
                CustomerName = customerName,
                PhoneNumber = cleanPhone,
                Direction = "Outbound",
                MessageText = req.MessageText,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Attempt Meta Cloud API. Without a configured account the message cannot be
            // sent, so the request fails instead of recording a fake "Sent" row.
            var settings = await db.WhatsAppSettings.AsNoTracking().FirstOrDefaultAsync(ct);
            if (settings is null
                || !settings.IsActive
                || string.IsNullOrWhiteSpace(settings.AccessToken)
                || string.IsNullOrWhiteSpace(settings.PhoneNumberId))
            {
                return Results.BadRequest(new { error = "WhatsApp ayarları tanımlı veya etkin değil. Mesaj gönderilmedi." });
            }

            try
            {
                var client = httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", settings.AccessToken);

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = cleanPhone,
                    type = "text",
                    text = new { preview_url = false, body = req.MessageText }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                var res = await client.PostAsync($"https://graph.facebook.com/v21.0/{settings.PhoneNumberId}/messages", content, ct);

                if (res.IsSuccessStatusCode)
                {
                    msg.Status = "Sent";
                    var json = await res.Content.ReadAsStringAsync(ct);
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("messages", out var messages) && messages.GetArrayLength() > 0)
                    {
                        msg.MetaMessageId = messages[0].GetProperty("id").GetString();
                    }
                }
                else
                {
                    msg.Status = "Failed";
                    msg.ErrorMessage = await res.Content.ReadAsStringAsync(ct);
                    logger.LogWarning("WhatsApp API failed: {Error}", msg.ErrorMessage);
                }
            }
            catch (Exception ex)
            {
                msg.Status = "Failed";
                msg.ErrorMessage = ex.Message;
                logger.LogError(ex, "WhatsApp sending error");
            }

            db.WhatsAppMessages.Add(msg);
            await db.SaveChangesAsync(ct);

            return Results.Ok(msg);
        }).RequirePermission("WhatsApp.Send");

        // 3. GET /api/v1/whatsapp/settings
        group.MapGet("/settings", async (ChatDbContext db, CancellationToken ct) =>
        {
            var settings = await db.WhatsAppSettings.AsNoTracking().FirstOrDefaultAsync(ct);
            var dto = settings is null
                ? null
                : new WhatsAppSettingsDto(
                    settings.PhoneNumberId,
                    settings.WabaId,
                    !string.IsNullOrWhiteSpace(settings.AccessToken),
                    settings.WebhookVerifyToken,
                    settings.BusinessPhoneNumber,
                    settings.IsActive);

            // The access token is a Meta credential; it is never returned.
            return Results.Ok(dto);
        }).RequirePermission("Chat.Manage");

        // 4. PUT /api/v1/whatsapp/settings
        group.MapPut("/settings", async (
            WhatsAppSettingsRequest req,
            ChatDbContext db,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.PhoneNumberId) || string.IsNullOrWhiteSpace(req.WebhookVerifyToken))
            {
                return Results.BadRequest(new { error = "phoneNumberId ve webhookVerifyToken zorunludur." });
            }

            if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            {
                return Results.BadRequest(new { error = "Tenant bilgisi bulunamadı." });
            }

            var settings = await db.WhatsAppSettings.FirstOrDefaultAsync(ct);
            if (settings is null)
            {
                settings = new WhatsAppSettings { TenantId = currentTenant.Id.Value };
                db.WhatsAppSettings.Add(settings);
            }

            settings.PhoneNumberId = req.PhoneNumberId.Trim();
            settings.WabaId = req.WabaId?.Trim();
            // An empty access token keeps the stored credential, so the screen never
            // has to round-trip the secret it was not shown.
            if (!string.IsNullOrWhiteSpace(req.AccessToken))
            {
                settings.AccessToken = req.AccessToken.Trim();
            }

            settings.WebhookVerifyToken = req.WebhookVerifyToken.Trim();
            settings.BusinessPhoneNumber = req.BusinessPhoneNumber?.Trim();
            settings.IsActive = req.IsActive;
            settings.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            return Results.Ok(new WhatsAppSettingsDto(
                settings.PhoneNumberId,
                settings.WabaId,
                !string.IsNullOrWhiteSpace(settings.AccessToken),
                settings.WebhookVerifyToken,
                settings.BusinessPhoneNumber,
                settings.IsActive));
        }).RequirePermission("Chat.Manage");

        // 5. Meta Webhook Verification & Inbound Message Receiver
        var webhookGroup = app.MapGroup("/api/public/webhooks/whatsapp")
            .WithTags("Public WhatsApp Webhook")
            .AllowAnonymous();

        webhookGroup.MapGet("/", async (HttpContext context, ChatDbContext db, CancellationToken ct) =>
        {
            var mode = context.Request.Query["hub.mode"].ToString();
            var token = context.Request.Query["hub.verify_token"].ToString();
            var challenge = context.Request.Query["hub.challenge"].ToString();

            // Meta echoes the token stored for the tenant. The webhook runs before any
            // tenant is resolved, so the lookup must ignore the tenant query filter;
            // the token itself names the tenant. No matching token, no handshake.
            var tokenMatches = !string.IsNullOrWhiteSpace(token)
                && await db.WhatsAppSettings
                    .IgnoreQueryFilters()
                    .AnyAsync(s => s.IsActive && s.WebhookVerifyToken == token, ct);

            if (mode == "subscribe" && !string.IsNullOrWhiteSpace(challenge) && tokenMatches)
            {
                return Results.Content(challenge, "text/plain");
            }

            return Results.StatusCode(StatusCodes.Status403Forbidden);
        });

        webhookGroup.MapPost("/", async (
            HttpContext context,
            ChatDbContext db,
            CustomersDbContext custDb,
            ICurrentTenant currentTenant,
            IConfiguration configuration,
            ILogger<WhatsAppEndpoints> logger,
            CancellationToken ct) =>
        {
            using var reader = new System.IO.StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync(ct);

            // Meta signs the raw body with the app secret. Without a configured secret
            // the payload cannot be verified, so the endpoint refuses to process it.
            var appSecret = configuration["WhatsApp:AppSecret"];
            if (string.IsNullOrWhiteSpace(appSecret))
            {
                logger.LogWarning("WhatsApp webhook rejected: WhatsApp:AppSecret is not configured.");
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            }

            var signature = context.Request.Headers["X-Hub-Signature-256"].ToString();
            if (!HasValidWhatsAppSignature(body, signature, appSecret))
            {
                return Results.StatusCode(StatusCodes.Status401Unauthorized);
            }

            try
            {
                using var doc = JsonDocument.Parse(body);
                var entry = doc.RootElement.GetProperty("entry")[0];
                var changes = entry.GetProperty("changes")[0];
                var val = changes.GetProperty("value");

                // The receiving WhatsApp number identifies the tenant. Resolving it here
                // keeps the customer lookup and the insert inside one tenant instead of
                // matching a same-looking phone number in every tenant.
                var phoneNumberId = val.TryGetProperty("metadata", out var metadata)
                    && metadata.TryGetProperty("phone_number_id", out var pnid)
                        ? pnid.GetString()
                        : null;

                var settings = string.IsNullOrWhiteSpace(phoneNumberId)
                    ? null
                    : await db.WhatsAppSettings
                        .IgnoreQueryFilters()
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.PhoneNumberId == phoneNumberId && s.IsActive, ct);

                if (settings is null)
                {
                    logger.LogWarning("WhatsApp webhook ignored: unknown phone_number_id {PhoneNumberId}", phoneNumberId);
                    return Results.Ok();
                }

                currentTenant.SetTenant(settings.TenantId);

                if (val.TryGetProperty("messages", out var messages) && messages.GetArrayLength() > 0)
                {
                    var m = messages[0];
                    var fromPhone = m.GetProperty("from").GetString() ?? "";
                    var wamid = m.GetProperty("id").GetString();
                    var text = "";

                    if (m.TryGetProperty("text", out var textObj))
                    {
                        text = textObj.GetProperty("body").GetString() ?? "";
                    }

                    if (!string.IsNullOrWhiteSpace(fromPhone))
                    {
                        // Match with customer
                        var cust = await custDb.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Phone != null && c.Phone.Contains(fromPhone), ct);

                        var inboundMsg = new WhatsAppMessage
                        {
                            TenantId = settings.TenantId,
                            CustomerId = cust?.Id,
                            CustomerName = cust?.Name,
                            PhoneNumber = fromPhone,
                            Direction = "Inbound",
                            MessageText = text,
                            MetaMessageId = wamid,
                            Status = "Received",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        db.WhatsAppMessages.Add(inboundMsg);
                        await db.SaveChangesAsync(ct);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing WhatsApp inbound webhook");
            }

            return Results.Ok();
        });
    }

    private static bool HasValidWhatsAppSignature(string body, string? signatureHeader, string appSecret)
    {
        const string prefix = "sha256=";
        if (string.IsNullOrWhiteSpace(signatureHeader)
            || !signatureHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(appSecret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(body)))
            .ToLowerInvariant();
        var provided = signatureHeader[prefix.Length..].ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(provided));
    }
}
