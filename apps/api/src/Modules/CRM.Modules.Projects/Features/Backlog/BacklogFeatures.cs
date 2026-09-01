using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Projects.Data;
using CRM.Modules.Projects.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Projects.Features.Backlog;

public record BacklogSubtaskDto(
    Guid Id,
    Guid BacklogItemId,
    string Title,
    bool IsCompleted,
    int OrderIndex,
    DateTime CreatedAt);

public record BacklogCommentDto(
    Guid Id,
    Guid BacklogItemId,
    Guid? UserId,
    string UserName,
    string? UserAvatar,
    string Content,
    DateTime CreatedAt);

public record BacklogItemDto(
    Guid Id,
    Guid TenantId,
    Guid ProjectId,
    string ProjectKey,
    string ItemKey,
    string Type,
    string Title,
    string? Description,
    string? AcceptanceCriteria,
    string Status,
    string Priority,
    int StoryPoints,
    decimal EstimatedHours,
    decimal LoggedHours,
    int OrderIndex,
    Guid? SprintId,
    string? SprintName,
    Guid? EpicId,
    string? EpicName,
    string? EpicColor,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? AssignedUserAvatar,
    Guid? ReporterUserId,
    string? ReporterUserName,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId,
    Guid? TicketId,
    DateTime? DueDate,
    DateTime? CompletedAt,
    IReadOnlyList<BacklogSubtaskDto> Subtasks,
    IReadOnlyList<BacklogCommentDto> Comments,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedBacklogResponse(
    IReadOnlyList<BacklogItemDto> Items,
    int TotalCount,
    int TotalStoryPoints,
    int Page,
    int PageSize);

public record CreateBacklogItemRequest(
    string Title,
    string Type = "Task",
    string? Description = null,
    string? AcceptanceCriteria = null,
    string Status = "Backlog",
    string Priority = "Medium",
    int StoryPoints = 0,
    decimal EstimatedHours = 0.00m,
    Guid? SprintId = null,
    Guid? EpicId = null,
    Guid? AssignedUserId = null,
    string? AssignedUserName = null,
    string? AssignedUserAvatar = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    Guid? DealId = null,
    Guid? TicketId = null,
    DateTime? DueDate = null);

public record CreateBacklogItemCommand(
    Guid ProjectId,
    string Title,
    string Type,
    string? Description,
    string? AcceptanceCriteria,
    string Status,
    string Priority,
    int StoryPoints,
    decimal EstimatedHours,
    Guid? SprintId,
    Guid? EpicId,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? AssignedUserAvatar,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId,
    Guid? TicketId,
    DateTime? DueDate) : ICommand<Guid>;

public record UpdateBacklogItemRequest(
    string Title,
    string Type = "Task",
    string? Description = null,
    string? AcceptanceCriteria = null,
    string Status = "Backlog",
    string Priority = "Medium",
    int StoryPoints = 0,
    decimal EstimatedHours = 0.00m,
    decimal LoggedHours = 0.00m,
    Guid? SprintId = null,
    Guid? EpicId = null,
    Guid? AssignedUserId = null,
    string? AssignedUserName = null,
    string? AssignedUserAvatar = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    Guid? DealId = null,
    Guid? TicketId = null,
    DateTime? DueDate = null);

public record UpdateBacklogItemCommand(
    Guid Id,
    string Title,
    string Type,
    string? Description,
    string? AcceptanceCriteria,
    string Status,
    string Priority,
    int StoryPoints,
    decimal EstimatedHours,
    decimal LoggedHours,
    Guid? SprintId,
    Guid? EpicId,
    Guid? AssignedUserId,
    string? AssignedUserName,
    string? AssignedUserAvatar,
    Guid? CustomerId,
    string? CustomerName,
    Guid? DealId,
    Guid? TicketId,
    DateTime? DueDate) : ICommand<bool>;

public record MoveBacklogItemStatusRequest(string Status, int OrderIndex = 0);
public record MoveBacklogItemStatusCommand(Guid Id, string Status, int OrderIndex = 0) : ICommand<bool>;

public record AssignItemToSprintRequest(Guid? SprintId);
public record AssignItemToSprintCommand(Guid Id, Guid? SprintId) : ICommand<bool>;

public record AddSubtaskRequest(string Title);
public record AddSubtaskCommand(Guid BacklogItemId, string Title) : ICommand<Guid>;

public record ToggleSubtaskCommand(Guid SubtaskId) : ICommand<bool>;
public record DeleteSubtaskCommand(Guid SubtaskId) : ICommand<bool>;

public record AddCommentRequest(string Content, string UserName, Guid? UserId = null, string? UserAvatar = null);
public record AddCommentCommand(Guid BacklogItemId, string Content, string UserName, Guid? UserId, string? UserAvatar) : ICommand<Guid>;

public record DeleteBacklogItemCommand(Guid Id) : ICommand<bool>;

public record GetBacklogItemsQuery(
    Guid? ProjectId = null,
    Guid? SprintId = null,
    Guid? EpicId = null,
    string? Status = null,
    string? Priority = null,
    string? Type = null,
    Guid? AssignedUserId = null,
    Guid? CustomerId = null,
    Guid? DealId = null,
    bool? UnassignedSprint = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 100) : IQuery<PagedBacklogResponse>;

public class CreateBacklogItemValidator : AbstractValidator<CreateBacklogItemCommand>
{
    public CreateBacklogItemValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Başlık zorunludur.").MaximumLength(255);
        RuleFor(x => x.Type).NotEmpty().WithMessage("İş maddesi türü zorunludur.");
    }
}

public class GetBacklogItemsHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : IQueryHandler<GetBacklogItemsQuery, PagedBacklogResponse>
{
    public async Task<Result<PagedBacklogResponse>> Handle(GetBacklogItemsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.BacklogItems
            .Include(i => i.Project)
            .Include(i => i.Sprint)
            .Include(i => i.Epic)
            .Include(i => i.Subtasks)
            .Include(i => i.Comments)
            .AsNoTracking();

        if (currentTenant.Id.HasValue) query = query.Where(i => i.TenantId == currentTenant.Id.Value);

        if (request.ProjectId.HasValue) query = query.Where(i => i.ProjectId == request.ProjectId.Value);
        if (request.SprintId.HasValue) query = query.Where(i => i.SprintId == request.SprintId.Value);
        if (request.UnassignedSprint == true) query = query.Where(i => i.SprintId == null);
        if (request.EpicId.HasValue) query = query.Where(i => i.EpicId == request.EpicId.Value);
        if (!string.IsNullOrWhiteSpace(request.Status)) query = query.Where(i => i.Status == request.Status);
        if (!string.IsNullOrWhiteSpace(request.Priority)) query = query.Where(i => i.Priority == request.Priority);
        if (!string.IsNullOrWhiteSpace(request.Type)) query = query.Where(i => i.Type == request.Type);
        if (request.AssignedUserId.HasValue) query = query.Where(i => i.AssignedUserId == request.AssignedUserId.Value);
        if (request.CustomerId.HasValue) query = query.Where(i => i.CustomerId == request.CustomerId.Value);
        if (request.DealId.HasValue) query = query.Where(i => i.DealId == request.DealId.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(i =>
                i.Title.ToLower().Contains(search) ||
                i.ItemKey.ToLower().Contains(search) ||
                (i.Description != null && i.Description.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var totalStoryPoints = await query.SumAsync(i => i.StoryPoints, cancellationToken);

        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize > 0 ? request.PageSize : 100;

        var items = await query
            .OrderBy(i => i.OrderIndex)
            .ThenByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new BacklogItemDto(
                i.Id,
                i.TenantId,
                i.ProjectId,
                i.Project != null ? i.Project.Key : "",
                i.ItemKey,
                i.Type,
                i.Title,
                i.Description,
                i.AcceptanceCriteria,
                i.Status,
                i.Priority,
                i.StoryPoints,
                i.EstimatedHours,
                i.LoggedHours,
                i.OrderIndex,
                i.SprintId,
                i.Sprint != null ? i.Sprint.Name : null,
                i.EpicId,
                i.Epic != null ? i.Epic.Name : null,
                i.Epic != null ? i.Epic.Color : null,
                i.AssignedUserId,
                i.AssignedUserName,
                i.AssignedUserAvatar,
                i.ReporterUserId,
                i.ReporterUserName,
                i.CustomerId,
                i.CustomerName,
                i.DealId,
                i.TicketId,
                i.DueDate,
                i.CompletedAt,
                i.Subtasks.OrderBy(s => s.OrderIndex).Select(s => new BacklogSubtaskDto(s.Id, s.BacklogItemId, s.Title, s.IsCompleted, s.OrderIndex, s.CreatedAt)).ToList(),
                i.Comments.OrderByDescending(c => c.CreatedAt).Select(c => new BacklogCommentDto(c.Id, c.BacklogItemId, c.UserId, c.UserName, c.UserAvatar, c.Content, c.CreatedAt)).ToList(),
                i.CreatedAt,
                i.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedBacklogResponse(items, totalCount, totalStoryPoints, page, pageSize));
    }
}

public class CreateBacklogItemHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<CreateBacklogItemCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateBacklogItemCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty) throw new ForbiddenException("Tenant context required.");

        var project = await dbContext.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId, cancellationToken);
        if (project == null) throw new NotFoundException($"Project {request.ProjectId} not found.");

        var totalItemsCount = await dbContext.BacklogItems.CountAsync(i => i.ProjectId == request.ProjectId, cancellationToken);
        var itemKey = $"{project.Key}-{totalItemsCount + 101}";

        var item = new BacklogItem
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            ProjectId = request.ProjectId,
            ItemKey = itemKey,
            Type = string.IsNullOrWhiteSpace(request.Type) ? "Task" : request.Type,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            AcceptanceCriteria = request.AcceptanceCriteria?.Trim(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Backlog" : request.Status,
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority,
            StoryPoints = request.StoryPoints,
            EstimatedHours = request.EstimatedHours,
            LoggedHours = 0.00m,
            OrderIndex = totalItemsCount,
            SprintId = request.SprintId,
            EpicId = request.EpicId,
            AssignedUserId = request.AssignedUserId,
            AssignedUserName = request.AssignedUserName,
            AssignedUserAvatar = request.AssignedUserAvatar,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            DealId = request.DealId,
            TicketId = request.TicketId,
            DueDate = request.DueDate,
            CompletedAt = request.Status == "Done" ? DateTime.UtcNow : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.BacklogItems.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(item.Id);
    }
}

public class UpdateBacklogItemHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<UpdateBacklogItemCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateBacklogItemCommand request, CancellationToken cancellationToken)
    {
        var item = await dbContext.BacklogItems.FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken);
        if (item == null) throw new NotFoundException($"Item {request.Id} not found.");
        if (currentTenant.Id.HasValue && item.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        item.Title = request.Title.Trim();
        item.Type = request.Type;
        item.Description = request.Description?.Trim();
        item.AcceptanceCriteria = request.AcceptanceCriteria?.Trim();
        item.Priority = request.Priority;
        item.StoryPoints = request.StoryPoints;
        item.EstimatedHours = request.EstimatedHours;
        item.LoggedHours = request.LoggedHours;
        item.SprintId = request.SprintId;
        item.EpicId = request.EpicId;
        item.AssignedUserId = request.AssignedUserId;
        item.AssignedUserName = request.AssignedUserName;
        item.AssignedUserAvatar = request.AssignedUserAvatar;
        item.CustomerId = request.CustomerId;
        item.CustomerName = request.CustomerName;
        item.DealId = request.DealId;
        item.TicketId = request.TicketId;
        item.DueDate = request.DueDate;

        if (item.Status != request.Status)
        {
            item.Status = request.Status;
            item.CompletedAt = request.Status == "Done" ? DateTime.UtcNow : null;
        }

        item.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class MoveBacklogItemStatusHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<MoveBacklogItemStatusCommand, bool>
{
    public async Task<Result<bool>> Handle(MoveBacklogItemStatusCommand request, CancellationToken cancellationToken)
    {
        var item = await dbContext.BacklogItems.FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken);
        if (item == null) throw new NotFoundException($"Item {request.Id} not found.");
        if (currentTenant.Id.HasValue && item.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        item.Status = request.Status;
        item.OrderIndex = request.OrderIndex;
        item.CompletedAt = request.Status == "Done" ? DateTime.UtcNow : null;
        item.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class AssignItemToSprintHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<AssignItemToSprintCommand, bool>
{
    public async Task<Result<bool>> Handle(AssignItemToSprintCommand request, CancellationToken cancellationToken)
    {
        var item = await dbContext.BacklogItems.FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken);
        if (item == null) throw new NotFoundException($"Item {request.Id} not found.");
        if (currentTenant.Id.HasValue && item.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        item.SprintId = request.SprintId;
        if (request.SprintId.HasValue && item.Status == "Backlog")
        {
            item.Status = "Todo";
        }
        else if (!request.SprintId.HasValue && item.Status == "Todo")
        {
            item.Status = "Backlog";
        }

        item.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class SubtaskHandlers(ProjectsDbContext dbContext, ICurrentTenant currentTenant) :
    ICommandHandler<AddSubtaskCommand, Guid>,
    ICommandHandler<ToggleSubtaskCommand, bool>,
    ICommandHandler<DeleteSubtaskCommand, bool>
{
    public async Task<Result<Guid>> Handle(AddSubtaskCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty) throw new ForbiddenException("Tenant context required.");

        var count = await dbContext.Subtasks.CountAsync(s => s.BacklogItemId == request.BacklogItemId, cancellationToken);
        var subtask = new BacklogSubtask
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            BacklogItemId = request.BacklogItemId,
            Title = request.Title.Trim(),
            IsCompleted = false,
            OrderIndex = count,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Subtasks.Add(subtask);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(subtask.Id);
    }

    public async Task<Result<bool>> Handle(ToggleSubtaskCommand request, CancellationToken cancellationToken)
    {
        var subtask = await dbContext.Subtasks.FirstOrDefaultAsync(s => s.Id == request.SubtaskId, cancellationToken);
        if (subtask == null) throw new NotFoundException($"Subtask {request.SubtaskId} not found.");
        if (currentTenant.Id.HasValue && subtask.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        subtask.IsCompleted = !subtask.IsCompleted;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(subtask.IsCompleted);
    }

    public async Task<Result<bool>> Handle(DeleteSubtaskCommand request, CancellationToken cancellationToken)
    {
        var subtask = await dbContext.Subtasks.FirstOrDefaultAsync(s => s.Id == request.SubtaskId, cancellationToken);
        if (subtask == null) throw new NotFoundException($"Subtask {request.SubtaskId} not found.");
        if (currentTenant.Id.HasValue && subtask.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        dbContext.Subtasks.Remove(subtask);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class AddCommentHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<AddCommentCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddCommentCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty) throw new ForbiddenException("Tenant context required.");

        var comment = new BacklogComment
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            BacklogItemId = request.BacklogItemId,
            UserId = request.UserId,
            UserName = request.UserName.Trim(),
            UserAvatar = request.UserAvatar,
            Content = request.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Comments.Add(comment);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(comment.Id);
    }
}

public class DeleteBacklogItemHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<DeleteBacklogItemCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteBacklogItemCommand request, CancellationToken cancellationToken)
    {
        var item = await dbContext.BacklogItems.FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken);
        if (item == null) throw new NotFoundException($"Item {request.Id} not found.");
        if (currentTenant.Id.HasValue && item.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        dbContext.BacklogItems.Remove(item);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class BacklogEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects/{projectId:guid}/items", async (
            Guid projectId,
            Guid? sprintId,
            Guid? epicId,
            string? status,
            string? priority,
            string? type,
            Guid? assignedUserId,
            Guid? customerId,
            Guid? dealId,
            bool? unassignedSprint,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetBacklogItemsQuery(
                projectId,
                sprintId,
                epicId,
                status,
                priority,
                type,
                assignedUserId,
                customerId,
                dealId,
                unassignedSprint,
                search,
                page ?? 1,
                pageSize ?? 100);

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedBacklogResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetProjectBacklogItems")
        .WithTags("Backlog");

        app.MapGet("/api/backlog-items", async (
            Guid? projectId,
            Guid? sprintId,
            Guid? epicId,
            string? status,
            string? priority,
            string? type,
            Guid? assignedUserId,
            Guid? customerId,
            Guid? dealId,
            bool? unassignedSprint,
            string? search,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetBacklogItemsQuery(
                projectId,
                sprintId,
                epicId,
                status,
                priority,
                type,
                assignedUserId,
                customerId,
                dealId,
                unassignedSprint,
                search,
                page ?? 1,
                pageSize ?? 100);

            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<PagedBacklogResponse>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetBacklogItems")
        .WithTags("Backlog");

        app.MapGet("/api/backlog-items/{id:guid}", async (
            Guid id,
            ProjectsDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var query = dbContext.BacklogItems
                .Include(i => i.Project)
                .Include(i => i.Sprint)
                .Include(i => i.Epic)
                .Include(i => i.Subtasks)
                .Include(i => i.Comments)
                .AsNoTracking();

            if (currentTenant.Id.HasValue) query = query.Where(i => i.TenantId == currentTenant.Id.Value);

            var item = await query
                .Where(i => i.Id == id)
                .Select(i => new BacklogItemDto(
                    i.Id,
                    i.TenantId,
                    i.ProjectId,
                    i.Project != null ? i.Project.Key : "",
                    i.ItemKey,
                    i.Type,
                    i.Title,
                    i.Description,
                    i.AcceptanceCriteria,
                    i.Status,
                    i.Priority,
                    i.StoryPoints,
                    i.EstimatedHours,
                    i.LoggedHours,
                    i.OrderIndex,
                    i.SprintId,
                    i.Sprint != null ? i.Sprint.Name : null,
                    i.EpicId,
                    i.Epic != null ? i.Epic.Name : null,
                    i.Epic != null ? i.Epic.Color : null,
                    i.AssignedUserId,
                    i.AssignedUserName,
                    i.AssignedUserAvatar,
                    i.ReporterUserId,
                    i.ReporterUserName,
                    i.CustomerId,
                    i.CustomerName,
                    i.DealId,
                    i.TicketId,
                    i.DueDate,
                    i.CompletedAt,
                    i.Subtasks.OrderBy(s => s.OrderIndex).Select(s => new BacklogSubtaskDto(s.Id, s.BacklogItemId, s.Title, s.IsCompleted, s.OrderIndex, s.CreatedAt)).ToList(),
                    i.Comments.OrderByDescending(c => c.CreatedAt).Select(c => new BacklogCommentDto(c.Id, c.BacklogItemId, c.UserId, c.UserName, c.UserAvatar, c.Content, c.CreatedAt)).ToList(),
                    i.CreatedAt,
                    i.UpdatedAt))
                .FirstOrDefaultAsync(ct);

            if (item == null) throw new NotFoundException($"Backlog item {id} not found.");
            return Results.Ok(ApiResponse<BacklogItemDto>.Ok(item));
        })
        .RequireAuthorization()
        .WithName("GetBacklogItemById")
        .WithTags("Backlog");

        app.MapPost("/api/projects/{projectId:guid}/items", async (
            Guid projectId,
            CreateBacklogItemRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new CreateBacklogItemCommand(
                projectId,
                request.Title,
                request.Type ?? "Task",
                request.Description,
                request.AcceptanceCriteria,
                request.Status ?? "Backlog",
                request.Priority ?? "Medium",
                request.StoryPoints,
                request.EstimatedHours,
                request.SprintId,
                request.EpicId,
                request.AssignedUserId,
                request.AssignedUserName,
                request.AssignedUserAvatar,
                request.CustomerId,
                request.CustomerName,
                request.DealId,
                request.TicketId,
                request.DueDate);

            var result = await sender.Send(command, ct);
            return Results.Created($"/api/backlog-items/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("CreateBacklogItem")
        .WithTags("Backlog");

        app.MapPut("/api/backlog-items/{id:guid}", async (
            Guid id,
            UpdateBacklogItemRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateBacklogItemCommand(
                id,
                request.Title,
                request.Type ?? "Task",
                request.Description,
                request.AcceptanceCriteria,
                request.Status ?? "Backlog",
                request.Priority ?? "Medium",
                request.StoryPoints,
                request.EstimatedHours,
                request.LoggedHours,
                request.SprintId,
                request.EpicId,
                request.AssignedUserId,
                request.AssignedUserName,
                request.AssignedUserAvatar,
                request.CustomerId,
                request.CustomerName,
                request.DealId,
                request.TicketId,
                request.DueDate);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("UpdateBacklogItem")
        .WithTags("Backlog");

        app.MapPatch("/api/backlog-items/{id:guid}/status", async (
            Guid id,
            MoveBacklogItemStatusRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new MoveBacklogItemStatusCommand(id, request.Status, request.OrderIndex);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("MoveBacklogItemStatus")
        .WithTags("Backlog");

        app.MapPatch("/api/backlog-items/{id:guid}/sprint", async (
            Guid id,
            AssignItemToSprintRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new AssignItemToSprintCommand(id, request.SprintId);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("AssignItemToSprint")
        .WithTags("Backlog");

        app.MapPost("/api/backlog-items/{id:guid}/subtasks", async (
            Guid id,
            AddSubtaskRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AddSubtaskCommand(id, request.Title), ct);
            return Results.Created($"/api/subtasks/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("AddSubtask")
        .WithTags("Backlog");

        app.MapPatch("/api/subtasks/{id:guid}/toggle", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new ToggleSubtaskCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("ToggleSubtask")
        .WithTags("Backlog");

        app.MapDelete("/api/subtasks/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteSubtaskCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("DeleteSubtask")
        .WithTags("Backlog");

        app.MapPost("/api/backlog-items/{id:guid}/comments", async (
            Guid id,
            AddCommentRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new AddCommentCommand(id, request.Content, request.UserName, request.UserId, request.UserAvatar), ct);
            return Results.Created($"/api/comments/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("AddComment")
        .WithTags("Backlog");

        app.MapDelete("/api/backlog-items/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteBacklogItemCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("DeleteBacklogItem")
        .WithTags("Backlog");
    }
}
