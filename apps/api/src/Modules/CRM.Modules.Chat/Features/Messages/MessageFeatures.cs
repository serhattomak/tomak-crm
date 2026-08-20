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

namespace CRM.Modules.Chat.Features.Messages;

// DTOs
public record ChatAttachmentDto(
    Guid Id,
    string FileName,
    string FileUrl,
    string FileType,
    long FileSizeBytes
);

public record CreateAttachmentDto(
    string FileName,
    string FileUrl,
    string FileType,
    long FileSizeBytes
);

public record ChatEntityEmbedDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string EntityTitle,
    string? EntitySubtitle,
    string? EntityStatus,
    string? MetadataJson
);

public record CreateEntityEmbedDto(
    string EntityType,
    Guid EntityId,
    string EntityTitle,
    string? EntitySubtitle,
    string? EntityStatus,
    string? MetadataJson
);

public record ChatMessageDto(
    Guid Id,
    Guid ChannelId,
    Guid? SenderUserId,
    string SenderName,
    string? SenderAvatarUrl,
    string SenderType,
    string Content,
    string MessageType,
    Guid? ReplyToMessageId,
    bool IsEdited,
    bool IsDeleted,
    List<ChatAttachmentDto> Attachments,
    List<ChatEntityEmbedDto> EntityEmbeds,
    DateTime CreatedAt
);

// 1. GetMessagesQuery
public record GetMessagesQuery(Guid ChannelId, int Limit = 100) : IQuery<List<ChatMessageDto>>;

public class GetMessagesHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetMessagesQuery, List<ChatMessageDto>>
{
    public async Task<Result<List<ChatMessageDto>>> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var messages = await dbContext.Messages
            .Include(m => m.Attachments)
            .Include(m => m.EntityEmbeds)
            .Where(m => m.ChannelId == request.ChannelId && !m.IsDeleted)
            .OrderBy(m => m.CreatedAt)
            .Take(request.Limit)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var dtos = messages.Select(m => new ChatMessageDto(
            m.Id,
            m.ChannelId,
            m.SenderUserId,
            m.SenderName,
            m.SenderAvatarUrl,
            m.SenderType,
            m.Content,
            m.MessageType,
            m.ReplyToMessageId,
            m.IsEdited,
            m.IsDeleted,
            m.Attachments.Select(a => new ChatAttachmentDto(
                a.Id, a.FileName, a.FileUrl, a.FileType, a.FileSizeBytes
            )).ToList(),
            m.EntityEmbeds.Select(ee => new ChatEntityEmbedDto(
                ee.Id, ee.EntityType, ee.EntityId, ee.EntityTitle, ee.EntitySubtitle, ee.EntityStatus, ee.MetadataJson
            )).ToList(),
            m.CreatedAt
        )).ToList();

        return Result<List<ChatMessageDto>>.Success(dtos);
    }
}

// 2. SendMessageCommand
public record SendMessageCommand(
    Guid ChannelId,
    Guid? SenderUserId,
    string SenderName,
    string? SenderAvatarUrl,
    string SenderType, // User, Customer, System
    string Content,
    string MessageType, // Text, InternalNote, SystemEvent, EntityEmbed
    Guid? ReplyToMessageId,
    List<CreateAttachmentDto>? Attachments,
    List<CreateEntityEmbedDto>? EntityEmbeds
) : ICommand<ChatMessageDto>;

public class SendMessageValidator : AbstractValidator<SendMessageCommand>
{
    public SendMessageValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
        RuleFor(x => x.SenderName).NotEmpty();
        RuleFor(x => x.Content).NotEmpty().When(x => (x.Attachments == null || x.Attachments.Count == 0) && (x.EntityEmbeds == null || x.EntityEmbeds.Count == 0));
    }
}

public class SendMessageHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<SendMessageCommand, ChatMessageDto>
{
    public async Task<Result<ChatMessageDto>> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var channel = await dbContext.Channels
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId, cancellationToken);

        if (channel == null)
            return Result.Failure<ChatMessageDto>(new Error("Chat.ChannelNotFound", "Sohbet kanalı bulunamadı."));

        var message = new ChatMessage
        {
            TenantId = currentTenant.Id.Value,
            ChannelId = request.ChannelId,
            SenderUserId = request.SenderUserId,
            SenderName = request.SenderName,
            SenderAvatarUrl = request.SenderAvatarUrl,
            SenderType = request.SenderType,
            Content = request.Content,
            MessageType = request.MessageType,
            ReplyToMessageId = request.ReplyToMessageId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.Attachments != null)
        {
            foreach (var att in request.Attachments)
            {
                message.Attachments.Add(new ChatAttachment
                {
                    TenantId = currentTenant.Id.Value,
                    FileName = att.FileName,
                    FileUrl = att.FileUrl,
                    FileType = att.FileType,
                    FileSizeBytes = att.FileSizeBytes,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.EntityEmbeds != null)
        {
            foreach (var embed in request.EntityEmbeds)
            {
                message.EntityEmbeds.Add(new ChatEntityEmbed
                {
                    TenantId = currentTenant.Id.Value,
                    EntityType = embed.EntityType,
                    EntityId = embed.EntityId,
                    EntityTitle = embed.EntityTitle,
                    EntitySubtitle = embed.EntitySubtitle,
                    EntityStatus = embed.EntityStatus,
                    MetadataJson = embed.MetadataJson,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        dbContext.Messages.Add(message);

        // Update channel last message timestamp and preview
        channel.LastMessageAt = DateTime.UtcNow;
        channel.LastMessagePreview = request.MessageType == "InternalNote"
            ? $"[Dahili Not] {request.Content}"
            : request.EntityEmbeds?.Count > 0
                ? $"[{request.EntityEmbeds[0].EntityType}] {request.EntityEmbeds[0].EntityTitle}"
                : request.Content.Length > 100 ? request.Content[..100] + "..." : request.Content;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ChatMessageDto>.Success(new ChatMessageDto(
            message.Id,
            message.ChannelId,
            message.SenderUserId,
            message.SenderName,
            message.SenderAvatarUrl,
            message.SenderType,
            message.Content,
            message.MessageType,
            message.ReplyToMessageId,
            message.IsEdited,
            message.IsDeleted,
            message.Attachments.Select(a => new ChatAttachmentDto(
                a.Id, a.FileName, a.FileUrl, a.FileType, a.FileSizeBytes
            )).ToList(),
            message.EntityEmbeds.Select(ee => new ChatEntityEmbedDto(
                ee.Id, ee.EntityType, ee.EntityId, ee.EntityTitle, ee.EntitySubtitle, ee.EntityStatus, ee.MetadataJson
            )).ToList(),
            message.CreatedAt
        ));
    }
}

// 3. MarkMessagesAsReadCommand
public record MarkMessagesAsReadCommand(Guid ChannelId, Guid UserId) : ICommand<bool>;

public class MarkMessagesAsReadHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<MarkMessagesAsReadCommand, bool>
{
    public async Task<Result<bool>> Handle(MarkMessagesAsReadCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var participant = await dbContext.Participants
            .FirstOrDefaultAsync(p => p.ChannelId == request.ChannelId && p.UserId == request.UserId, cancellationToken);

        if (participant != null)
        {
            participant.LastReadAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Result<bool>.Success(true);
    }
}

// 4. FastEndpoints Mapping
public class MessageEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/chat/messages").WithTags("Chat - Messages");

        group.MapGet("/channel/{channelId:guid}", async (Guid channelId, int? limit, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetMessagesQuery(channelId, limit ?? 100), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<ChatMessageDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<ChatMessageDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.View");

        group.MapPost("/", async (SendMessageCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ChatMessageDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ChatMessageDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.View");

        group.MapPost("/read", async (MarkMessagesAsReadCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.View");
    }
}
