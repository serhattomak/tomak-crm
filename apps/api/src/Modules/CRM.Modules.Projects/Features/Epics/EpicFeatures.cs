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

namespace CRM.Modules.Projects.Features.Epics;

public record EpicDto(
    Guid Id,
    Guid TenantId,
    Guid ProjectId,
    string Name,
    string? Description,
    string Color,
    string Status,
    DateTime? StartDate,
    DateTime? DueDate,
    int ItemsCount,
    int CompletedItemsCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateEpicRequest(
    string Name,
    string? Description = null,
    string? Color = "purple",
    string? Status = "Active",
    DateTime? StartDate = null,
    DateTime? DueDate = null);

public record CreateEpicCommand(
    Guid ProjectId,
    string Name,
    string? Description,
    string Color,
    string Status,
    DateTime? StartDate,
    DateTime? DueDate) : ICommand<Guid>;

public record UpdateEpicRequest(
    string Name,
    string? Description = null,
    string? Color = "purple",
    string? Status = "Active",
    DateTime? StartDate = null,
    DateTime? DueDate = null);

public record UpdateEpicCommand(
    Guid Id,
    string Name,
    string? Description,
    string Color,
    string Status,
    DateTime? StartDate,
    DateTime? DueDate) : ICommand<bool>;

public record DeleteEpicCommand(Guid Id) : ICommand<bool>;

public record GetEpicsQuery(Guid ProjectId) : IQuery<IReadOnlyList<EpicDto>>;

public class GetEpicsHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : IQueryHandler<GetEpicsQuery, IReadOnlyList<EpicDto>>
{
    public async Task<Result<IReadOnlyList<EpicDto>>> Handle(GetEpicsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Epics.AsNoTracking().Where(e => e.ProjectId == request.ProjectId);
        if (currentTenant.Id.HasValue) query = query.Where(e => e.TenantId == currentTenant.Id.Value);

        var epics = await query
            .OrderBy(e => e.CreatedAt)
            .Select(e => new EpicDto(
                e.Id,
                e.TenantId,
                e.ProjectId,
                e.Name,
                e.Description,
                e.Color,
                e.Status,
                e.StartDate,
                e.DueDate,
                e.Items.Count,
                e.Items.Count(i => i.Status == "Done"),
                e.CreatedAt,
                e.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<EpicDto>>(epics);
    }
}

public class CreateEpicHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<CreateEpicCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateEpicCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty) throw new ForbiddenException("Tenant context required.");

        var epic = new ProjectEpic
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            ProjectId = request.ProjectId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "purple" : request.Color,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Epics.Add(epic);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(epic.Id);
    }
}

public class UpdateEpicHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<UpdateEpicCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateEpicCommand request, CancellationToken cancellationToken)
    {
        var epic = await dbContext.Epics.FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken);
        if (epic == null) throw new NotFoundException($"Epic {request.Id} not found.");
        if (currentTenant.Id.HasValue && epic.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        epic.Name = request.Name.Trim();
        epic.Description = request.Description?.Trim();
        epic.Color = request.Color;
        epic.Status = request.Status;
        epic.StartDate = request.StartDate;
        epic.DueDate = request.DueDate;
        epic.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteEpicHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<DeleteEpicCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteEpicCommand request, CancellationToken cancellationToken)
    {
        var epic = await dbContext.Epics.FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken);
        if (epic == null) throw new NotFoundException($"Epic {request.Id} not found.");
        if (currentTenant.Id.HasValue && epic.TenantId != currentTenant.Id.Value) throw new ForbiddenException("Unauthorized.");

        dbContext.Epics.Remove(epic);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class EpicEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects/{projectId:guid}/epics", async (
            Guid projectId,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetEpicsQuery(projectId), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<EpicDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetEpics")
        .WithTags("Epics");

        app.MapPost("/api/projects/{projectId:guid}/epics", async (
            Guid projectId,
            CreateEpicRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new CreateEpicCommand(
                projectId,
                request.Name,
                request.Description,
                request.Color ?? "purple",
                request.Status ?? "Active",
                request.StartDate,
                request.DueDate);

            var result = await sender.Send(command, ct);
            return Results.Created($"/api/epics/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("CreateEpic")
        .WithTags("Epics");

        app.MapPut("/api/epics/{id:guid}", async (
            Guid id,
            UpdateEpicRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateEpicCommand(
                id,
                request.Name,
                request.Description,
                request.Color ?? "purple",
                request.Status ?? "Active",
                request.StartDate,
                request.DueDate);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("UpdateEpic")
        .WithTags("Epics");

        app.MapDelete("/api/epics/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteEpicCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("DeleteEpic")
        .WithTags("Epics");
    }
}
