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

namespace CRM.Modules.Projects.Features.Projects;

public record ProjectSummaryDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string Key,
    string? Description,
    string Status,
    Guid? LeadUserId,
    string? LeadUserName,
    Guid? CustomerId,
    string? CustomerName,
    decimal Budget,
    string Currency,
    DateTime? StartDate,
    DateTime? TargetEndDate,
    int SprintsCount,
    int ActiveItemsCount,
    int CompletedItemsCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateProjectRequest(
    string Name,
    string Key,
    string? Description = null,
    string? Status = "Active",
    Guid? LeadUserId = null,
    string? LeadUserName = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    decimal Budget = 0.00m,
    string Currency = "TRY",
    DateTime? StartDate = null,
    DateTime? TargetEndDate = null);

public record CreateProjectCommand(
    string Name,
    string Key,
    string? Description,
    string Status,
    Guid? LeadUserId,
    string? LeadUserName,
    Guid? CustomerId,
    string? CustomerName,
    decimal Budget,
    string Currency,
    DateTime? StartDate,
    DateTime? TargetEndDate) : ICommand<Guid>;

public record UpdateProjectRequest(
    string Name,
    string? Description = null,
    string? Status = "Active",
    Guid? LeadUserId = null,
    string? LeadUserName = null,
    Guid? CustomerId = null,
    string? CustomerName = null,
    decimal Budget = 0.00m,
    string Currency = "TRY",
    DateTime? StartDate = null,
    DateTime? TargetEndDate = null);

public record UpdateProjectCommand(
    Guid Id,
    string Name,
    string? Description,
    string Status,
    Guid? LeadUserId,
    string? LeadUserName,
    Guid? CustomerId,
    string? CustomerName,
    decimal Budget,
    string Currency,
    DateTime? StartDate,
    DateTime? TargetEndDate) : ICommand<bool>;

public record DeleteProjectCommand(Guid Id) : ICommand<bool>;

public record GetProjectsQuery(string? Status = null, Guid? CustomerId = null, string? Search = null) : IQuery<IReadOnlyList<ProjectSummaryDto>>;

public class CreateProjectValidator : AbstractValidator<CreateProjectCommand>
{
    public CreateProjectValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Proje adı zorunludur.").MaximumLength(255);
        RuleFor(x => x.Key).NotEmpty().WithMessage("Proje anahtarı zorunludur.").MaximumLength(20);
    }
}

public class GetProjectsHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : IQueryHandler<GetProjectsQuery, IReadOnlyList<ProjectSummaryDto>>
{
    public async Task<Result<IReadOnlyList<ProjectSummaryDto>>> Handle(GetProjectsQuery request, CancellationToken cancellationToken)
    {
        var query = dbContext.Projects.AsNoTracking();

        if (currentTenant.Id.HasValue)
        {
            query = query.Where(p => p.TenantId == currentTenant.Id.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(p => p.Status == request.Status);
        }

        if (request.CustomerId.HasValue)
        {
            query = query.Where(p => p.CustomerId == request.CustomerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(search) || p.Key.ToLower().Contains(search));
        }

        var projects = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectSummaryDto(
                p.Id,
                p.TenantId,
                p.Name,
                p.Key,
                p.Description,
                p.Status,
                p.LeadUserId,
                p.LeadUserName,
                p.CustomerId,
                p.CustomerName,
                p.Budget,
                p.Currency,
                p.StartDate,
                p.TargetEndDate,
                p.Sprints.Count,
                p.Items.Count(i => i.Status != "Done" && i.Status != "Cancelled"),
                p.Items.Count(i => i.Status == "Done"),
                p.CreatedAt,
                p.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<ProjectSummaryDto>>(projects);
    }
}

public class CreateProjectHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<CreateProjectCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var keyUpper = request.Key.Trim().ToUpperInvariant();
        var exists = await dbContext.Projects.AnyAsync(p => p.TenantId == currentTenant.Id.Value && p.Key == keyUpper, cancellationToken);
        if (exists)
        {
            throw new BadRequestException($"'{keyUpper}' proje anahtarı zaten kullanılıyor.");
        }

        var project = new Project
        {
            Id = Guid.NewGuid(),
            TenantId = currentTenant.Id.Value,
            Name = request.Name.Trim(),
            Key = keyUpper,
            Description = request.Description?.Trim(),
            Status = request.Status,
            LeadUserId = request.LeadUserId,
            LeadUserName = request.LeadUserName,
            CustomerId = request.CustomerId,
            CustomerName = request.CustomerName,
            Budget = request.Budget,
            Currency = request.Currency,
            StartDate = request.StartDate,
            TargetEndDate = request.TargetEndDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Projects.Add(project);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(project.Id);
    }
}

public class UpdateProjectHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<UpdateProjectCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdateProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects.FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);
        if (project == null)
        {
            throw new NotFoundException($"Project {request.Id} not found.");
        }

        if (currentTenant.Id.HasValue && project.TenantId != currentTenant.Id.Value)
        {
            throw new ForbiddenException("Unauthorized.");
        }

        project.Name = request.Name.Trim();
        project.Description = request.Description?.Trim();
        project.Status = request.Status;
        project.LeadUserId = request.LeadUserId;
        project.LeadUserName = request.LeadUserName;
        project.CustomerId = request.CustomerId;
        project.CustomerName = request.CustomerName;
        project.Budget = request.Budget;
        project.Currency = request.Currency;
        project.StartDate = request.StartDate;
        project.TargetEndDate = request.TargetEndDate;
        project.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class DeleteProjectHandler(ProjectsDbContext dbContext, ICurrentTenant currentTenant) : ICommandHandler<DeleteProjectCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteProjectCommand request, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects.FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);
        if (project == null)
        {
            throw new NotFoundException($"Project {request.Id} not found.");
        }

        if (currentTenant.Id.HasValue && project.TenantId != currentTenant.Id.Value)
        {
            throw new ForbiddenException("Unauthorized.");
        }

        dbContext.Projects.Remove(project);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class ProjectEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects", async (
            string? status,
            Guid? customerId,
            string? search,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new GetProjectsQuery(status, customerId, search), ct);
            return Results.Ok(ApiResponse<IReadOnlyList<ProjectSummaryDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("GetProjects")
        .WithTags("Projects");

        app.MapGet("/api/projects/{id:guid}", async (
            Guid id,
            ProjectsDbContext dbContext,
            ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            var query = dbContext.Projects.AsNoTracking();
            if (currentTenant.Id.HasValue) query = query.Where(p => p.TenantId == currentTenant.Id.Value);

            var project = await query
                .Where(p => p.Id == id)
                .Select(p => new ProjectSummaryDto(
                    p.Id,
                    p.TenantId,
                    p.Name,
                    p.Key,
                    p.Description,
                    p.Status,
                    p.LeadUserId,
                    p.LeadUserName,
                    p.CustomerId,
                    p.CustomerName,
                    p.Budget,
                    p.Currency,
                    p.StartDate,
                    p.TargetEndDate,
                    p.Sprints.Count,
                    p.Items.Count(i => i.Status != "Done" && i.Status != "Cancelled"),
                    p.Items.Count(i => i.Status == "Done"),
                    p.CreatedAt,
                    p.UpdatedAt))
                .FirstOrDefaultAsync(ct);

            if (project == null) throw new NotFoundException($"Project {id} not found.");
            return Results.Ok(ApiResponse<ProjectSummaryDto>.Ok(project));
        })
        .RequireAuthorization()
        .WithName("GetProjectById")
        .WithTags("Projects");

        app.MapPost("/api/projects", async (
            CreateProjectRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new CreateProjectCommand(
                request.Name,
                request.Key,
                request.Description,
                request.Status ?? "Active",
                request.LeadUserId,
                request.LeadUserName,
                request.CustomerId,
                request.CustomerName,
                request.Budget,
                request.Currency,
                request.StartDate,
                request.TargetEndDate);

            var result = await sender.Send(command, ct);
            return Results.Created($"/api/projects/{result.Value}", ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("CreateProject")
        .WithTags("Projects");

        app.MapPut("/api/projects/{id:guid}", async (
            Guid id,
            UpdateProjectRequest request,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var command = new UpdateProjectCommand(
                id,
                request.Name,
                request.Description,
                request.Status ?? "Active",
                request.LeadUserId,
                request.LeadUserName,
                request.CustomerId,
                request.CustomerName,
                request.Budget,
                request.Currency,
                request.StartDate,
                request.TargetEndDate);

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("UpdateProject")
        .WithTags("Projects");

        app.MapDelete("/api/projects/{id:guid}", async (
            Guid id,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteProjectCommand(id), ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .WithName("DeleteProject")
        .WithTags("Projects");
    }
}
