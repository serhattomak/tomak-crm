using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Projects.Data;
using CRM.Modules.Projects.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Projects.Features.Sprints;

public record SprintDto(
    Guid Id,
    Guid TenantId,
    Guid ProjectId,
    string Name,
    string? Goal,
    DateTime? StartDate,
    DateTime? EndDate,
    string Status,
    int VelocityPoints,
    int CompletedPoints,
    int TotalItemsCount,
    int CompletedItemsCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateSprintRequest(
    string Name,
    string? Goal = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null);

public record CreateSprintCommand(
    Guid ProjectId,
    string Name,
    string? Goal,
    DateTime? StartDate,
    DateTime? EndDate) : ICommand<Guid>;

public record UpdateSprintStatusRequest(string Status);

public record UpdateSprintStatusCommand(Guid Id, string Status) : ICommand<bool>;

public record DeleteSprintCommand(Guid Id) : ICommand<bool>;

public record GetSprintsQuery(Guid ProjectId) : IQuery<IReadOnlyList<SprintDto>>;

public class GetSprintsHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : IQueryHandler<GetSprintsQuery, IReadOnlyList<SprintDto>>
{
    public async Task<Result<IReadOnlyList<SprintDto>>> Handle(GetSprintsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Sprints.AsNoTracking().Where(s => s.ProjectId == request.ProjectId);
        if (currentTenant.Id.HasValue) query = query.Where(s => s.TenantId == currentTenant.Id.Value);

        var sprints = await query
            .OrderBy(s => s.Status == "Active" ? 0 : s.Status == "Planning" ? 1 : 2)
            .ThenByDescending(s => s.StartDate ?? s.CreatedAt)
            .Select(s => new SprintDto(
                s.Id,
                s.TenantId,
                s.ProjectId,
                s.Name,
                s.Goal,
                s.StartDate,
                s.EndDate,
                s.Status,
                s.Items.Sum(i => i.StoryPoints),
                s.Items.Where(i => i.Status == "Done").Sum(i => i.StoryPoints),
                s.Items.Count,
                s.Items.Count(i => i.Status == "Done"),
                s.CreatedAt,
                s.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<SprintDto>>(sprints);
    }
}

public class CreateSprintHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<CreateSprintCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateSprintCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty) throw new ForbiddenException("Tenant context required.");

        var sprint = new ProjectSprint
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            ProjectId = request.ProjectId,
            Name = request.Name.Trim(),
            Goal = request.Goal?.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = "Planning",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Sprints.Add(sprint);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(sprint.Id);
    }
}

public class UpdateSprintStatusHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<UpdateSprintStatusCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateSprintStatusCommand request, CancellationToken cancellationToken)
    {
        var sprint = await dbContext.Sprints.FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
        if (sprint == null) throw new NotFoundException($"Sprint {request.Id} not found.");
        if (currentTenant.Id.HasValue && sprint.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        sprint.Status = request.Status;
        sprint.UpdatedAt = DateTime.UtcNow;

        if (request.Status == "Active" && !sprint.StartDate.HasValue)
        {
            sprint.StartDate = DateTime.UtcNow;
        }

        if (request.Status == "Completed" && !sprint.EndDate.HasValue)
        {
            sprint.EndDate = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteSprintHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<DeleteSprintCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteSprintCommand request, CancellationToken cancellationToken)
    {
        var sprint = await dbContext.Sprints.FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
        if (sprint == null) throw new NotFoundException($"Sprint {request.Id} not found.");
        if (currentTenant.Id.HasValue && sprint.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        // Unlink items in this sprint to backlog
        var items = await dbContext.BacklogItems.Where(i => i.SprintId == request.Id).ToListAsync(cancellationToken);
        foreach (var item in items)
        {
            item.SprintId = null;
        }

        dbContext.Sprints.Remove(sprint);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class SprintEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects/{projectId:guid}/sprints", async (
            Guid projectId,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetSprintsQuery(projectId), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<SprintDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetSprints")
        .WithTags("Sprints");

        app.MapPost("/api/projects/{projectId:guid}/sprints", async (
            Guid projectId,
            CreateSprintRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new CreateSprintCommand(
                projectId,
                request.Name,
                request.Goal,
                request.StartDate,
                request.EndDate);

            var result = await sender.Send(command, ct);
            return Results.Created($"/api/sprints/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("CreateSprint")
        .WithTags("Sprints");

        app.MapPatch("/api/sprints/{id:guid}/status", async (
            Guid id,
            UpdateSprintStatusRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateSprintStatusCommand(id, request.Status);
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("UpdateSprintStatus")
        .WithTags("Sprints");

        app.MapDelete("/api/sprints/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteSprintCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("DeleteSprint")
        .WithTags("Sprints");
    }
}
