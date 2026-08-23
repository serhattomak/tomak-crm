using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using CRM.Modules.Chat.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Features.Tickets;

public record ConvertChatToTicketCommand(
    Guid ChannelId,
    string Subject,
    string Category,
    string Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? LinkedEntityType,
    Guid? LinkedEntityId,
    string? LinkedEntityTitle) : ICommand<CreateTicketResult>;

public record ConvertChatToTicketRequest(
    string Subject,
    string Category,
    string Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? LinkedEntityType,
    Guid? LinkedEntityId,
    string? LinkedEntityTitle);

public class ConvertChatToTicketValidator : AbstractValidator<ConvertChatToTicketCommand>
{
    public ConvertChatToTicketValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Category).NotEmpty();
        RuleFor(x => x.Priority).NotEmpty();
    }
}

public class ConvertChatToTicketHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant,
    ICurrentUser currentUser) : ICommandHandler<ConvertChatToTicketCommand, CreateTicketResult>
{
    public async Task<Result<CreateTicketResult>> Handle(ConvertChatToTicketCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var channel = await dbContext.Channels
            .Include(c => c.SupportSession)
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId && c.TenantId == tenantId, cancellationToken);

        if (channel is null)
        {
            throw new NotFoundException($"Chat channel with ID '{request.ChannelId}' was not found.");
        }

        if (!channel.CustomerId.HasValue)
        {
            throw new BadRequestException("Bu sohbet bir müşteriye bağlı olmadığı için Destek Talebine dönüştürülemez.");
        }

        // Check if ticket already exists for this channel
        var existingTicket = await dbContext.Tickets
            .FirstOrDefaultAsync(t => t.ChannelId == channel.Id && t.TenantId == tenantId, cancellationToken);

        if (existingTicket is not null)
        {
            return Result.Success(new CreateTicketResult(existingTicket.Id, existingTicket.TicketNumber, channel.Id));
        }

        // Generate sequential Ticket Number
        var currentCount = await dbContext.Tickets.CountAsync(t => t.TenantId == tenantId, cancellationToken);
        var ticketNumber = $"TICK-{(1001 + currentCount)}";

        // Calculate SLA
        var (firstResponseHours, resolutionHours) = request.Priority.ToLowerInvariant() switch
        {
            "urgent" => (1, 4),
            "high" => (2, 8),
            "low" => (8, 48),
            _ => (4, 24)
        };

        var slaFirstResponseDueAt = now.AddHours(firstResponseHours);
        var slaResolutionDueAt = now.AddHours(resolutionHours);

        var customerEmail = channel.SupportSession?.CustomerEmail;
        var customerPhone = channel.SupportSession?.CustomerPhone;

        var ticket = new HelpdeskTicket
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TicketNumber = ticketNumber,
            ChannelId = channel.Id,
            CustomerId = channel.CustomerId.Value,
            CustomerName = channel.CustomerName ?? "Müşteri",
            CustomerEmail = customerEmail,
            CustomerPhone = customerPhone,
            Subject = request.Subject,
            Description = channel.Description ?? channel.LastMessagePreview,
            Category = request.Category,
            Source = "LiveChat",
            Status = "InProgress",
            Priority = request.Priority,
            DepartmentId = request.DepartmentId ?? channel.DepartmentId,
            DepartmentName = request.DepartmentName ?? channel.DepartmentName,
            AssignedUserId = request.AssignedUserId,
            AssignedUserName = request.AssignedUserName,
            CreatedByUserId = currentUser.Id,
            SlaFirstResponseDueAt = slaFirstResponseDueAt,
            SlaResolutionDueAt = slaResolutionDueAt,
            FirstResponseAt = now, // Already in active chat
            LinkedEntityType = request.LinkedEntityType,
            LinkedEntityId = request.LinkedEntityId,
            LinkedEntityTitle = request.LinkedEntityTitle,
            CreatedAt = now,
            UpdatedAt = now
        };

        ticket.Activities.Add(new HelpdeskTicketActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TicketId = ticket.Id,
            UserId = currentUser.Id,
            UserName = "Temsilci",
            ActionType = "Created",
            Description = $"Canlı sohbetten resmi Destek Talebine dönüştürüldü ({ticketNumber}).",
            CreatedAt = now
        });

        dbContext.Tickets.Add(ticket);

        // Add a System message in the chat channel
        var systemMsg = new ChatMessage
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ChannelId = channel.Id,
            SenderUserId = null,
            SenderName = "Sistem",
            SenderType = "System",
            MessageType = "SystemEvent",
            Content = $"ℹ️ Bu konuşma resmi Destek Masası talebine ({ticketNumber}) dönüştürüldü.",
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Messages.Add(systemMsg);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new CreateTicketResult(ticket.Id, ticket.TicketNumber, channel.Id));
    }
}

public class ConvertChatToTicketEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/chat/channels/{channelId:guid}/convert-to-ticket", async (
            Guid channelId,
            ConvertChatToTicketRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new ConvertChatToTicketCommand(
                channelId,
                request.Subject,
                request.Category,
                request.Priority,
                request.DepartmentId,
                request.DepartmentName,
                request.AssignedUserId,
                request.AssignedUserName,
                request.LinkedEntityType,
                request.LinkedEntityId,
                request.LinkedEntityTitle);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<CreateTicketResult>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Tickets.Create")
        .WithName("ConvertChatToTicket")
        .WithTags("HelpDesk");
    }
}
