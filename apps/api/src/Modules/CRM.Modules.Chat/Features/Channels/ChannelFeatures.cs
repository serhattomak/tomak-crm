using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using CRM.Modules.Chat.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Features.Channels;

// DTOs
public record ChatParticipantDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string? UserEmail,
    string? UserAvatarUrl,
    string Role,
    DateTime JoinedAt,
    DateTime? LastReadAt,
    bool IsMuted
);

public record ChatChannelDto(
    Guid Id,
    string Type,
    string Title,
    string? Description,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? CustomerId,
    string? CustomerName,
    bool IsPrivate,
    DateTime? LastMessageAt,
    string? LastMessagePreview,
    int UnreadCount,
    List<ChatParticipantDto> Participants,
    CustomerSupportSessionDto? SupportSession,
    DateTime CreatedAt
);

public record CustomerSupportSessionDto(
    Guid Id,
    Guid ChannelId,
    Guid CustomerId,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    Guid? AssignedUserId,
    string? AssignedUserName,
    Guid? DepartmentId,
    string? DepartmentName,
    string Status,
    string Priority,
    string? Subject,
    string? ResolutionNotes,
    DateTime? ClosedAt,
    DateTime CreatedAt
);

// 1. GetChannelsQuery
public record GetChannelsQuery(string? Type = null, string? Search = null) : IQuery<List<ChatChannelDto>>;

public class GetChannelsHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetChannelsQuery, List<ChatChannelDto>>
{
    public async Task<Result<List<ChatChannelDto>>> Handle(GetChannelsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var query = dbContext.Channels
            .Include(c => c.Participants)
            .Include(c => c.SupportSession)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Type))
        {
            query = query.Where(c => c.Type == request.Type);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(c => c.Title.ToLower().Contains(s) ||
                                     (c.CustomerName != null && c.CustomerName.ToLower().Contains(s)) ||
                                     (c.DepartmentName != null && c.DepartmentName.ToLower().Contains(s)));
        }

        var channels = await query
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = channels.Select(c => new ChatChannelDto(
            c.Id,
            c.Type,
            c.Title,
            c.Description,
            c.DepartmentId,
            c.DepartmentName,
            c.CustomerId,
            c.CustomerName,
            c.IsPrivate,
            c.LastMessageAt,
            c.LastMessagePreview,
            0,
            c.Participants.Select(p => new ChatParticipantDto(
                p.Id,
                p.UserId,
                p.UserName,
                p.UserEmail,
                p.UserAvatarUrl,
                p.Role,
                p.JoinedAt,
                p.LastReadAt,
                p.IsMuted
            )).ToList(),
            c.SupportSession != null ? new CustomerSupportSessionDto(
                c.SupportSession.Id,
                c.SupportSession.ChannelId,
                c.SupportSession.CustomerId,
                c.SupportSession.CustomerName,
                c.SupportSession.CustomerEmail,
                c.SupportSession.CustomerPhone,
                c.SupportSession.AssignedUserId,
                c.SupportSession.AssignedUserName,
                c.SupportSession.DepartmentId,
                c.SupportSession.DepartmentName,
                c.SupportSession.Status,
                c.SupportSession.Priority,
                c.SupportSession.Subject,
                c.SupportSession.ResolutionNotes,
                c.SupportSession.ClosedAt,
                c.SupportSession.CreatedAt
            ) : null,
            c.CreatedAt
        )).ToList();

        return Result<List<ChatChannelDto>>.Success(dtos);
    }
}

// 2. CreateChannelCommand
public record CreateChannelCommand(
    string Title,
    string? Description,
    string Type,
    bool IsPrivate,
    Guid? DepartmentId,
    string? DepartmentName,
    List<Guid>? ParticipantUserIds,
    Guid? CurrentUserId,
    string? CurrentUserName
) : ICommand<ChatChannelDto>;

public class CreateChannelValidator : AbstractValidator<CreateChannelCommand>
{
    public CreateChannelValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Type).NotEmpty().Must(t => t == "Group" || t == "Direct" || t == "CustomerSupport");
    }
}

public class CreateChannelHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateChannelCommand, ChatChannelDto>
{
    public async Task<Result<ChatChannelDto>> Handle(CreateChannelCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var channel = new ChatChannel
        {
            TenantId = currentTenant.Id.Value,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Type = request.Type,
            IsPrivate = request.IsPrivate,
            DepartmentId = request.DepartmentId,
            DepartmentName = request.DepartmentName,
            CreatedByUserId = request.CurrentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.CurrentUserId.HasValue)
        {
            channel.Participants.Add(new ChatParticipant
            {
                TenantId = currentTenant.Id.Value,
                UserId = request.CurrentUserId.Value,
                UserName = request.CurrentUserName ?? "Admin",
                Role = "Owner",
                JoinedAt = DateTime.UtcNow
            });
        }

        if (request.ParticipantUserIds != null)
        {
            foreach (var uid in request.ParticipantUserIds)
            {
                if (request.CurrentUserId.HasValue && uid == request.CurrentUserId.Value) continue;
                channel.Participants.Add(new ChatParticipant
                {
                    TenantId = currentTenant.Id.Value,
                    UserId = uid,
                    UserName = "Çalışan",
                    Role = "Member",
                    JoinedAt = DateTime.UtcNow
                });
            }
        }

        dbContext.Channels.Add(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ChatChannelDto>.Success(new ChatChannelDto(
            channel.Id,
            channel.Type,
            channel.Title,
            channel.Description,
            channel.DepartmentId,
            channel.DepartmentName,
            channel.CustomerId,
            channel.CustomerName,
            channel.IsPrivate,
            channel.LastMessageAt,
            channel.LastMessagePreview,
            0,
            channel.Participants.Select(p => new ChatParticipantDto(
                p.Id,
                p.UserId,
                p.UserName,
                p.UserEmail,
                p.UserAvatarUrl,
                p.Role,
                p.JoinedAt,
                p.LastReadAt,
                p.IsMuted
            )).ToList(),
            null,
            channel.CreatedAt
        ));
    }
}

// 3. GetOrCreateDirectChatCommand
public record GetOrCreateDirectChatCommand(
    Guid TargetUserId,
    string TargetUserName,
    string? TargetUserEmail,
    string? TargetUserAvatarUrl,
    Guid CurrentUserId,
    string CurrentUserName,
    string? CurrentUserEmail,
    string? CurrentUserAvatarUrl
) : ICommand<ChatChannelDto>;

public class GetOrCreateDirectChatHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<GetOrCreateDirectChatCommand, ChatChannelDto>
{
    public async Task<Result<ChatChannelDto>> Handle(GetOrCreateDirectChatCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        // Find existing direct channel between these two users
        var directChannel = await dbContext.Channels
            .Include(c => c.Participants)
            .Where(c => c.Type == "Direct")
            .FirstOrDefaultAsync(c => c.Participants.Any(p => p.UserId == request.CurrentUserId) &&
                                      c.Participants.Any(p => p.UserId == request.TargetUserId), cancellationToken);

        if (directChannel != null)
        {
            return Result<ChatChannelDto>.Success(new ChatChannelDto(
                directChannel.Id,
                directChannel.Type,
                directChannel.Title,
                directChannel.Description,
                directChannel.DepartmentId,
                directChannel.DepartmentName,
                directChannel.CustomerId,
                directChannel.CustomerName,
                directChannel.IsPrivate,
                directChannel.LastMessageAt,
                directChannel.LastMessagePreview,
                0,
                directChannel.Participants.Select(p => new ChatParticipantDto(
                    p.Id,
                    p.UserId,
                    p.UserName,
                    p.UserEmail,
                    p.UserAvatarUrl,
                    p.Role,
                    p.JoinedAt,
                    p.LastReadAt,
                    p.IsMuted
                )).ToList(),
                null,
                directChannel.CreatedAt
            ));
        }

        // Create new direct channel
        var newChannel = new ChatChannel
        {
            TenantId = currentTenant.Id.Value,
            Type = "Direct",
            Title = $"{request.TargetUserName}",
            IsPrivate = true,
            CreatedByUserId = request.CurrentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        newChannel.Participants.Add(new ChatParticipant
        {
            TenantId = currentTenant.Id.Value,
            UserId = request.CurrentUserId,
            UserName = request.CurrentUserName,
            UserEmail = request.CurrentUserEmail,
            UserAvatarUrl = request.CurrentUserAvatarUrl,
            Role = "Member",
            JoinedAt = DateTime.UtcNow
        });

        newChannel.Participants.Add(new ChatParticipant
        {
            TenantId = currentTenant.Id.Value,
            UserId = request.TargetUserId,
            UserName = request.TargetUserName,
            UserEmail = request.TargetUserEmail,
            UserAvatarUrl = request.TargetUserAvatarUrl,
            Role = "Member",
            JoinedAt = DateTime.UtcNow
        });

        dbContext.Channels.Add(newChannel);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ChatChannelDto>.Success(new ChatChannelDto(
            newChannel.Id,
            newChannel.Type,
            newChannel.Title,
            newChannel.Description,
            null,
            null,
            null,
            null,
            newChannel.IsPrivate,
            null,
            null,
            0,
            newChannel.Participants.Select(p => new ChatParticipantDto(
                p.Id,
                p.UserId,
                p.UserName,
                p.UserEmail,
                p.UserAvatarUrl,
                p.Role,
                p.JoinedAt,
                p.LastReadAt,
                p.IsMuted
            )).ToList(),
            null,
            newChannel.CreatedAt
        ));
    }
}

// 4. FastEndpoints Mapping
public class ChannelEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/chat/channels").WithTags("Chat - Channels");

        group.MapGet("/", async (string? type, string? search, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetChannelsQuery(type, search), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<ChatChannelDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<ChatChannelDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.View");

        group.MapPost("/", async (CreateChannelCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ChatChannelDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ChatChannelDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.Manage");

        group.MapPost("/direct", async (GetOrCreateDirectChatCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ChatChannelDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ChatChannelDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.View");
    }
}
