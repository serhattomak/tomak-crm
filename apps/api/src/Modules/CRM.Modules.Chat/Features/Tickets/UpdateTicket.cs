using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using CRM.Modules.Chat.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Features.Tickets;

public record UpdateTicketCommand(
    Guid TicketId,
    string? Status,
    string? Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? ResolutionNotes,
    int? SatisfactionRating,
    string? SatisfactionFeedback,
    List<string>? Tags) : ICommand;

public record UpdateTicketRequest(
    string? Status,
    string? Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? ResolutionNotes,
    int? SatisfactionRating,
    string? SatisfactionFeedback,
    List<string>? Tags);

public class UpdateTicketHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant,
    ICurrentUser currentUser) : ICommandHandler<UpdateTicketCommand>
{
    public async Task<Result> Handle(UpdateTicketCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var ticket = await dbContext.Tickets
            .Include(t => t.Activities)
            .FirstOrDefaultAsync(t => t.Id == request.TicketId && t.TenantId == tenantId, cancellationToken);

        if (ticket is null)
        {
            throw new NotFoundException($"Ticket with ID '{request.TicketId}' was not found.");
        }

        var userName = "Temsilci";

        // Status Change
        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != ticket.Status)
        {
            var oldStatus = ticket.Status;
            ticket.Status = request.Status;

            if (request.Status == "Resolved")
            {
                ticket.ResolvedAt = now;
                if (!string.IsNullOrWhiteSpace(request.ResolutionNotes))
                {
                    ticket.ResolutionNotes = request.ResolutionNotes;
                }
            }
            else if (request.Status == "Closed")
            {
                ticket.ClosedAt = now;
            }

            ticket.Activities.Add(new HelpdeskTicketActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketId = ticket.Id,
                UserId = currentUser.Id,
                UserName = userName,
                ActionType = "StatusChanged",
                Description = $"Durum güncellendi: {oldStatus} ➔ {request.Status}",
                OldValue = oldStatus,
                NewValue = request.Status,
                CreatedAt = now
            });
        }

        // Priority Change
        if (!string.IsNullOrWhiteSpace(request.Priority) && request.Priority != ticket.Priority)
        {
            var oldPriority = ticket.Priority;
            ticket.Priority = request.Priority;

            ticket.Activities.Add(new HelpdeskTicketActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketId = ticket.Id,
                UserId = currentUser.Id,
                UserName = userName,
                ActionType = "PriorityChanged",
                Description = $"Öncelik güncellendi: {oldPriority} ➔ {request.Priority}",
                OldValue = oldPriority,
                NewValue = request.Priority,
                CreatedAt = now
            });
        }

        // Assigned User Change
        if (request.AssignedUserId.HasValue && request.AssignedUserId.Value != ticket.AssignedUserId)
        {
            var oldAssignee = ticket.AssignedUserName ?? "Atanmamış";
            ticket.AssignedUserId = request.AssignedUserId.Value;
            ticket.AssignedUserName = request.AssignedUserName;

            ticket.Activities.Add(new HelpdeskTicketActivity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                TicketId = ticket.Id,
                UserId = currentUser.Id,
                UserName = userName,
                ActionType = "Assigned",
                Description = $"Temsilci atandı: {oldAssignee} ➔ {request.AssignedUserName ?? "Yeni Temsilci"}",
                OldValue = oldAssignee,
                NewValue = request.AssignedUserName,
                CreatedAt = now
            });

            // Ensure assigned agent is in channel
            if (ticket.ChannelId.HasValue)
            {
                var isParticipant = await dbContext.Participants.AnyAsync(
                    p => p.ChannelId == ticket.ChannelId.Value && p.UserId == request.AssignedUserId.Value,
                    cancellationToken);

                if (!isParticipant)
                {
                    dbContext.Participants.Add(new ChatParticipant
                    {
                        TenantId = tenantId,
                        ChannelId = ticket.ChannelId.Value,
                        UserId = request.AssignedUserId.Value,
                        UserName = request.AssignedUserName ?? "Temsilci",
                        Role = "Agent",
                        JoinedAt = now
                    });
                }
            }
        }

        // Department Change
        if (request.DepartmentId.HasValue && request.DepartmentId.Value != ticket.DepartmentId)
        {
            ticket.DepartmentId = request.DepartmentId.Value;
            ticket.DepartmentName = request.DepartmentName;
        }

        // Resolution Notes
        if (!string.IsNullOrWhiteSpace(request.ResolutionNotes))
        {
            ticket.ResolutionNotes = request.ResolutionNotes;
        }

        // Satisfaction
        if (request.SatisfactionRating.HasValue)
        {
            ticket.SatisfactionRating = request.SatisfactionRating.Value;
            ticket.SatisfactionFeedback = request.SatisfactionFeedback;
        }

        // Tags
        if (request.Tags != null)
        {
            ticket.Tags = request.Tags;
        }

        ticket.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class UpdateTicketEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/tickets/{id:guid}", async (
            Guid id,
            UpdateTicketRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateTicketCommand(
                id,
                request.Status,
                request.Priority,
                request.DepartmentId,
                request.DepartmentName,
                request.AssignedUserId,
                request.AssignedUserName,
                request.ResolutionNotes,
                request.SatisfactionRating,
                request.SatisfactionFeedback,
                request.Tags);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<string>.Ok("Ticket updated successfully."));
        })
        .RequireAuthorization()
        .RequirePermission("Tickets.Manage")
        .WithName("UpdateTicket")
        .WithTags("HelpDesk");
    }
}
