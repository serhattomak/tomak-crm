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

public record CreateTicketCommand(
    Guid CustomerId,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string Subject,
    string? Description,
    string Category,
    string Source,
    string Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? LinkedEntityType,
    Guid? LinkedEntityId,
    string? LinkedEntityTitle,
    List<string>? Tags) : ICommand<CreateTicketResult>;

public record CreateTicketResult(Guid Id, string TicketNumber, Guid? ChannelId);

public class CreateTicketValidator : AbstractValidator<CreateTicketCommand>
{
    public CreateTicketValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.CustomerName).NotEmpty();
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Category).NotEmpty();
        RuleFor(x => x.Priority).NotEmpty();
    }
}

public class CreateTicketHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant,
    ICurrentUser currentUser) : ICommandHandler<CreateTicketCommand, CreateTicketResult>
{
    public async Task<Result<CreateTicketResult>> Handle(CreateTicketCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        // 1. Generate sequential Ticket Number per tenant
        var currentCount = await dbContext.Tickets.CountAsync(t => t.TenantId == tenantId, cancellationToken);
        var ticketNumber = $"TICK-{(1001 + currentCount)}";

        // 2. Calculate SLA target deadlines based on Priority
        var (firstResponseHours, resolutionHours) = request.Priority.ToLowerInvariant() switch
        {
            "urgent" => (1, 4),
            "high" => (2, 8),
            "low" => (8, 48),
            _ => (4, 24) // Medium is default
        };

        var slaFirstResponseDueAt = now.AddHours(firstResponseHours);
        var slaResolutionDueAt = now.AddHours(resolutionHours);

        // 3. Create dedicated Support Channel for conversations
        var channel = new ChatChannel
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Type = "CustomerSupport",
            Title = $"{ticketNumber}: {request.Subject}",
            Description = request.Description,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            DepartmentId = request.DepartmentId,
            DepartmentName = request.DepartmentName,
            CreatedByUserId = currentUser.Id,
            LastMessageAt = now,
            LastMessagePreview = request.Description ?? request.Subject,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Channels.Add(channel);

        // 3.1. Add creator/agent as participant
        if (currentUser.Id.HasValue)
        {
            dbContext.Participants.Add(new ChatParticipant
            {
                TenantId = tenantId,
                ChannelId = channel.Id,
                UserId = currentUser.Id.Value,
                UserName = "Temsilci",
                Role = "Agent",
                JoinedAt = now
            });
        }

        // 3.2. If assigned to a different user, add them as agent
        if (request.AssignedUserId.HasValue && request.AssignedUserId.Value != currentUser.Id)
        {
            dbContext.Participants.Add(new ChatParticipant
            {
                TenantId = tenantId,
                ChannelId = channel.Id,
                UserId = request.AssignedUserId.Value,
                UserName = request.AssignedUserName ?? "Atanan Temsilci",
                Role = "Agent",
                JoinedAt = now
            });
        }

        // 3.3. Initial Message from Customer or Agent
        if (!string.IsNullOrWhiteSpace(request.Description))
        {
            var initialMsg = new ChatMessage
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ChannelId = channel.Id,
                SenderUserId = request.Source == "Internal" ? currentUser.Id : null,
                SenderName = request.Source == "Internal" ? "Müşteri Temsilcisi" : request.CustomerName,
                SenderType = request.Source == "Internal" ? "User" : "Customer",
                Content = request.Description,
                MessageType = "Text",
                CreatedAt = now,
                UpdatedAt = now
            };

            // If linked entity exists, add embed card
            if (request.LinkedEntityId.HasValue && !string.IsNullOrWhiteSpace(request.LinkedEntityType))
            {
                initialMsg.EntityEmbeds.Add(new ChatEntityEmbed
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    MessageId = initialMsg.Id,
                    EntityType = request.LinkedEntityType,
                    EntityId = request.LinkedEntityId.Value,
                    EntityTitle = request.LinkedEntityTitle ?? $"{request.LinkedEntityType} #{request.LinkedEntityId.Value.ToString().Substring(0, 8)}",
                    CreatedAt = now
                });
            }

            dbContext.Messages.Add(initialMsg);
        }

        // 4. Create HelpDesk Ticket
        var ticket = new HelpdeskTicket
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TicketNumber = ticketNumber,
            ChannelId = channel.Id,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            CustomerEmail = request.CustomerEmail,
            CustomerPhone = request.CustomerPhone,
            Subject = request.Subject,
            Description = request.Description,
            Category = request.Category,
            Source = request.Source,
            Status = "New",
            Priority = request.Priority,
            DepartmentId = request.DepartmentId,
            DepartmentName = request.DepartmentName,
            AssignedUserId = request.AssignedUserId,
            AssignedUserName = request.AssignedUserName,
            CreatedByUserId = currentUser.Id,
            SlaFirstResponseDueAt = slaFirstResponseDueAt,
            SlaResolutionDueAt = slaResolutionDueAt,
            LinkedEntityType = request.LinkedEntityType,
            LinkedEntityId = request.LinkedEntityId,
            LinkedEntityTitle = request.LinkedEntityTitle,
            Tags = request.Tags ?? new List<string>(),
            CreatedAt = now,
            UpdatedAt = now
        };

        // 5. Add Initial Activity
        ticket.Activities.Add(new HelpdeskTicketActivity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            TicketId = ticket.Id,
            UserId = currentUser.Id,
            UserName = "Sistem",
            ActionType = "Created",
            Description = $"Destek talebi oluşturuldu ({request.Source}). Öncelik: {request.Priority}, Kategori: {request.Category}",
            CreatedAt = now
        });

        dbContext.Tickets.Add(ticket);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new CreateTicketResult(ticket.Id, ticket.TicketNumber, channel.Id));
    }
}

public class CreateTicketEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tickets", async (CreateTicketCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<CreateTicketResult>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Tickets.Create")
        .WithName("CreateTicket")
        .WithTags("HelpDesk");
    }
}
