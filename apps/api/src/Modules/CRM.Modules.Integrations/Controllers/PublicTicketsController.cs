using System.IdentityModel.Tokens.Jwt;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using CRM.Modules.Chat.Entities;
using CRM.Modules.Customers.Data;
using CRM.Modules.Integrations.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using FluentValidation;

namespace CRM.Modules.Integrations.Controllers;

public record CreatePublicTicketRequest(
    string Subject,
    string? Description,
    string? Category,
    string? Priority,
    string? CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string? GuestToken,
    Guid? LinkedOrderId,
    string? LinkedEntityType);

public record PublicTicketDto(
    Guid Id,
    string TicketNumber,
    Guid? ChannelId,
    Guid CustomerId,
    string CustomerName,
    string? CustomerEmail,
    string Subject,
    string? Description,
    string Category,
    string Source,
    string Status,
    string Priority,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int MessageCount,
    List<PublicTicketActivityDto> Activities,
    List<PublicTicketMessageDto> Messages);

public record PublicTicketActivityDto(
    Guid Id,
    string ActionType,
    string Description,
    string UserName,
    DateTime CreatedAt);

public record PublicTicketMessageDto(
    Guid Id,
    string SenderName,
    string SenderType,
    string Content,
    string MessageType,
    DateTime CreatedAt);

public class CreatePublicTicketValidator : AbstractValidator<CreatePublicTicketRequest>
{
    public CreatePublicTicketValidator()
    {
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Description).MaximumLength(4000).When(x => x.Description != null);
        RuleFor(x => x.Category).MaximumLength(100).When(x => x.Category != null);
        RuleFor(x => x.Priority)
            .Must(p => p == null || new[] { "Low", "Medium", "High", "Urgent" }.Contains(p))
            .WithMessage("Priority must be Low, Medium, High or Urgent.");
    }
}

public class PublicTicketsController : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // POST /api/public/tickets — anon with guest_token or auth, creates helpdesk_tickets SenderType=Customer
        app.MapPost("/api/public/tickets", async (
            HttpContext httpContext,
            CreatePublicTicketRequest request,
            CreatePublicTicketValidator validator,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            ChatDbContext chatDb,
            CustomersDbContext customersDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(
                httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                var errors = string.Join("; ", validation.Errors.Select(e => e.ErrorMessage));
                return Results.Json(new { error = errors }, statusCode: 400);
            }

            var authUserId = TryResolveAuthUserId(httpContext);
            var guestToken = request.GuestToken
                ?? httpContext.Request.Headers["X-Guest-Token"].FirstOrDefault()
                ?? httpContext.Request.Query["guest_token"].FirstOrDefault();

            Guid customerId;
            string customerName;
            string? customerEmail;
            string? customerPhone;

            // Resolve customer from auth_user_id if present
            if (authUserId.HasValue)
            {
                var cust = await customersDb.Customers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.AuthUserId == authUserId.Value, ct);

                if (cust == null)
                {
                    // Fallback: try by email if provided
                    if (!string.IsNullOrWhiteSpace(request.CustomerEmail))
                    {
                        var normalized = request.CustomerEmail.Trim().ToLowerInvariant();
                        cust = await customersDb.Customers.IgnoreQueryFilters()
                            .FirstOrDefaultAsync(
                                c => c.TenantId == tenantId
                                     && c.Email != null
                                     && c.Email.ToLower() == normalized,
                                ct);
                        if (cust != null)
                        {
                            cust.AuthUserId = authUserId.Value;
                            cust.UpdatedAt = DateTime.UtcNow;
                            await customersDb.SaveChangesAsync(ct);
                        }
                    }

                    // Still null — create stub for authenticated user
                    if (cust == null)
                    {
                        var nameFromReq = !string.IsNullOrWhiteSpace(request.CustomerName)
                            ? request.CustomerName.Trim()
                            : TryGetClaim(httpContext, "full_name") ?? TryGetClaim(httpContext, "name") ?? "E-Ticaret Müşterisi";
                        var emailFromReq = !string.IsNullOrWhiteSpace(request.CustomerEmail)
                            ? request.CustomerEmail.Trim()
                            : TryGetClaim(httpContext, "email");

                        cust = new Customers.Entities.Customer
                        {
                            Id = Guid.NewGuid(),
                            TenantId = tenantId,
                            AuthUserId = authUserId.Value,
                            Type = "Individual",
                            Name = nameFromReq,
                            Email = emailFromReq,
                            Phone = request.CustomerPhone?.Trim(),
                            Status = "Active",
                            Tier = "Standard",
                            Country = "Türkiye",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        customersDb.Customers.Add(cust);
                        await customersDb.SaveChangesAsync(ct);
                    }
                }

                customerId = cust.Id;
                customerName = cust.Name;
                customerEmail = cust.Email;
                customerPhone = cust.Phone;
            }
            else
            {
                // Anon / guest_token branch — requires at least name/email or guestToken
                var name = request.CustomerName?.Trim();
                var email = request.CustomerEmail?.Trim();

                if (string.IsNullOrWhiteSpace(name) && string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(guestToken))
                {
                    return Results.Json(
                        new { error = "Authentication required or provide CustomerName/CustomerEmail or guest_token." },
                        statusCode: 401);
                }

                // Try to find existing guest customer by email (guest merge by email on signup will reconcile)
                Customers.Entities.Customer? guestCustomer = null;

                if (!string.IsNullOrWhiteSpace(email))
                {
                    guestCustomer = await customersDb.Customers.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(
                            c => c.TenantId == tenantId
                                 && c.Email != null
                                 && c.Email.ToLower() == email.ToLowerInvariant(),
                            ct);
                }

                if (guestCustomer != null)
                {
                    customerId = guestCustomer.Id;
                    customerName = guestCustomer.Name;
                    customerEmail = guestCustomer.Email;
                    customerPhone = guestCustomer.Phone;
                }
                else
                {
                    // Create transient guest customer for ticket ownership (IsActive? Keep as Lead)
                    var guestName = !string.IsNullOrWhiteSpace(name)
                        ? name
                        : !string.IsNullOrWhiteSpace(guestToken) ? $"Misafir {guestToken[..Math.Min(8, guestToken.Length)]}" : "Misafir";
                    var guestEmail = !string.IsNullOrWhiteSpace(email)
                        ? email
                        : !string.IsNullOrWhiteSpace(guestToken) ? $"guest-{guestToken!.Trim()}[..8]@guest.local" : null;

                    // Generate synthetic guest email if none provided to avoid null unique issues
                    if (string.IsNullOrWhiteSpace(guestEmail) && !string.IsNullOrWhiteSpace(guestToken))
                    {
                        guestEmail = $"guest-{Guid.NewGuid().ToString("N")[..8]}@guest.local";
                    }

                    guestCustomer = new Customers.Entities.Customer
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        Type = "Individual",
                        Name = guestName,
                        Email = guestEmail,
                        Phone = request.CustomerPhone?.Trim(),
                        Status = "Lead",
                        Tier = "Standard",
                        Country = "Türkiye",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    customersDb.Customers.Add(guestCustomer);
                    await customersDb.SaveChangesAsync(ct);

                    customerId = guestCustomer.Id;
                    customerName = guestCustomer.Name;
                    customerEmail = guestCustomer.Email;
                    customerPhone = guestCustomer.Phone;
                }
            }

            // Generate ticket number sequential per tenant (TICK-1001+)
            var count = await chatDb.Tickets.IgnoreQueryFilters()
                .Where(t => t.TenantId == tenantId)
                .CountAsync(ct);
            var ticketNumber = $"TICK-{(1001 + count)}";

            var priority = !string.IsNullOrWhiteSpace(request.Priority) ? request.Priority!.Trim() : "Medium";
            var category = !string.IsNullOrWhiteSpace(request.Category) ? request.Category!.Trim() : "Genel";
            var now = DateTime.UtcNow;

            var (firstResponseHours, resolutionHours) = priority.ToLowerInvariant() switch
            {
                "urgent" => (1, 4),
                "high" => (2, 8),
                "low" => (8, 48),
                _ => (4, 24)
            };

            // Create support channel with SenderType Customer semantics
            var channel = new ChatChannel
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Type = "CustomerSupport",
                Title = $"{ticketNumber}: {request.Subject.Trim()}",
                Description = request.Description?.Trim(),
                CustomerId = customerId,
                CustomerName = customerName,
                CreatedByUserId = null,
                LastMessageAt = now,
                LastMessagePreview = request.Description?.Trim() ?? request.Subject.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };
            chatDb.Channels.Add(channel);

            // Initial message SenderType=Customer (public ticket branch)
            var initialMessage = new ChatMessage
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ChannelId = channel.Id,
                SenderUserId = null,
                SenderName = customerName,
                SenderType = "Customer",
                Content = request.Description?.Trim() ?? request.Subject.Trim(),
                MessageType = "Text",
                CreatedAt = now,
                UpdatedAt = now
            };

            if (request.LinkedOrderId.HasValue && request.LinkedOrderId.Value != Guid.Empty)
            {
                initialMessage.EntityEmbeds.Add(new ChatEntityEmbed
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    MessageId = initialMessage.Id,
                    EntityType = request.LinkedEntityType ?? "Order",
                    EntityId = request.LinkedOrderId.Value,
                    EntityTitle = $"{request.LinkedEntityType ?? "Order"} #{request.LinkedOrderId.Value.ToString()[..8]}",
                    CreatedAt = now
                });
            }

            chatDb.Messages.Add(initialMessage);

            var ticket = new HelpdeskTicket
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketNumber = ticketNumber,
                ChannelId = channel.Id,
                CustomerId = customerId,
                CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? customerName : request.CustomerName!.Trim(),
                CustomerEmail = request.CustomerEmail?.Trim() ?? customerEmail,
                CustomerPhone = request.CustomerPhone?.Trim() ?? customerPhone,
                Subject = request.Subject.Trim(),
                Description = request.Description?.Trim(),
                Category = category,
                Source = "Web",
                Status = "New",
                Priority = priority,
                LinkedEntityType = request.LinkedOrderId.HasValue ? (request.LinkedEntityType ?? "Order") : null,
                LinkedEntityId = request.LinkedOrderId,
                LinkedEntityTitle = request.LinkedOrderId.HasValue ? $"Order {request.LinkedOrderId.Value.ToString()[..8]}" : null,
                SlaFirstResponseDueAt = now.AddHours(firstResponseHours),
                SlaResolutionDueAt = now.AddHours(resolutionHours),
                Tags = new List<string>(),
                CreatedAt = now,
                UpdatedAt = now
            };

            ticket.Activities.Add(new HelpdeskTicketActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketId = ticket.Id,
                UserId = null,
                UserName = customerName,
                ActionType = "Created",
                Description = $"E-Ticaret destek talebi oluşturuldu. Kaynak: Web, Öncelik: {priority}, Kategori: {category}, SenderType: Customer, guest_token: {(string.IsNullOrWhiteSpace(guestToken) ? "-" : guestToken[..Math.Min(8, guestToken.Length)])}",
                CreatedAt = now
            });

            chatDb.Tickets.Add(ticket);
            await chatDb.SaveChangesAsync(ct);

            var dto = new PublicTicketDto(
                ticket.Id,
                ticket.TicketNumber,
                ticket.ChannelId,
                ticket.CustomerId,
                ticket.CustomerName,
                ticket.CustomerEmail,
                ticket.Subject,
                ticket.Description,
                ticket.Category,
                ticket.Source,
                ticket.Status,
                ticket.Priority,
                ticket.CreatedAt,
                ticket.UpdatedAt,
                1,
                ticket.Activities.Select(a => new PublicTicketActivityDto(a.Id, a.ActionType, a.Description, a.UserName, a.CreatedAt)).ToList(),
                new List<PublicTicketMessageDto>
                {
                    new(initialMessage.Id, initialMessage.SenderName, initialMessage.SenderType, initialMessage.Content, initialMessage.MessageType, initialMessage.CreatedAt)
                });

            return Results.Ok(ApiResponse<PublicTicketDto>.Ok(dto));
        })
        .AllowAnonymous()
        .WithName("CreatePublicTicket")
        .WithTags("Public Tickets");

        // GET /api/public/tickets/mine — auth required, returns only caller tickets including CRM agent replies
        app.MapGet("/api/public/tickets/mine", async (
            HttpContext httpContext,
            int? page,
            int? pageSize,
            IPublicApiTenantResolver tenantResolver,
            PublicApiHmacValidator hmacValidator,
            PublicApiRateLimiter rateLimiter,
            ChatDbContext chatDb,
            CustomersDbContext customersDb,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var guard = await PublicApiGuardHelper.ValidateAsync(
                httpContext, tenantResolver, hmacValidator, rateLimiter, ct);
            if (guard != null) return guard;

            var tenantId = PublicApiGuardHelper.GetTenantId(httpContext);
            currentTenant.SetTenant(tenantId, PublicApiGuardHelper.GetTenantSlug(httpContext));

            var authUserId = TryResolveAuthUserId(httpContext);
            if (authUserId == null)
            {
                return Results.Json(
                    new { error = "Authentication required: provide Authorization Bearer." },
                    statusCode: 401);
            }

            var customer = await customersDb.Customers.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.AuthUserId == authUserId.Value, ct);

            if (customer == null)
            {
                return Results.Ok(ApiResponse<object>.Ok(new { items = Array.Empty<object>(), totalCount = 0, page = 1, pageSize = 20 }));
            }

            var pg = page is > 0 ? page.Value : 1;
            var ps = pageSize is > 0 and <= 50 ? pageSize.Value : 20;

            var query = chatDb.Tickets.IgnoreQueryFilters()
                .Where(t => t.TenantId == tenantId && t.CustomerId == customer.Id);

            var total = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((pg - 1) * ps)
                .Take(ps)
                .Include(t => t.Channel).ThenInclude(c => c!.Messages)
                .Include(t => t.Activities)
                .ToListAsync(ct);

            var dtos = items.Select(t =>
            {
                // CRM agent replies are chat_messages where SenderType=User and channel is ticket's channel
                var messages = t.Channel?.Messages
                    .OrderBy(m => m.CreatedAt)
                    .Select(m => new PublicTicketMessageDto(
                        m.Id, m.SenderName, m.SenderType, m.Content, m.MessageType, m.CreatedAt))
                    .ToList() ?? new List<PublicTicketMessageDto>();

                var activities = t.Activities
                    .OrderBy(a => a.CreatedAt)
                    .Select(a => new PublicTicketActivityDto(a.Id, a.ActionType, a.Description, a.UserName, a.CreatedAt))
                    .ToList();

                return new PublicTicketDto(
                    t.Id,
                    t.TicketNumber,
                    t.ChannelId,
                    t.CustomerId,
                    t.CustomerName,
                    t.CustomerEmail,
                    t.Subject,
                    t.Description,
                    t.Category,
                    t.Source,
                    t.Status,
                    t.Priority,
                    t.CreatedAt,
                    t.UpdatedAt,
                    messages.Count,
                    activities,
                    messages);
            }).ToList();

            return Results.Ok(ApiResponse<object>.Ok(new { items = dtos, totalCount = total, page = pg, pageSize = ps }));
        })
        .AllowAnonymous()
        .WithName("GetPublicTicketsMine")
        .WithTags("Public Tickets");
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
            }
            catch { }
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
        var auth = ctx.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
        var token = auth["Bearer ".Length..].Trim();
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            return jwt.Claims.FirstOrDefault(c =>
                string.Equals(c.Type, claimType, StringComparison.OrdinalIgnoreCase))?.Value;
        }
        catch { return null; }
    }
}
