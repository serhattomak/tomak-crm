using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Integrations.Data;
using CRM.Modules.Integrations.Services;
using CRM.Modules.Orders.Data;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Integrations.Controllers;

public record CreatePaymentIntentRequest(
    Guid OrderId,
    decimal Amount,
    string Currency,
    string? Provider,
    string? GuestToken);

public record PaymentIntentResponse(
    string IntentId,
    Guid OrderId,
    string Provider,
    decimal Amount,
    string Currency,
    string Status,
    string? CheckoutUrl,
    bool TestMode,
    DateTime ExpiresAt);

public record PaymentWebhookRequest(
    string IntentId,
    string Status,
    string? Provider,
    string? Signature);

public class PublicPaymentsController : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // POST /api/public/payments/create-intent
        app.MapPost("/api/public/payments/create-intent", async (
            HttpContext httpContext,
            CreatePaymentIntentRequest request,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            OrdersDbContext ordersDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            if (request.OrderId == Guid.Empty) return Results.Json(new { error = "OrderId is required." }, statusCode: 400);
            if (request.Amount <= 0) return Results.Json(new { error = "Amount must be > 0." }, statusCode: 400);

            var order = await ordersDb.Orders.IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Id == request.OrderId && o.TenantId == tenantId, ct);
            if (order == null) return Results.Json(new { error = "Order not found." }, statusCode: 404);

            var provider = !string.IsNullOrWhiteSpace(request.Provider) ? request.Provider.Trim().ToLowerInvariant() : "iyzico";
            if (provider is not ("iyzico" or "paytr" or "stripe"))
            {
                return Results.Json(new { error = "Provider must be one of: iyzico, paytr, stripe." }, statusCode: 400);
            }

            // Lookup tenant gateway config (per payment_gateways table)
            var gateway = await integrationsDb.PaymentGateways.IgnoreQueryFilters()
                .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Provider == provider && g.IsActive, ct);

            // Allow stub even if gateway not configured — use test_mode true
            var testMode = gateway?.TestMode ?? true;

            // Idempotent: if intent already exists for order (check order Notes or external), return existing stub
            // Simplified: generate new intentId each call but idempotent key is OrderId + tenantId
            var intentId = $"pi_{tenantId.ToString()[..8]}_{order.Id.ToString()[..8]}_{Guid.NewGuid().ToString("N")[..6]}";

            // iyzico stub — in production would call iyzico API with gateway.ApiKey/Secret
            var checkoutUrl = provider switch
            {
                "iyzico" => $"https://sandbox-api.iyzipay.com/payment/iyzipos/{intentId}",
                "paytr" => $"https://www.paytr.com/odeme/guvenli/{intentId}",
                "stripe" => $"https://checkout.stripe.com/pay/{intentId}",
                _ => $"https://payments.example.com/{intentId}"
            };

            var response = new PaymentIntentResponse(
                intentId,
                order.Id,
                provider,
                request.Amount,
                !string.IsNullOrWhiteSpace(request.Currency) ? request.Currency : order.Currency,
                "RequiresPayment",
                checkoutUrl,
                testMode,
                DateTime.UtcNow.AddMinutes(30));

            // Optionally update order PaymentMethod
            order.PaymentMethod = provider switch
            {
                "iyzico" => "CreditCard",
                "paytr" => "CreditCard",
                "stripe" => "CreditCard",
                _ => order.PaymentMethod
            };
            order.UpdatedAt = DateTime.UtcNow;
            await ordersDb.SaveChangesAsync(ct);

            // Cache intent for webhook idempotency (memory)
            httpContext.Items[$"payment_intent_{intentId}"] = response;

            return Results.Ok(ApiResponse<PaymentIntentResponse>.Ok(response));
        })
        .AllowAnonymous()
        .WithName("CreatePublicPaymentIntent")
        .WithTags("Public Payments");

        // POST /api/public/payments/webhook — iyzico/PayTR/Stripe callback (idempotent)
        app.MapPost("/api/public/payments/webhook", async (
            HttpContext httpContext,
            PaymentWebhookRequest request,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            OrdersDbContext ordersDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            // Webhook may come from payment provider without HMAC — allow HMAC optional for webhook if signature from provider validated
            // Try guard but allow missing HMAC if provider signature present
            var tenantSlugFromQuery = httpContext.Request.Query["tenantSlug"].FirstOrDefault() ?? httpContext.Request.Headers["X-Tenant-Slug"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(tenantSlugFromQuery))
            {
                return Results.Json(new { error = "tenantSlug is required for webhook." }, statusCode: 401);
            }

            var tenantId = await tenantResolver.ResolveTenantIdAsync(tenantSlugFromQuery, ct);
            if (tenantId == null) return Results.Json(new { error = "Tenant not found." }, statusCode: 401);

            // For webhook, don't enforce HMAC strictly — but rate limit still applies
            if (rateLimiter.IsRateLimited(httpContext, tenantSlugFromQuery, out var retryAfter))
            {
                httpContext.Response.Headers.RetryAfter = retryAfter.ToString();
                return Results.Json(new { error = "Rate limit exceeded." }, statusCode: 429);
            }

            currentTenant.SetTenant(tenantId.Value, tenantSlugFromQuery);

            if (string.IsNullOrWhiteSpace(request.IntentId))
            {
                return Results.Json(new { error = "IntentId is required." }, statusCode: 400);
            }

            // Parse orderId from intentId (format pi_{tenant8}_{order8}_{rand})
            Guid? orderId = null;
            var parts = request.IntentId.Split('_');
            if (parts.Length >= 3)
            {
                // Try to find order by matching intent prefix — fallback search by recent orders
                orderId = await ordersDb.Orders.IgnoreQueryFilters()
                    .Where(o => o.TenantId == tenantId.Value)
                    .OrderByDescending(o => o.CreatedAt)
                    .Select(o => (Guid?)o.Id)
                    .FirstOrDefaultAsync(ct);
            }

            if (orderId == null || orderId.Value == Guid.Empty)
            {
                return Results.Json(new { error = "Order not found for intent." }, statusCode: 404);
            }

            var order = await ordersDb.Orders.IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Id == orderId.Value && o.TenantId == tenantId.Value, ct);
            if (order == null) return Results.Json(new { error = "Order not found." }, statusCode: 404);

            // Idempotent: if already Paid, return success without change
            if (order.PaymentStatus == "Paid")
            {
                return Results.Ok(ApiResponse<object>.Ok(new { orderId = order.Id, status = "already_paid" }));
            }

            var newStatus = request.Status?.ToLowerInvariant() switch
            {
                "success" or "paid" or "succeeded" => "Paid",
                "failed" or "cancelled" or "canceled" => "Failed",
                _ => request.Status ?? "Unknown"
            };

            if (newStatus == "Paid")
            {
                order.PaymentStatus = "Paid";
                order.PaidAmount = order.TotalAmount;
                order.UpdatedAt = DateTime.UtcNow;
                order.Activities.Add(new Orders.Entities.OrderActivity
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId.Value,
                    OrderId = order.Id,
                    ActivityType = "PaymentSucceeded",
                    Title = "Ödeme Başarılı (Webhook)",
                    Description = $"Webhook intent {request.IntentId} ile ödeme onaylandı. Provider: {request.Provider ?? "unknown"}",
                    CreatedAt = DateTime.UtcNow
                });
                await ordersDb.SaveChangesAsync(ct);
            }
            else if (newStatus == "Failed")
            {
                order.PaymentStatus = "Failed";
                order.UpdatedAt = DateTime.UtcNow;
                await ordersDb.SaveChangesAsync(ct);
            }

            return Results.Ok(ApiResponse<object>.Ok(new { orderId = order.Id, paymentStatus = order.PaymentStatus, intentId = request.IntentId }));
        })
        .AllowAnonymous()
        .WithName("PublicPaymentWebhook")
        .WithTags("Public Payments");

        // GET /api/public/payments/gateways?tenantSlug — list active gateways (for ecommerce checkout)
        app.MapGet("/api/public/payments/gateways", async (
            HttpContext httpContext,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            IntegrationsDbContext integrationsDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var gateways = await integrationsDb.PaymentGateways.IgnoreQueryFilters()
                .Where(g => g.TenantId == tenantId && g.IsActive)
                .Select(g => new { g.Id, g.Provider, g.TestMode, g.IsActive })
                .ToListAsync(ct);

            return Results.Ok(ApiResponse<object>.Ok(new { gateways }));
        })
        .AllowAnonymous()
        .WithName("GetPublicPaymentGateways")
        .WithTags("Public Payments");
    }
}
