using System.Net.Http.Headers;
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
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Chat.Features;

public record SendWhatsAppMessageRequest(
    Guid? CustomerId,
    string PhoneNumber,
    string MessageText);

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
        });

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
                Status = "Sent",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Attempt Meta Cloud API if settings present
            var settings = await db.WhatsAppSettings.AsNoTracking().FirstOrDefaultAsync(ct);
            if (settings != null && !string.IsNullOrWhiteSpace(settings.AccessToken) && !string.IsNullOrWhiteSpace(settings.PhoneNumberId))
            {
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
            }

            db.WhatsAppMessages.Add(msg);
            await db.SaveChangesAsync(ct);

            return Results.Ok(msg);
        });

        // 3. Meta Webhook Verification & Inbound Message Receiver
        var webhookGroup = app.MapGroup("/api/public/webhooks/whatsapp")
            .WithTags("Public WhatsApp Webhook")
            .AllowAnonymous();

        webhookGroup.MapGet("/", (HttpContext context) =>
        {
            var mode = context.Request.Query["hub.mode"].ToString();
            var token = context.Request.Query["hub.verify_token"].ToString();
            var challenge = context.Request.Query["hub.challenge"].ToString();

            // Default demo verification or verify against settings
            if (mode == "subscribe" && !string.IsNullOrWhiteSpace(challenge))
            {
                return Results.Content(challenge, "text/plain");
            }

            return Results.BadRequest("Doğrulama başarısız.");
        });

        webhookGroup.MapPost("/", async (
            HttpContext context,
            ChatDbContext db,
            CustomersDbContext custDb,
            ILogger<WhatsAppEndpoints> logger,
            CancellationToken ct) =>
        {
            using var reader = new System.IO.StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync(ct);

            try
            {
                using var doc = JsonDocument.Parse(body);
                var entry = doc.RootElement.GetProperty("entry")[0];
                var changes = entry.GetProperty("changes")[0];
                var val = changes.GetProperty("value");

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
                            TenantId = cust?.TenantId ?? Guid.Empty,
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
}
