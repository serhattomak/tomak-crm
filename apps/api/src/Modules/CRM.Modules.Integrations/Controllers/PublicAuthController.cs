using System.IdentityModel.Tokens.Jwt;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Integrations.Data;
using CRM.Modules.Integrations.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Integrations.Controllers;

public record AuthSyncRequest(
    string? Email,
    string? FullName,
    string? Phone,
    string? GuestToken);

public record AuthSyncResponse(
    Guid CustomerId,
    Guid TenantId,
    string? Email,
    string Status,
    GuestMergeResult? GuestMerge);

public class PublicAuthController : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // POST /api/public/auth/sync — idempotent fallback for Supabase Auth SignUp trigger
        app.MapPost("/api/public/auth/sync", async (
            HttpContext httpContext,
            AuthSyncRequest request,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            CustomersDbContext customersDb,
            IntegrationsDbContext integrationsDb,
            IGuestMergeService guestMergeService,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(
                httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var authUserId = TryResolveAuthUserId(httpContext);
            if (authUserId == null || authUserId == Guid.Empty)
            {
                return Results.Json(
                    new { error = "Authentication required: provide Authorization Bearer <supabase_jwt> with sub claim or X-Auth-User-Id." },
                    statusCode: 401);
            }

            // Resolve email/name from request or JWT claims
            var emailFromJwt = TryGetClaim(httpContext, "email");
            var nameFromJwt = TryGetClaim(httpContext, "full_name")
                ?? TryGetClaim(httpContext, "name")
                ?? TryGetClaim(httpContext, "user_metadata.name");

            var email = !string.IsNullOrWhiteSpace(request.Email)
                ? request.Email.Trim()
                : emailFromJwt?.Trim();

            var fullName = !string.IsNullOrWhiteSpace(request.FullName)
                ? request.FullName.Trim()
                : nameFromJwt?.Trim()
                  ?? (!string.IsNullOrWhiteSpace(email) ? email.Split('@')[0] : "E-Ticaret Müşterisi");

            var phone = request.Phone?.Trim();

            // 1. Idempotent check: existing customer with same auth_user_id
            var existingByAuth = await customersDb.Customers.IgnoreQueryFilters()
                .FirstOrDefaultAsync(
                    c => c.TenantId == tenantId && c.AuthUserId == authUserId.Value,
                    ct);

            if (existingByAuth != null)
            {
                // Opportunistic guest merge if GuestToken provided and cart exists
                GuestMergeResult? mergeResult = null;
                var guestToken = request.GuestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(guestToken))
                {
                    try
                    {
                        mergeResult = await guestMergeService.MergeAsync(
                            tenantId, existingByAuth.Id, guestToken!, ct);
                    }
                    catch
                    {
                        // Don't fail sync on merge error — return customer anyway
                    }
                }

                return Results.Ok(ApiResponse<AuthSyncResponse>.Ok(new AuthSyncResponse(
                    existingByAuth.Id,
                    tenantId,
                    existingByAuth.Email,
                    "existing",
                    mergeResult)));
            }

            // 2. Email-based merge: find customer with same tenant+email and no auth_user_id
            Customer? customer = null;
            if (!string.IsNullOrWhiteSpace(email))
            {
                var normalizedEmail = email.ToLowerInvariant();
                customer = await customersDb.Customers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(
                        c => c.TenantId == tenantId
                             && c.Email != null
                             && c.Email.ToLower() == normalizedEmail
                             && c.AuthUserId == null,
                        ct);

                if (customer != null)
                {
                    customer.AuthUserId = authUserId.Value;
                    customer.UpdatedAt = DateTime.UtcNow;
                    // Ensure name is not empty; keep existing if present
                    if (string.IsNullOrWhiteSpace(customer.Name) && !string.IsNullOrWhiteSpace(fullName))
                    {
                        customer.Name = fullName;
                    }

                    if (!string.IsNullOrWhiteSpace(phone) && string.IsNullOrWhiteSpace(customer.Phone))
                    {
                        customer.Phone = phone;
                    }

                    // Ensure Individual for ecommerce
                    if (customer.Type != "Individual" && customer.Type != "Company")
                    {
                        customer.Type = "Individual";
                    }

                    await customersDb.SaveChangesAsync(ct);

                    GuestMergeResult? mergeResult = null;
                    var guestToken = request.GuestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(guestToken))
                    {
                        try
                        {
                            mergeResult = await guestMergeService.MergeAsync(
                                tenantId, customer.Id, guestToken!, ct);
                        }
                        catch { }
                    }

                    return Results.Ok(ApiResponse<AuthSyncResponse>.Ok(new AuthSyncResponse(
                        customer.Id,
                        tenantId,
                        customer.Email,
                        "merged_by_email",
                        mergeResult)));
                }
            }

            // 3. Create new customer row (fallback when trigger didn't run)
            var newCustomer = new Customer
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                AuthUserId = authUserId.Value,
                Type = "Individual",
                Name = string.IsNullOrWhiteSpace(fullName) ? (email ?? "E-Ticaret Müşterisi") : fullName,
                Email = email,
                Phone = phone,
                Status = "Active",
                Tier = "Standard",
                Country = "Türkiye",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            customersDb.Customers.Add(newCustomer);
            await customersDb.SaveChangesAsync(ct);

            GuestMergeResult? guestMerge = null;
            var tokenForMerge = request.GuestToken ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(tokenForMerge))
            {
                try
                {
                    guestMerge = await guestMergeService.MergeAsync(
                        tenantId, newCustomer.Id, tokenForMerge!, ct);
                }
                catch { }
            }

            return Results.Ok(ApiResponse<AuthSyncResponse>.Ok(new AuthSyncResponse(
                newCustomer.Id,
                tenantId,
                newCustomer.Email,
                "created",
                guestMerge)));
        })
        .AllowAnonymous()
        .WithName("PublicAuthSync")
        .WithTags("Public Auth");
    }

    private static Guid? TryResolveAuthUserId(HttpContext ctx)
    {
        if (ctx.Items.TryGetValue("auth_user_id", out var v) && v is Guid g) return g;

        var auth = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth["Bearer ".Length..].Trim();
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(token);
                var sub = jwt.Claims.FirstOrDefault(c =>
                    c.Type == "sub" || c.Type == "user_id" || c.Type == "id")?.Value;
                if (Guid.TryParse(sub, out var userId))
                {
                    ctx.Items["auth_user_id"] = userId;
                    return userId;
                }

                // Also try email claim for fallback creation
                var email = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
                if (!string.IsNullOrWhiteSpace(email)) ctx.Items["auth_email"] = email;
            }
            catch
            {
                // ignore invalid token — caller will get 401
            }
        }

        if (ctx.Request.Headers.TryGetValue("X-Auth-User-Id", out var au) && Guid.TryParse(au.ToString(), out var auId))
        {
            ctx.Items["auth_user_id"] = auId;
            return auId;
        }

        return null;
    }

    private static string? TryGetClaim(HttpContext ctx, string claimType)
    {
        if (ctx.Items.TryGetValue($"claim_{claimType}", out var cached) && cached is string cs) return cs;

        var auth = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        var token = auth["Bearer ".Length..].Trim();
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            var val = jwt.Claims.FirstOrDefault(c =>
                string.Equals(c.Type, claimType, StringComparison.OrdinalIgnoreCase))?.Value;

            // For nested user_metadata, Supabase stores as JSON string in claim
            if (val == null && claimType.Contains('.'))
            {
                var parts = claimType.Split('.', 2);
                var parent = jwt.Claims.FirstOrDefault(c => c.Type == parts[0])?.Value;
                if (!string.IsNullOrWhiteSpace(parent))
                {
                    // parent is JSON like {"name":"..."}
                    var needle = $"\"{parts[1]}\"";
                    var idx = parent.IndexOf(needle, StringComparison.OrdinalIgnoreCase);
                    if (idx >= 0)
                    {
                        var substr = parent.Substring(idx + needle.Length);
                        var colon = substr.IndexOf(':');
                        if (colon >= 0)
                        {
                            var after = substr.Substring(colon + 1).Trim().TrimStart('"');
                            var end = after.IndexOf('"');
                            if (end > 0) val = after.Substring(0, end);
                        }
                    }
                }
            }

            if (val != null) ctx.Items[$"claim_{claimType}"] = val;
            return val;
        }
        catch
        {
            return null;
        }
    }
}


