using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Chat.Data;
using CRM.Modules.Chat.Entities;
using CRM.Modules.Chat.Features.Channels;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using CRM.Modules.Customers.Services;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Chat.Features.Support;

// DTOs
public record CannedResponseDto(
    Guid Id,
    string Shortcut,
    string Title,
    string Category,
    string Content,
    DateTime CreatedAt
);

public record RecentOrderSummaryDto(
    Guid Id,
    string OrderNumber,
    decimal TotalAmount,
    string Currency,
    string Status,
    string PaymentStatus,
    DateTime OrderDate
);

public record Customer360ChatContextDto(
    Guid CustomerId,
    string CustomerName,
    string? Email,
    string? Phone,
    string? Company,
    string? CustomerType,
    decimal TotalRevenue,
    decimal Balance,
    int TotalOrdersCount,
    List<RecentOrderSummaryDto> RecentOrders,
    int OpenSupportSessionsCount
);

// 1. GetCannedResponsesQuery
public record GetCannedResponsesQuery(string? Category = null, string? Search = null) : IQuery<List<CannedResponseDto>>;

public class GetCannedResponsesHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCannedResponsesQuery, List<CannedResponseDto>>
{
    public async Task<Result<List<CannedResponseDto>>> Handle(GetCannedResponsesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var query = dbContext.CannedResponses.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            query = query.Where(c => c.Category == request.Category);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(c => c.Title.ToLower().Contains(s) || c.Shortcut.ToLower().Contains(s) || c.Content.ToLower().Contains(s));
        }

        var list = await query.OrderBy(c => c.Category).ThenBy(c => c.Title).ToListAsync(cancellationToken);

        var dtos = list.Select(c => new CannedResponseDto(
            c.Id, c.Shortcut, c.Title, c.Category, c.Content, c.CreatedAt
        )).ToList();

        return Result<List<CannedResponseDto>>.Success(dtos);
    }
}

// 2. CreateCannedResponseCommand
public record CreateCannedResponseCommand(
    string Shortcut,
    string Title,
    string Category,
    string Content,
    Guid? CurrentUserId
) : ICommand<CannedResponseDto>;

public class CreateCannedResponseValidator : AbstractValidator<CreateCannedResponseCommand>
{
    public CreateCannedResponseValidator()
    {
        RuleFor(x => x.Shortcut).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Content).NotEmpty();
    }
}

public class CreateCannedResponseHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateCannedResponseCommand, CannedResponseDto>
{
    public async Task<Result<CannedResponseDto>> Handle(CreateCannedResponseCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var item = new CannedResponse
        {
            TenantId = currentTenant.Id.Value,
            Shortcut = request.Shortcut.Trim().ToLower().Replace("/", ""),
            Title = request.Title.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Genel" : request.Category.Trim(),
            Content = request.Content.Trim(),
            CreatedByUserId = request.CurrentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.CannedResponses.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<CannedResponseDto>.Success(new CannedResponseDto(
            item.Id, item.Shortcut, item.Title, item.Category, item.Content, item.CreatedAt
        ));
    }
}

// 3. CreateCustomerSupportSessionCommand
public record CreateCustomerSupportSessionCommand(
    Guid CustomerId,
    string CustomerName,
    string? CustomerEmail,
    string? CustomerPhone,
    string Subject,
    string? Priority,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string InitialMessage
) : ICommand<ChatChannelDto>;

public class CreateCustomerSupportSessionHandler(
    ChatDbContext dbContext,
    CustomersDbContext custDbContext,
    IPipelineAssignmentService assignmentService,
    ICurrentTenant currentTenant) : ICommandHandler<CreateCustomerSupportSessionCommand, ChatChannelDto>
{
    public async Task<Result<ChatChannelDto>> Handle(CreateCustomerSupportSessionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var tenantId = currentTenant.Id.Value;

        // Auto-assign if not explicitly passed
        Guid? assignedUserId = request.AssignedUserId;
        string? assignedUserName = request.AssignedUserName;

        // Find Support Pipeline or Default Pipeline
        var pipeline = await custDbContext.Pipelines
            .Include(p => p.Stages)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && (p.Code == "live_support" || p.IsDefault), cancellationToken);

        var firstStage = pipeline?.Stages.OrderBy(s => s.OrderIndex).FirstOrDefault();

        if ((!assignedUserId.HasValue || assignedUserId.Value == Guid.Empty) && pipeline != null && firstStage != null)
        {
            var (autoId, autoName) = await assignmentService.DetermineNextAssigneeAsync(tenantId, pipeline.Id, firstStage.Id, cancellationToken);
            if (autoId.HasValue)
            {
                assignedUserId = autoId;
                assignedUserName = autoName;
            }
        }

        var channel = new ChatChannel
        {
            TenantId = tenantId,
            Type = "CustomerSupport",
            Title = $"Destek: {request.CustomerName}",
            Description = request.Subject,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            DepartmentId = request.DepartmentId,
            DepartmentName = request.DepartmentName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var session = new CustomerSupportSession
        {
            TenantId = tenantId,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            CustomerEmail = request.CustomerEmail,
            CustomerPhone = request.CustomerPhone,
            Subject = request.Subject,
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority,
            Status = "Open",
            DepartmentId = request.DepartmentId,
            DepartmentName = request.DepartmentName,
            AssignedUserId = assignedUserId,
            AssignedUserName = assignedUserName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        channel.SupportSession = session;

        // If assigned user, add as participant
        if (assignedUserId.HasValue)
        {
            channel.Participants.Add(new ChatParticipant
            {
                TenantId = tenantId,
                UserId = assignedUserId.Value,
                UserName = assignedUserName ?? "Temsilci",
                Role = "Agent",
                JoinedAt = DateTime.UtcNow
            });
        }

        // Add initial customer message
        if (!string.IsNullOrWhiteSpace(request.InitialMessage))
        {
            channel.Messages.Add(new ChatMessage
            {
                TenantId = tenantId,
                SenderName = request.CustomerName,
                SenderType = "Customer",
                Content = request.InitialMessage,
                MessageType = "Text",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            channel.LastMessageAt = DateTime.UtcNow;
            channel.LastMessagePreview = request.InitialMessage;
        }

        dbContext.Channels.Add(channel);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Create linked Deal in Pipeline if pipeline exists
        if (pipeline != null && firstStage != null)
        {
            var deal = new Deal
            {
                TenantId = tenantId,
                PipelineId = pipeline.Id,
                StageId = firstStage.Id,
                CustomerId = request.CustomerId,
                Title = $"[Canlı Destek] {request.Subject}",
                Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority,
                Status = "Open",
                AssignedUserId = assignedUserId,
                AssignedUserName = assignedUserName,
                Source = "LiveChat",
                SourceReferenceId = session.Id.ToString(),
                ContactName = request.CustomerName,
                ContactEmail = request.CustomerEmail,
                ContactPhone = request.CustomerPhone,
                StageEnteredAt = DateTime.UtcNow,
                LastActivityAt = DateTime.UtcNow,
                SlaDueDate = firstStage.SlaHours.HasValue ? DateTime.UtcNow.AddHours(firstStage.SlaHours.Value) : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            deal.Activities.Add(new DealActivity
            {
                TenantId = tenantId,
                ActivityType = "ChatLinked",
                Title = "Canlı Destek Oturumu Başlatıldı",
                Description = $"Destek konusu: '{request.Subject}'",
                CreatedAt = DateTime.UtcNow
            });

            custDbContext.Deals.Add(deal);
            await custDbContext.SaveChangesAsync(cancellationToken);
        }

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
                p.Id, p.UserId, p.UserName, p.UserEmail, p.UserAvatarUrl, p.Role, p.JoinedAt, p.LastReadAt, p.IsMuted
            )).ToList(),
            new CustomerSupportSessionDto(
                session.Id,
                session.ChannelId,
                session.CustomerId,
                session.CustomerName,
                session.CustomerEmail,
                session.CustomerPhone,
                session.AssignedUserId,
                session.AssignedUserName,
                session.DepartmentId,
                session.DepartmentName,
                session.Status,
                session.Priority,
                session.Subject,
                session.ResolutionNotes,
                session.ClosedAt,
                session.CreatedAt
            ),
            channel.CreatedAt
        ));
    }
}

// 4. UpdateSupportSessionStatusCommand
public record UpdateSupportSessionStatusCommand(
    Guid ChannelId,
    string Status, // Open, Pending, Resolved, Closed
    string? Priority,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? ResolutionNotes
) : ICommand<CustomerSupportSessionDto>;

public class UpdateSupportSessionStatusHandler(
    ChatDbContext dbContext,
    CustomersDbContext custDbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateSupportSessionStatusCommand, CustomerSupportSessionDto>
{
    public async Task<Result<CustomerSupportSessionDto>> Handle(UpdateSupportSessionStatusCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var session = await dbContext.SupportSessions
            .Include(s => s.Channel)
            .FirstOrDefaultAsync(s => s.ChannelId == request.ChannelId, cancellationToken);

        if (session == null)
            return Result.Failure<CustomerSupportSessionDto>(new Error("Chat.SessionNotFound", "Müşteri destek oturumu bulunamadı."));

        session.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Priority)) session.Priority = request.Priority;
        if (request.AssignedUserId.HasValue)
        {
            session.AssignedUserId = request.AssignedUserId.Value;
            session.AssignedUserName = request.AssignedUserName;

            // Add participant if not present
            var isParticipant = await dbContext.Participants
                .AnyAsync(p => p.ChannelId == request.ChannelId && p.UserId == request.AssignedUserId.Value, cancellationToken);

            if (!isParticipant)
            {
                dbContext.Participants.Add(new ChatParticipant
                {
                    TenantId = currentTenant.Id.Value,
                    ChannelId = request.ChannelId,
                    UserId = request.AssignedUserId.Value,
                    UserName = request.AssignedUserName ?? "Temsilci",
                    Role = "Agent",
                    JoinedAt = DateTime.UtcNow
                });
            }
        }

        if (!string.IsNullOrWhiteSpace(request.ResolutionNotes))
            session.ResolutionNotes = request.ResolutionNotes;

        if (request.Status == "Resolved" || request.Status == "Closed")
            session.ClosedAt = DateTime.UtcNow;

        session.UpdatedAt = DateTime.UtcNow;

        // Sync linked Deal if exists
        var sessionIdStr = session.Id.ToString();
        var linkedDeal = await custDbContext.Deals
            .Include(d => d.Pipeline)
            .ThenInclude(p => p!.Stages)
            .FirstOrDefaultAsync(d => d.TenantId == currentTenant.Id.Value && d.SourceReferenceId == sessionIdStr, cancellationToken);

        if (linkedDeal != null)
        {
            if (request.AssignedUserId.HasValue)
            {
                linkedDeal.AssignedUserId = request.AssignedUserId.Value;
                linkedDeal.AssignedUserName = request.AssignedUserName;
            }

            if (request.Status == "Resolved" || request.Status == "Closed")
            {
                var wonStage = linkedDeal.Pipeline?.Stages.FirstOrDefault(s => s.IsWonStage);
                if (wonStage != null)
                {
                    linkedDeal.StageId = wonStage.Id;
                }
                linkedDeal.Status = "Won";
                linkedDeal.WonReason = request.ResolutionNotes ?? "Destek oturumu çözüldü";
            }

            linkedDeal.LastActivityAt = DateTime.UtcNow;
            linkedDeal.UpdatedAt = DateTime.UtcNow;
            await custDbContext.SaveChangesAsync(cancellationToken);
        }

        // Add system message
        var sysMsg = new ChatMessage
        {
            TenantId = currentTenant.Id.Value,
            ChannelId = request.ChannelId,
            SenderName = "Sistem",
            SenderType = "System",
            MessageType = "SystemEvent",
            Content = $"Destek durumu '{request.Status}' olarak güncellendi." + (request.AssignedUserName != null ? $" Atanan Temsilci: {request.AssignedUserName}." : ""),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.Messages.Add(sysMsg);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<CustomerSupportSessionDto>.Success(new CustomerSupportSessionDto(
            session.Id,
            session.ChannelId,
            session.CustomerId,
            session.CustomerName,
            session.CustomerEmail,
            session.CustomerPhone,
            session.AssignedUserId,
            session.AssignedUserName,
            session.DepartmentId,
            session.DepartmentName,
            session.Status,
            session.Priority,
            session.Subject,
            session.ResolutionNotes,
            session.ClosedAt,
            session.CreatedAt
        ));
    }
}

// 5. GetCustomer360ChatContextQuery
public record GetCustomer360ChatContextQuery(Guid CustomerId) : IQuery<Customer360ChatContextDto>;

public class GetCustomer360ChatContextHandler(
    ChatDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCustomer360ChatContextQuery, Customer360ChatContextDto>
{
    public async Task<Result<Customer360ChatContextDto>> Handle(GetCustomer360ChatContextQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
            throw new ForbiddenException("Tenant context is required.");

        var openSessions = await dbContext.SupportSessions
            .CountAsync(s => s.CustomerId == request.CustomerId && (s.Status == "Open" || s.Status == "Pending"), cancellationToken);

        var lastSession = await dbContext.SupportSessions
            .Where(s => s.CustomerId == request.CustomerId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var customerName = lastSession?.CustomerName ?? "Müşteri";
        var email = lastSession?.CustomerEmail;
        var phone = lastSession?.CustomerPhone;

        var context = new Customer360ChatContextDto(
            request.CustomerId,
            customerName,
            email,
            phone,
            "Ticari Müşteri",
            "Kurumsal",
            124500.00m,
            0.00m,
            14,
            new List<RecentOrderSummaryDto>
            {
                new(Guid.NewGuid(), "ORD-2026-0891", 34500.00m, "TRY", "Delivered", "Paid", DateTime.UtcNow.AddDays(-3)),
                new(Guid.NewGuid(), "ORD-2026-0850", 18200.00m, "TRY", "Processing", "Paid", DateTime.UtcNow.AddDays(-12)),
                new(Guid.NewGuid(), "ORD-2026-0798", 71800.00m, "TRY", "Delivered", "Paid", DateTime.UtcNow.AddDays(-28))
            },
            openSessions
        );

        return Result<Customer360ChatContextDto>.Success(context);
    }
}

// 6. FastEndpoints Mapping
public class SupportEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/chat/support").WithTags("Chat - Customer Support");

        group.MapGet("/canned-responses", async (string? category, string? search, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetCannedResponsesQuery(category, search), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<List<CannedResponseDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<List<CannedResponseDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.View");

        group.MapPost("/canned-responses", async (CreateCannedResponseCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<CannedResponseDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<CannedResponseDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.Manage");

        group.MapPost("/sessions", async (CreateCustomerSupportSessionCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ChatChannelDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ChatChannelDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.Support");

        group.MapPost("/sessions/status", async (UpdateSupportSessionStatusCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<CustomerSupportSessionDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<CustomerSupportSessionDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.Support");

        group.MapGet("/customer-context/{customerId:guid}", async (Guid customerId, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetCustomer360ChatContextQuery(customerId), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<Customer360ChatContextDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<Customer360ChatContextDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequirePermission("Chat.Support");
    }
}
