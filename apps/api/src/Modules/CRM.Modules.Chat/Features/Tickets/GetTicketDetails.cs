using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using CRM.Modules.Orders.Data;
using CRM.Modules.Shipping.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Features.Tickets;

public record TicketDetailDto(
    Guid Id,
    string TicketNumber,
    Guid? ChannelId,
    Guid CustomerId,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string Subject,
    string? Description,
    string Category,
    string Source,
    string Status,
    string Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    DateTime? SlaFirstResponseDueAt,
    DateTime? SlaResolutionDueAt,
    DateTime? FirstResponseAt,
    DateTime? ResolvedAt,
    DateTime? ClosedAt,
    string? ResolutionNotes,
    string? LinkedEntityType,
    Guid? LinkedEntityId,
    string? LinkedEntityTitle,
    int? SatisfactionRating,
    string? SatisfactionFeedback,
    IReadOnlyList<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<TicketMessageDto> Messages,
    IReadOnlyList<TicketActivityDto> Activities,
    Customer360BriefDto Customer360);

public record TicketMessageDto(
    Guid Id,
    Guid? SenderUserId,
    string SenderName,
    string? SenderAvatarUrl,
    string SenderType, // User, Customer, System
    string Content,
    string MessageType, // Text, InternalNote, SystemEvent, EntityEmbed
    Guid? ReplyToMessageId,
    DateTime CreatedAt,
    IReadOnlyList<TicketAttachmentDto> Attachments,
    IReadOnlyList<TicketEntityEmbedDto> EntityEmbeds);

public record TicketAttachmentDto(
    Guid Id,
    string FileName,
    string FileUrl,
    string FileType,
    long FileSizeBytes);

public record TicketEntityEmbedDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string EntityTitle,
    string? EntitySubtitle,
    string? EntityStatus,
    string? MetadataJson);

public record TicketActivityDto(
    Guid Id,
    Guid? UserId,
    string UserName,
    string ActionType,
    string Description,
    string? OldValue,
    string? NewValue,
    DateTime CreatedAt);

public record PreviousTicketBriefDto(
    Guid Id,
    string TicketNumber,
    string Subject,
    string Status,
    string Priority,
    DateTime CreatedAt);

public record Customer360OrderItemDto(
    Guid Id,
    Guid? ProductId,
    string ProductName,
    string? SKU,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalPrice);

public record Customer360OrderBriefDto(
    Guid Id,
    string OrderNumber,
    DateTime OrderDate,
    decimal TotalAmount,
    string Currency,
    string Status,
    string PaymentStatus,
    IReadOnlyList<Customer360OrderItemDto> Items);

public record Customer360ShipmentBriefDto(
    Guid Id,
    string ShipmentNumber,
    string Status,
    string? CarrierName,
    string? TrackingNumber,
    DateTime CreatedAt);

public record Customer360BriefDto(
    Guid CustomerId,
    string CustomerName,
    string? Email,
    string? Phone,
    int TotalTicketsCount,
    int OpenTicketsCount,
    IReadOnlyList<PreviousTicketBriefDto> RecentTickets,
    IReadOnlyList<Customer360OrderBriefDto> RecentOrders,
    IReadOnlyList<Customer360ShipmentBriefDto> RecentShipments);

public record GetTicketDetailsQuery(Guid TicketId, bool IncludeInternal = false) : IQuery<TicketDetailDto>;

public class GetTicketDetailsHandler(
    ChatDbContext dbContext,
    OrdersDbContext ordersDbContext,
    ShippingDbContext shippingDbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetTicketDetailsQuery, TicketDetailDto>
{
    public async Task<Result<TicketDetailDto>> Handle(GetTicketDetailsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var ticket = await dbContext.Tickets
            .Where(t => t.Id == request.TicketId && t.TenantId == tenantId)
            .Include(t => t.Channel)
                .ThenInclude(c => c!.Messages.OrderBy(m => m.CreatedAt))
                    .ThenInclude(m => m.Attachments)
            .Include(t => t.Channel)
                .ThenInclude(c => c!.Messages.OrderBy(m => m.CreatedAt))
                    .ThenInclude(m => m.EntityEmbeds)
            .Include(t => t.Activities.OrderByDescending(a => a.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        if (ticket is null)
        {
            throw new NotFoundException($"Ticket with ID '{request.TicketId}' was not found.");
        }

        // Fetch Customer 360 Recent Tickets
        var customerTickets = await dbContext.Tickets
            .Where(t => t.CustomerId == ticket.CustomerId && t.TenantId == tenantId && t.Id != ticket.Id)
            .OrderByDescending(t => t.CreatedAt)
            .Take(5)
            .Select(t => new PreviousTicketBriefDto(t.Id, t.TicketNumber, t.Subject, t.Status, t.Priority, t.CreatedAt))
            .ToListAsync(cancellationToken);

        var totalCustomerTickets = await dbContext.Tickets
            .CountAsync(t => t.CustomerId == ticket.CustomerId && t.TenantId == tenantId, cancellationToken);

        var openCustomerTickets = await dbContext.Tickets
            .CountAsync(t => t.CustomerId == ticket.CustomerId && t.TenantId == tenantId && t.Status != "Resolved" && t.Status != "Closed", cancellationToken);

        // Fetch Recent Orders (real join) - last 5 orders with items
        IReadOnlyList<Customer360OrderBriefDto> recentOrders = Array.Empty<Customer360OrderBriefDto>();
        IReadOnlyList<Customer360ShipmentBriefDto> recentShipments = Array.Empty<Customer360ShipmentBriefDto>();

        if (ticket.CustomerId != Guid.Empty)
        {
            try
            {
                var orders = await ordersDbContext.Orders
                    .AsNoTracking()
                    .Include(o => o.Items)
                    .Where(o => o.CustomerId == ticket.CustomerId && o.TenantId == tenantId)
                    .OrderByDescending(o => o.OrderDate)
                    .Take(5)
                    .ToListAsync(cancellationToken);

                recentOrders = orders.Select(o => new Customer360OrderBriefDto(
                    o.Id,
                    o.OrderNumber,
                    o.OrderDate,
                    o.TotalAmount,
                    o.Currency,
                    o.Status,
                    o.PaymentStatus,
                    o.Items.Select(i => new Customer360OrderItemDto(
                        i.Id,
                        i.ProductId,
                        i.ProductName,
                        i.SKU,
                        i.Quantity,
                        i.UnitPrice,
                        i.TotalPrice)).ToList()
                )).ToList();
            }
            catch
            {
                recentOrders = Array.Empty<Customer360OrderBriefDto>();
            }

            try
            {
                var shipments = await shippingDbContext.Shipments
                    .AsNoTracking()
                    .Where(s => s.CustomerId == ticket.CustomerId && s.TenantId == tenantId)
                    .OrderByDescending(s => s.CreatedAt)
                    .Take(5)
                    .ToListAsync(cancellationToken);

                recentShipments = shipments.Select(s => new Customer360ShipmentBriefDto(
                    s.Id,
                    s.ShipmentNumber,
                    s.Status,
                    s.CarrierName,
                    s.TrackingNumber,
                    s.CreatedAt)).ToList();
            }
            catch
            {
                recentShipments = Array.Empty<Customer360ShipmentBriefDto>();
            }
        }

        var customer360 = new Customer360BriefDto(
            CustomerId: ticket.CustomerId,
            CustomerName: ticket.CustomerName,
            Email: ticket.CustomerEmail,
            Phone: ticket.CustomerPhone,
            TotalTicketsCount: totalCustomerTickets,
            OpenTicketsCount: openCustomerTickets,
            RecentTickets: customerTickets,
            RecentOrders: recentOrders,
            RecentShipments: recentShipments);

        // Map Messages with includeInternal filtering
        var messages = new List<TicketMessageDto>();
        if (ticket.Channel != null && ticket.Channel.Messages != null)
        {
            var allMessages = ticket.Channel.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new TicketMessageDto(
                    m.Id,
                    m.SenderUserId,
                    m.SenderName,
                    m.SenderAvatarUrl,
                    m.SenderType,
                    m.Content,
                    m.MessageType,
                    m.ReplyToMessageId,
                    m.CreatedAt,
                    m.Attachments.Select(a => new TicketAttachmentDto(a.Id, a.FileName, a.FileUrl, a.FileType, a.FileSizeBytes)).ToList(),
                    m.EntityEmbeds.Select(e => new TicketEntityEmbedDto(e.Id, e.EntityType, e.EntityId, e.EntityTitle, e.EntitySubtitle, e.EntityStatus, e.MetadataJson)).ToList()))
                .ToList();

            messages = request.IncludeInternal
                ? allMessages
                : allMessages.Where(m => m.MessageType != "InternalNote").ToList();
        }

        // Map Activities
        var activities = ticket.Activities
            .Select(a => new TicketActivityDto(
                a.Id,
                a.UserId,
                a.UserName,
                a.ActionType,
                a.Description,
                a.OldValue,
                a.NewValue,
                a.CreatedAt))
            .ToList();

        var detail = new TicketDetailDto(
            ticket.Id,
            ticket.TicketNumber,
            ticket.ChannelId,
            ticket.CustomerId,
            ticket.CustomerName,
            ticket.CustomerEmail,
            ticket.CustomerPhone,
            ticket.Subject,
            ticket.Description,
            ticket.Category,
            ticket.Source,
            ticket.Status,
            ticket.Priority,
            ticket.DepartmentId,
            ticket.DepartmentName,
            ticket.AssignedUserId,
            ticket.AssignedUserName,
            ticket.SlaFirstResponseDueAt,
            ticket.SlaResolutionDueAt,
            ticket.FirstResponseAt,
            ticket.ResolvedAt,
            ticket.ClosedAt,
            ticket.ResolutionNotes,
            ticket.LinkedEntityType,
            ticket.LinkedEntityId,
            ticket.LinkedEntityTitle,
            ticket.SatisfactionRating,
            ticket.SatisfactionFeedback,
            ticket.Tags,
            ticket.CreatedAt,
            ticket.UpdatedAt,
            messages,
            activities,
            customer360);

        return Result.Success(detail);
    }
}

public class GetTicketDetailsEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tickets/{id:guid}", async (Guid id, bool? includeInternal, MediatR.ISender sender, CancellationToken ct) =>
        {
            var query = new GetTicketDetailsQuery(id, includeInternal ?? false);
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<TicketDetailDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Tickets.View")
        .WithName("GetTicketDetails")
        .WithTags("HelpDesk");
    }
}
