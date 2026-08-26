using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Recruitment.Data;
using CRM.Modules.Recruitment.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Recruitment.Features.Applications;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
public record ApplicationDto(
    Guid Id,
    Guid TenantId,
    Guid CandidateId,
    string CandidateName,
    string CandidateEmail,
    Guid RequisitionId,
    string RequisitionTitle,
    Guid? StageId,
    string? StageName,
    string? StageColorHex,
    string Status,
    decimal? Score,
    string? Notes,
    string? HeadcountWarning,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedApplicationsResponse(
    IReadOnlyList<ApplicationDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
public record CreateApplicationCommand(
    Guid CandidateId,
    Guid RequisitionId,
    Guid? StageId,
    decimal? Score,
    string? Notes) : ICommand<ApplicationDto>;

public class CreateApplicationValidator : AbstractValidator<CreateApplicationCommand>
{
    public CreateApplicationValidator()
    {
        RuleFor(x => x.CandidateId).NotEmpty();
        RuleFor(x => x.RequisitionId).NotEmpty();
        When(x => x.Score.HasValue, () =>
        {
            RuleFor(x => x.Score!.Value).InclusiveBetween(0, 100);
        });
    }
}

public class CreateApplicationHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateApplicationCommand, ApplicationDto>
{
    public async Task<Result<ApplicationDto>> Handle(CreateApplicationCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var requisition = await dbContext.JobRequisitions
            .FirstOrDefaultAsync(r => r.Id == request.RequisitionId && r.TenantId == tenantId, cancellationToken);

        if (requisition == null)
        {
            throw new NotFoundException($"Requisition with ID '{request.RequisitionId}' was not found.");
        }

        // Closed requisition rejects new applications
        if (requisition.Status == RequisitionStatus.Closed)
        {
            throw new BadRequestException("Cannot apply to a closed requisition.", "REQUISITION_CLOSED");
        }

        // closing_date in past => 400
        if (requisition.ClosingDate.HasValue && requisition.ClosingDate.Value < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            throw new BadRequestException("Requisition closing date has passed.", "CLOSING_DATE_PAST");
        }

        var candidate = await dbContext.Candidates
            .FirstOrDefaultAsync(c => c.Id == request.CandidateId && c.TenantId == tenantId, cancellationToken);

        if (candidate == null)
        {
            throw new NotFoundException($"Candidate with ID '{request.CandidateId}' was not found.");
        }

        // Unique candidate+requisition guard
        var alreadyApplied = await dbContext.Applications
            .AnyAsync(a => a.CandidateId == request.CandidateId && a.RequisitionId == request.RequisitionId, cancellationToken);

        if (alreadyApplied)
        {
            throw new ConflictException("Candidate has already applied to this requisition.", "DUPLICATE_APPLICATION");
        }

        // Validate stage if provided; otherwise pick first active stage (lowest sort_order)
        Guid? stageId = request.StageId;
        RecruitmentStage? stage = null;

        if (stageId.HasValue)
        {
            stage = await dbContext.RecruitmentStages
                .FirstOrDefaultAsync(s => s.Id == stageId.Value && s.TenantId == tenantId, cancellationToken);
            if (stage == null)
            {
                throw new NotFoundException($"Stage with ID '{stageId.Value}' was not found.");
            }
        }
        else
        {
            stage = await dbContext.RecruitmentStages
                .Where(s => s.TenantId == tenantId && s.IsActive)
                .OrderBy(s => s.SortOrder)
                .FirstOrDefaultAsync(cancellationToken);
            stageId = stage?.Id;
        }

        // Map stage_type to application status (denormalized)
        var status = MapStageTypeToStatus(stage?.StageType);

        var application = new Application
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CandidateId = request.CandidateId,
            RequisitionId = request.RequisitionId,
            StageId = stageId,
            Status = status,
            Score = request.Score,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Applications.Add(application);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Headcount warning (not blocking)
        string? warning = null;
        if (status == ApplicationStatus.Hired)
        {
            var hiredCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == requisition.Id && a.Status == ApplicationStatus.Hired, cancellationToken);
            if (hiredCount >= requisition.Headcount)
            {
                warning = $"Headcount limit reached ({hiredCount}/{requisition.Headcount}). Hired beyond plan.";
            }
        }
        else
        {
            var hiredCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == requisition.Id && a.Status == ApplicationStatus.Hired, cancellationToken);
            if (hiredCount >= requisition.Headcount)
            {
                warning = $"Headcount full ({hiredCount}/{requisition.Headcount}). New hire will exceed plan.";
            }
        }

        return Result.Success(new ApplicationDto(
            application.Id, application.TenantId, application.CandidateId, candidate.FullName, candidate.Email,
            application.RequisitionId, requisition.Title, application.StageId, stage?.Name, stage?.ColorHex,
            application.Status, application.Score, application.Notes, warning, application.CreatedAt, application.UpdatedAt));
    }

    private static string MapStageTypeToStatus(string? stageType) => stageType switch
    {
        StageType.Hired => ApplicationStatus.Hired,
        StageType.Rejected => ApplicationStatus.Rejected,
        StageType.Withdrawn => ApplicationStatus.Withdrawn,
        _ => ApplicationStatus.Active
    };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
public record UpdateApplicationCommand(
    Guid Id,
    decimal? Score,
    string? Notes) : ICommand<ApplicationDto>;

public class UpdateApplicationValidator : AbstractValidator<UpdateApplicationCommand>
{
    public UpdateApplicationValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        When(x => x.Score.HasValue, () =>
        {
            RuleFor(x => x.Score!.Value).InclusiveBetween(0, 100);
        });
    }
}

public class UpdateApplicationHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateApplicationCommand, ApplicationDto>
{
    public async Task<Result<ApplicationDto>> Handle(UpdateApplicationCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var app = await dbContext.Applications
            .Include(a => a.Candidate)
            .Include(a => a.Requisition)
            .Include(a => a.Stage)
            .FirstOrDefaultAsync(a => a.Id == request.Id && a.TenantId == tenantId, cancellationToken);

        if (app == null)
        {
            throw new NotFoundException($"Application with ID '{request.Id}' was not found.");
        }

        app.Score = request.Score;
        app.Notes = request.Notes?.Trim();
        app.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        // Headcount warning
        string? warning = null;
        if (app.Requisition != null)
        {
            var hiredCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == app.RequisitionId && a.Status == ApplicationStatus.Hired, cancellationToken);
            if (hiredCount >= app.Requisition.Headcount)
            {
                warning = $"Headcount limit reached ({hiredCount}/{app.Requisition.Headcount}).";
            }
        }

        return Result.Success(new ApplicationDto(
            app.Id, app.TenantId, app.CandidateId, app.Candidate?.FullName ?? "Aday", app.Candidate?.Email ?? "",
            app.RequisitionId, app.Requisition?.Title ?? "İlan", app.StageId, app.Stage?.Name, app.Stage?.ColorHex,
            app.Status, app.Score, app.Notes, warning, app.CreatedAt, app.UpdatedAt));
    }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
public record GetApplicationsQuery(
    Guid? RequisitionId = null,
    Guid? StageId = null,
    Guid? CandidateId = null,
    int Page = 1,
    int PageSize = 20) : IQuery<PagedApplicationsResponse>;

public class GetApplicationsHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetApplicationsQuery, PagedApplicationsResponse>
{
    public async Task<Result<PagedApplicationsResponse>> Handle(GetApplicationsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var query = dbContext.Applications
            .Include(a => a.Candidate)
            .Include(a => a.Requisition)
            .Include(a => a.Stage)
            .Where(a => a.TenantId == tenantId)
            .AsQueryable();

        if (request.RequisitionId.HasValue)
        {
            query = query.Where(a => a.RequisitionId == request.RequisitionId.Value);
        }

        if (request.StageId.HasValue)
        {
            query = query.Where(a => a.StageId == request.StageId.Value);
        }

        if (request.CandidateId.HasValue)
        {
            query = query.Where(a => a.CandidateId == request.CandidateId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 100 ? request.PageSize : 20;

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Headcount warning map per requisition
        var reqIds = items.Select(i => i.RequisitionId).Distinct().ToList();
        var reqMap = reqIds.Count > 0
            ? await dbContext.JobRequisitions.Where(r => reqIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id, r => r, cancellationToken)
            : new Dictionary<Guid, JobRequisition>();
        var hiredCounts = reqIds.Count > 0
            ? await dbContext.Applications.Where(a => reqIds.Contains(a.RequisitionId) && a.Status == ApplicationStatus.Hired)
                .GroupBy(a => a.RequisitionId)
                .Select(g => new { ReqId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ReqId, x => x.Count, cancellationToken)
            : new Dictionary<Guid, int>();

        var dtos = items.Select(a =>
        {
            string? warning = null;
            if (reqMap.TryGetValue(a.RequisitionId, out var req))
            {
                hiredCounts.TryGetValue(a.RequisitionId, out var hc);
                if (hc >= req.Headcount)
                {
                    warning = $"Headcount limit reached ({hc}/{req.Headcount}).";
                }
            }

            return new ApplicationDto(
                a.Id, a.TenantId, a.CandidateId, a.Candidate?.FullName ?? "Aday", a.Candidate?.Email ?? "",
                a.RequisitionId, a.Requisition?.Title ?? "İlan", a.StageId, a.Stage?.Name, a.Stage?.ColorHex,
                a.Status, a.Score, a.Notes, warning, a.CreatedAt, a.UpdatedAt);
        }).ToList();

        return Result.Success(new PagedApplicationsResponse(dtos, totalCount, page, pageSize));
    }
}

public record GetApplicationByIdQuery(Guid Id) : IQuery<ApplicationDto>;

public class GetApplicationByIdHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetApplicationByIdQuery, ApplicationDto>
{
    public async Task<Result<ApplicationDto>> Handle(GetApplicationByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var a = await dbContext.Applications
            .Include(x => x.Candidate)
            .Include(x => x.Requisition)
            .Include(x => x.Stage)
            .FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == tenantId, cancellationToken);

        if (a == null)
        {
            return Result.Failure<ApplicationDto>(new Error("Application.NotFound", $"Application with ID '{request.Id}' was not found."));
        }

        string? warning = null;
        if (a.Requisition != null)
        {
            var hiredCount = await dbContext.Applications.CountAsync(x => x.RequisitionId == a.RequisitionId && x.Status == ApplicationStatus.Hired, cancellationToken);
            if (hiredCount >= a.Requisition.Headcount)
            {
                warning = $"Headcount limit reached ({hiredCount}/{a.Requisition.Headcount}).";
            }
        }

        return Result.Success(new ApplicationDto(
            a.Id, a.TenantId, a.CandidateId, a.Candidate?.FullName ?? "Aday", a.Candidate?.Email ?? "",
            a.RequisitionId, a.Requisition?.Title ?? "İlan", a.StageId, a.Stage?.Name, a.Stage?.ColorHex,
            a.Status, a.Score, a.Notes, warning, a.CreatedAt, a.UpdatedAt));
    }
}

// ---------------------------------------------------------------------------
// MoveStage
// ---------------------------------------------------------------------------
public record MoveApplicationStageCommand(
    Guid Id,
    Guid StageId) : ICommand<ApplicationDto>;

public class MoveApplicationStageValidator : AbstractValidator<MoveApplicationStageCommand>
{
    public MoveApplicationStageValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.StageId).NotEmpty();
    }
}

public class MoveApplicationStageHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<MoveApplicationStageCommand, ApplicationDto>
{
    public async Task<Result<ApplicationDto>> Handle(MoveApplicationStageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var app = await dbContext.Applications
            .Include(a => a.Candidate)
            .Include(a => a.Requisition)
            .FirstOrDefaultAsync(a => a.Id == request.Id && a.TenantId == tenantId, cancellationToken);

        if (app == null)
        {
            throw new NotFoundException($"Application with ID '{request.Id}' was not found.");
        }

        var stage = await dbContext.RecruitmentStages
            .FirstOrDefaultAsync(s => s.Id == request.StageId && s.TenantId == tenantId, cancellationToken);

        if (stage == null)
        {
            throw new NotFoundException($"Stage with ID '{request.StageId}' was not found.");
        }

        // Re-validate requisition closing (if moving to active/hired, closing still blocks? Keep consistent)
        if (app.Requisition != null && app.Requisition.ClosingDate.HasValue && app.Requisition.ClosingDate.Value < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            // Allow move but warn? Spec says closing_date blocks new applications only; move is OK.
        }

        app.StageId = stage.Id;
        app.Status = stage.StageType switch
        {
            StageType.Hired => ApplicationStatus.Hired,
            StageType.Rejected => ApplicationStatus.Rejected,
            StageType.Withdrawn => ApplicationStatus.Withdrawn,
            _ => ApplicationStatus.Active
        };
        app.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        // Headcount warning (non-blocking)
        string? warning = null;
        if (app.Requisition != null)
        {
            var hiredCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == app.RequisitionId && a.Status == ApplicationStatus.Hired, cancellationToken);
            if (hiredCount >= app.Requisition.Headcount)
            {
                warning = $"Headcount limit reached ({hiredCount}/{app.Requisition.Headcount}). Hired beyond plan.";
            }
        }

        // Reload stage for color/name
        var stageReload = await dbContext.RecruitmentStages.FirstOrDefaultAsync(s => s.Id == stage.Id, cancellationToken);

        return Result.Success(new ApplicationDto(
            app.Id, app.TenantId, app.CandidateId, app.Candidate?.FullName ?? "Aday", app.Candidate?.Email ?? "",
            app.RequisitionId, app.Requisition?.Title ?? "İlan", app.StageId, stageReload?.Name, stageReload?.ColorHex,
            app.Status, app.Score, app.Notes, warning, app.CreatedAt, app.UpdatedAt));
    }
}

// ---------------------------------------------------------------------------
// Delete (optional - hard cascade)
// ---------------------------------------------------------------------------
public record DeleteApplicationCommand(Guid Id) : ICommand<bool>;

public class DeleteApplicationHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteApplicationCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteApplicationCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var app = await dbContext.Applications.FirstOrDefaultAsync(a => a.Id == request.Id && a.TenantId == tenantId, cancellationToken);
        if (app == null)
        {
            throw new NotFoundException($"Application with ID '{request.Id}' was not found.");
        }

        dbContext.Applications.Remove(app);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
public class ApplicationEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recruitment/applications").WithTags("Recruitment - Applications");

        group.MapPost("/", async (CreateApplicationCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ApplicationDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ApplicationDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapGet("/", async (
            Guid? requisitionId,
            Guid? stageId,
            Guid? candidateId,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetApplicationsQuery(requisitionId, stageId, candidateId, page ?? 1, pageSize ?? 20);
            var result = await sender.Send(query, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<PagedApplicationsResponse>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<PagedApplicationsResponse>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.View");

        group.MapGet("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetApplicationByIdQuery(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ApplicationDto>.Ok(result.Value))
                : Results.NotFound(ApiResponse<ApplicationDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.View");

        group.MapPut("/{id:guid}", async (Guid id, UpdateApplicationCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<ApplicationDto>.Fail("Validation.Error", "Route id and body id must match."));
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ApplicationDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ApplicationDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapPost("/{id:guid}/move", async (Guid id, MoveApplicationStageCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<ApplicationDto>.Fail("Validation.Error", "Route id and body id must match."));
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<ApplicationDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<ApplicationDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapDelete("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteApplicationCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");
    }
}
