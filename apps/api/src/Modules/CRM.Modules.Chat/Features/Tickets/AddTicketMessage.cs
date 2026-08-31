using System.Security.Claims;
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

public record AddTicketMessageCommand(
    Guid TicketId,
    string Content,
    bool IsInternalNote = false,
    Guid? ReplyToMessageId = null,
    List<AddTicketAttachmentInput>? Attachments = null,
    List<AddTicketEntityEmbedInput>? EntityEmbeds = null) : ICommand<TicketMessageDto>;

public record AddTicketMessageRequest(
    string Content,
    bool IsInternalNote = false,
    Guid? ReplyToMessageId = null,
    List<AddTicketAttachmentInput>? Attachments = null,
    List<AddTicketEntityEmbedInput>? EntityEmbeds = null);

public record AddTicketAttachmentInput(
    string FileName,
    string FileUrl,
    string FileType,
    long FileSizeBytes);

public record AddTicketEntityEmbedInput(
    string EntityType,
    Guid EntityId,
    string EntityTitle,
    string? EntitySubtitle,
    string? EntityStatus,
    string? MetadataJson);

public class AddTicketMessageValidator : AbstractValidator<AddTicketMessageCommand>
{
    public AddTicketMessageValidator()
    {
        RuleFor(x => x.TicketId).NotEmpty();
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Content is required.")
            .MaximumLength(4000).WithMessage("Content must not exceed 4000 characters.");
    }
}

public class AddTicketMessageHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant,
    ICurrentUser currentUser) : ICommandHandler<AddTicketMessageCommand, TicketMessageDto>
{
    public async Task<Result<TicketMessageDto>> Handle(AddTicketMessageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var senderName = ResolveSenderName();

        // Transaction ensures channel creation + message insert are atomic (fixes race)
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var ticket = await dbContext.Tickets
                .Include(t => t.Channel)
                .Include(t => t.Activities)
                .FirstOrDefaultAsync(t => t.Id == request.TicketId && t.TenantId == tenantId, cancellationToken);

            if (ticket is null)
            {
                throw new NotFoundException($"Ticket with ID '{request.TicketId}' was not found.");
            }

            // Ensure Channel exists for the ticket (transactional GetOrCreate)
            if (!ticket.ChannelId.HasValue || ticket.Channel == null)
            {
                var newChannel = new ChatChannel
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Type = "CustomerSupport",
                    Title = $"{ticket.TicketNumber}: {ticket.Subject}",
                    CustomerId = ticket.CustomerId,
                    CustomerName = ticket.CustomerName,
                    CreatedByUserId = currentUser.Id,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                dbContext.Channels.Add(newChannel);
                ticket.ChannelId = newChannel.Id;
                ticket.Channel = newChannel;
            }

            var channel = ticket.Channel;

            var messageType = request.IsInternalNote ? "InternalNote" : "Text";

            var message = new ChatMessage
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ChannelId = channel.Id,
                SenderUserId = currentUser.Id,
                SenderName = senderName,
                SenderType = "User",
                Content = request.Content.Trim(),
                MessageType = messageType,
                ReplyToMessageId = request.ReplyToMessageId,
                CreatedAt = now,
                UpdatedAt = now
            };

            // Attachments
            if (request.Attachments != null && request.Attachments.Count > 0)
            {
                foreach (var a in request.Attachments)
                {
                    message.Attachments.Add(new ChatAttachment
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        MessageId = message.Id,
                        FileName = a.FileName,
                        FileUrl = a.FileUrl,
                        FileType = a.FileType,
                        FileSizeBytes = a.FileSizeBytes,
                        CreatedAt = now
                    });
                }
            }

            // Entity Embeds
            if (request.EntityEmbeds != null && request.EntityEmbeds.Count > 0)
            {
                foreach (var e in request.EntityEmbeds)
                {
                    message.EntityEmbeds.Add(new ChatEntityEmbed
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenantId,
                        MessageId = message.Id,
                        EntityType = e.EntityType,
                        EntityId = e.EntityId,
                        EntityTitle = e.EntityTitle,
                        EntitySubtitle = e.EntitySubtitle,
                        EntityStatus = e.EntityStatus,
                        MetadataJson = e.MetadataJson,
                        CreatedAt = now
                    });
                }
            }

            dbContext.Messages.Add(message);

            // Update channel last message info
            channel.LastMessageAt = now;
            channel.LastMessagePreview = request.IsInternalNote
                ? $"[Dahili Not] {request.Content.Trim()}"
                : request.Content.Trim();
            channel.UpdatedAt = now;

            // SLA First Response tracking (only for public replies by agent)
            if (!request.IsInternalNote && !ticket.FirstResponseAt.HasValue)
            {
                ticket.FirstResponseAt = now;
                if (ticket.Status == "New")
                {
                    ticket.Status = "InProgress";
                }
            }

            // Add Activity Log Entry (explicit Add to avoid EF Modified vs Added confusion)
            var activity = new HelpdeskTicketActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketId = ticket.Id,
                UserId = currentUser.Id,
                UserName = senderName,
                ActionType = request.IsInternalNote ? "InternalNoteAdded" : "PublicReplyAdded",
                Description = request.IsInternalNote
                    ? "Dahili ekip notu eklendi."
                    : "Müşteriye yanıt gönderildi.",
                CreatedAt = now
            };
            dbContext.TicketActivities.Add(activity);

            ticket.UpdatedAt = now;
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var dto = new TicketMessageDto(
                message.Id,
                message.SenderUserId,
                message.SenderName,
                message.SenderAvatarUrl,
                message.SenderType,
                message.Content,
                message.MessageType,
                message.ReplyToMessageId,
                message.CreatedAt,
                message.Attachments.Select(a => new TicketAttachmentDto(a.Id, a.FileName, a.FileUrl, a.FileType, a.FileSizeBytes)).ToList(),
                message.EntityEmbeds.Select(e => new TicketEntityEmbedDto(e.Id, e.EntityType, e.EntityId, e.EntityTitle, e.EntitySubtitle, e.EntityStatus, e.MetadataJson)).ToList());

            return Result.Success(dto);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private string ResolveSenderName()
    {
        var principal = currentUser.Principal;
        if (principal != null)
        {
            var name = principal.FindFirstValue(ClaimTypes.Name)
                ?? principal.FindFirstValue("name")
                ?? principal.FindFirstValue("preferred_username")
                ?? principal.FindFirstValue(ClaimTypes.GivenName)
                ?? principal.FindFirstValue("full_name");
            if (!string.IsNullOrWhiteSpace(name))
            {
                return name.Trim();
            }
        }

        if (!string.IsNullOrWhiteSpace(currentUser.Email))
        {
            return currentUser.Email!;
        }

        return "Temsilci";
    }
}

public class AddTicketMessageEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tickets/{id:guid}/messages", async (
            Guid id,
            AddTicketMessageRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new AddTicketMessageCommand(
                id,
                request.Content,
                request.IsInternalNote,
                request.ReplyToMessageId,
                request.Attachments,
                request.EntityEmbeds);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<TicketMessageDto>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Tickets.Reply")
        .WithName("AddTicketMessage")
        .WithTags("HelpDesk");
    }
}
