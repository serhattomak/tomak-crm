using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Organization.Data;
using CRM.Modules.Recruitment.Data;
using CRM.Modules.Recruitment.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Recruitment.Features.Requisitions;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
public record RequisitionDto(
    Guid Id,
    Guid TenantId,
    string Title,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? JobPositionId,
    string? JobPositionTitle,
    int Headcount,
    string? EmploymentType,
    string? WorkModel,
    string? Location,
    decimal? MinSalary,
    decimal? MaxSalary,
    string Currency,
    string? Description,
    string? Requirements,
    string Status,
    bool IsPublished,
    DateTime? PublishedAt,
    DateOnly? ClosingDate,
    Guid? HiringManagerId,
    string? HiringManagerName,
    string Priority,
    int ApplicationCount,
    int HiredCount,
    string? HeadcountWarning,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PagedRequisitionsResponse(
    IReadOnlyList<RequisitionDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
public record CreateRequisitionCommand(
    string Title,
    Guid? DepartmentId,
    Guid? JobPositionId,
    int Headcount,
    string? EmploymentType,
    string? WorkModel,
    string? Location,
    decimal? MinSalary,
    decimal? MaxSalary,
    string Currency,
    string? Description,
    string? Requirements,
    DateOnly? ClosingDate,
    Guid? HiringManagerId,
    string Priority) : ICommand<RequisitionDto>;

public class CreateRequisitionValidator : AbstractValidator<CreateRequisitionCommand>
{
    private static readonly string[] ValidEmploymentTypes = [EmploymentType.FullTime, EmploymentType.PartTime, EmploymentType.Contract, EmploymentType.Intern];
    private static readonly string[] ValidWorkModels = [WorkModel.OnSite, WorkModel.Remote, WorkModel.Hybrid];
    private static readonly string[] ValidPriorities = [RequisitionPriority.Low, RequisitionPriority.Medium, RequisitionPriority.High, RequisitionPriority.Urgent];

    public CreateRequisitionValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Headcount).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Priority).NotEmpty().Must(p => ValidPriorities.Contains(p)).WithMessage("Invalid priority.");
        When(x => x.EmploymentType != null, () =>
        {
            RuleFor(x => x.EmploymentType!).Must(v => ValidEmploymentTypes.Contains(v)).WithMessage("Invalid employment_type.");
        });
        When(x => x.WorkModel != null, () =>
        {
            RuleFor(x => x.WorkModel!).Must(v => ValidWorkModels.Contains(v)).WithMessage("Invalid work_model.");
        });
        When(x => x.MinSalary.HasValue && x.MaxSalary.HasValue, () =>
        {
            RuleFor(x => x).Must(x => x.MaxSalary!.Value >= x.MinSalary!.Value).WithMessage("max_salary must be >= min_salary.");
        });
        When(x => x.ClosingDate.HasValue, () =>
        {
            RuleFor(x => x.ClosingDate!.Value)
                .Must(d => d >= DateOnly.FromDateTime(DateTime.UtcNow))
                .WithMessage("closing_date cannot be in the past.");
        });
    }
}

public class CreateRequisitionHandler(
    RecruitmentDbContext dbContext,
    OrganizationDbContext orgContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateRequisitionCommand, RequisitionDto>
{
    public async Task<Result<RequisitionDto>> Handle(CreateRequisitionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        // Closing date in past => 400 (also covered by validator but double-check for race)
        if (request.ClosingDate.HasValue && request.ClosingDate.Value < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            throw new BadRequestException("closing_date cannot be in the past.", "CLOSING_DATE_PAST");
        }

        if (request.DepartmentId.HasValue)
        {
            var exists = await orgContext.Departments.AnyAsync(d => d.Id == request.DepartmentId.Value && d.TenantId == tenantId, cancellationToken);
            if (!exists)
            {
                throw new NotFoundException($"Department with ID '{request.DepartmentId.Value}' was not found.");
            }
        }

        if (request.JobPositionId.HasValue)
        {
            var exists = await orgContext.JobPositions.AnyAsync(p => p.Id == request.JobPositionId.Value && p.TenantId == tenantId, cancellationToken);
            if (!exists)
            {
                throw new NotFoundException($"Job position with ID '{request.JobPositionId.Value}' was not found.");
            }
        }

        if (request.HiringManagerId.HasValue)
        {
            var exists = await orgContext.Employees.AnyAsync(e => e.Id == request.HiringManagerId.Value && e.TenantId == tenantId, cancellationToken);
            if (!exists)
            {
                throw new NotFoundException($"Hiring manager with ID '{request.HiringManagerId.Value}' was not found.");
            }
        }

        var requisition = new JobRequisition
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Title = request.Title.Trim(),
            DepartmentId = request.DepartmentId,
            JobPositionId = request.JobPositionId,
            Headcount = request.Headcount,
            EmploymentType = request.EmploymentType?.Trim(),
            WorkModel = request.WorkModel?.Trim(),
            Location = request.Location?.Trim(),
            MinSalary = request.MinSalary,
            MaxSalary = request.MaxSalary,
            Currency = request.Currency.Trim().ToUpperInvariant(),
            Description = request.Description?.Trim(),
            Requirements = request.Requirements?.Trim(),
            Status = RequisitionStatus.Draft,
            IsPublished = false,
            ClosingDate = request.ClosingDate,
            HiringManagerId = request.HiringManagerId,
            Priority = request.Priority.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.JobRequisitions.Add(requisition);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(MapToDto(requisition, null, null, null, 0, 0));
    }

    private static RequisitionDto MapToDto(JobRequisition r, string? deptName, string? posTitle, string? managerName, int appCount, int hiredCount)
    {
        string? warning = null;
        if (hiredCount >= r.Headcount && r.Headcount > 0)
        {
            warning = $"Headcount limit reached ({hiredCount}/{r.Headcount}). Hiring beyond plan.";
        }

        return new RequisitionDto(
            r.Id, r.TenantId, r.Title, r.DepartmentId, deptName, r.JobPositionId, posTitle, r.Headcount,
            r.EmploymentType, r.WorkModel, r.Location, r.MinSalary, r.MaxSalary, r.Currency, r.Description, r.Requirements,
            r.Status, r.IsPublished, r.PublishedAt, r.ClosingDate, r.HiringManagerId, managerName, r.Priority,
            appCount, hiredCount, warning, r.CreatedAt, r.UpdatedAt);
    }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
public record UpdateRequisitionCommand(
    Guid Id,
    string Title,
    Guid? DepartmentId,
    Guid? JobPositionId,
    int Headcount,
    string? EmploymentType,
    string? WorkModel,
    string? Location,
    decimal? MinSalary,
    decimal? MaxSalary,
    string Currency,
    string? Description,
    string? Requirements,
    DateOnly? ClosingDate,
    Guid? HiringManagerId,
    string Priority) : ICommand<RequisitionDto>;

public class UpdateRequisitionValidator : AbstractValidator<UpdateRequisitionCommand>
{
    private static readonly string[] ValidPriorities = [RequisitionPriority.Low, RequisitionPriority.Medium, RequisitionPriority.High, RequisitionPriority.Urgent];

    public UpdateRequisitionValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Headcount).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Priority).Must(p => ValidPriorities.Contains(p)).WithMessage("Invalid priority.");
        When(x => x.MinSalary.HasValue && x.MaxSalary.HasValue, () =>
        {
            RuleFor(x => x).Must(x => x.MaxSalary!.Value >= x.MinSalary!.Value).WithMessage("max_salary must be >= min_salary.");
        });
    }
}

public class UpdateRequisitionHandler(
    RecruitmentDbContext dbContext,
    OrganizationDbContext orgContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateRequisitionCommand, RequisitionDto>
{
    public async Task<Result<RequisitionDto>> Handle(UpdateRequisitionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var requisition = await dbContext.JobRequisitions
            .FirstOrDefaultAsync(r => r.Id == request.Id && r.TenantId == tenantId, cancellationToken);

        if (requisition == null)
        {
            throw new NotFoundException($"Requisition with ID '{request.Id}' was not found.");
        }

        if (request.DepartmentId.HasValue)
        {
            var exists = await orgContext.Departments.AnyAsync(d => d.Id == request.DepartmentId.Value && d.TenantId == tenantId, cancellationToken);
            if (!exists)
            {
                throw new NotFoundException($"Department with ID '{request.DepartmentId.Value}' was not found.");
            }
        }

        if (request.JobPositionId.HasValue)
        {
            var exists = await orgContext.JobPositions.AnyAsync(p => p.Id == request.JobPositionId.Value && p.TenantId == tenantId, cancellationToken);
            if (!exists)
            {
                throw new NotFoundException($"Job position with ID '{request.JobPositionId.Value}' was not found.");
            }
        }

        if (request.HiringManagerId.HasValue)
        {
            var exists = await orgContext.Employees.AnyAsync(e => e.Id == request.HiringManagerId.Value && e.TenantId == tenantId, cancellationToken);
            if (!exists)
            {
                throw new NotFoundException($"Hiring manager with ID '{request.HiringManagerId.Value}' was not found.");
            }
        }

        requisition.Title = request.Title.Trim();
        requisition.DepartmentId = request.DepartmentId;
        requisition.JobPositionId = request.JobPositionId;
        requisition.Headcount = request.Headcount;
        requisition.EmploymentType = request.EmploymentType?.Trim();
        requisition.WorkModel = request.WorkModel?.Trim();
        requisition.Location = request.Location?.Trim();
        requisition.MinSalary = request.MinSalary;
        requisition.MaxSalary = request.MaxSalary;
        requisition.Currency = request.Currency.Trim().ToUpperInvariant();
        requisition.Description = request.Description?.Trim();
        requisition.Requirements = request.Requirements?.Trim();
        requisition.ClosingDate = request.ClosingDate;
        requisition.HiringManagerId = request.HiringManagerId;
        requisition.Priority = request.Priority.Trim();
        requisition.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var hiredCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == requisition.Id && a.Status == ApplicationStatus.Hired, cancellationToken);
        var appCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == requisition.Id, cancellationToken);

        string? warning = hiredCount >= requisition.Headcount ? $"Headcount limit reached ({hiredCount}/{requisition.Headcount})." : null;

        return Result.Success(new RequisitionDto(
            requisition.Id, requisition.TenantId, requisition.Title, requisition.DepartmentId, null, requisition.JobPositionId, null,
            requisition.Headcount, requisition.EmploymentType, requisition.WorkModel, requisition.Location,
            requisition.MinSalary, requisition.MaxSalary, requisition.Currency, requisition.Description, requisition.Requirements,
            requisition.Status, requisition.IsPublished, requisition.PublishedAt, requisition.ClosingDate,
            requisition.HiringManagerId, null, requisition.Priority, appCount, hiredCount, warning, requisition.CreatedAt, requisition.UpdatedAt));
    }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
public record GetRequisitionsQuery(
    string? Search = null,
    string? Status = null,
    Guid? DepartmentId = null,
    bool? IsPublished = null,
    int Page = 1,
    int PageSize = 20) : IQuery<PagedRequisitionsResponse>;

public class GetRequisitionsHandler(
    RecruitmentDbContext dbContext,
    OrganizationDbContext orgContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetRequisitionsQuery, PagedRequisitionsResponse>
{
    public async Task<Result<PagedRequisitionsResponse>> Handle(GetRequisitionsQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var query = dbContext.JobRequisitions.Where(r => r.TenantId == tenantId).AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(r =>
                r.Title.ToLower().Contains(search) ||
                (r.Location != null && r.Location.ToLower().Contains(search)) ||
                (r.Description != null && r.Description.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(r => r.Status == request.Status);
        }

        if (request.DepartmentId.HasValue)
        {
            query = query.Where(r => r.DepartmentId == request.DepartmentId.Value);
        }

        if (request.IsPublished.HasValue)
        {
            query = query.Where(r => r.IsPublished == request.IsPublished.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 100 ? request.PageSize : 20;

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Batch fetch related names via organization context
        var deptIds = items.Where(i => i.DepartmentId.HasValue).Select(i => i.DepartmentId!.Value).Distinct().ToList();
        var posIds = items.Where(i => i.JobPositionId.HasValue).Select(i => i.JobPositionId!.Value).Distinct().ToList();
        var mgrIds = items.Where(i => i.HiringManagerId.HasValue).Select(i => i.HiringManagerId!.Value).Distinct().ToList();

        var deptMap = deptIds.Count > 0
            ? await orgContext.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.Name, cancellationToken)
            : new Dictionary<Guid, string>();
        var posMap = posIds.Count > 0
            ? await orgContext.JobPositions.Where(p => posIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Title, cancellationToken)
            : new Dictionary<Guid, string>();
        var mgrMap = mgrIds.Count > 0
            ? await orgContext.Employees.Where(e => mgrIds.Contains(e.Id)).ToDictionaryAsync(e => e.Id, e => $"{e.FirstName} {e.LastName}".Trim(), cancellationToken)
            : new Dictionary<Guid, string>();

        // Headcount warning: hired counts per requisition
        var reqIds = items.Select(i => i.Id).ToList();
        var hiredCounts = reqIds.Count > 0
            ? await dbContext.Applications.Where(a => reqIds.Contains(a.RequisitionId) && a.Status == ApplicationStatus.Hired)
                .GroupBy(a => a.RequisitionId)
                .Select(g => new { ReqId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ReqId, x => x.Count, cancellationToken)
            : new Dictionary<Guid, int>();
        var totalAppCounts = reqIds.Count > 0
            ? await dbContext.Applications.Where(a => reqIds.Contains(a.RequisitionId))
                .GroupBy(a => a.RequisitionId)
                .Select(g => new { ReqId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ReqId, x => x.Count, cancellationToken)
            : new Dictionary<Guid, int>();

        var dtos = items.Select(r =>
        {
            hiredCounts.TryGetValue(r.Id, out var hc);
            totalAppCounts.TryGetValue(r.Id, out var ac);
            string? warning = null;
            if (hc >= r.Headcount && r.Headcount > 0)
            {
                warning = $"Headcount limit reached ({hc}/{r.Headcount}).";
            }

            deptMap.TryGetValue(r.DepartmentId ?? Guid.Empty, out var dn);
            posMap.TryGetValue(r.JobPositionId ?? Guid.Empty, out var pn);
            mgrMap.TryGetValue(r.HiringManagerId ?? Guid.Empty, out var mn);

            return new RequisitionDto(
                r.Id, r.TenantId, r.Title, r.DepartmentId, dn, r.JobPositionId, pn, r.Headcount,
                r.EmploymentType, r.WorkModel, r.Location, r.MinSalary, r.MaxSalary, r.Currency, r.Description, r.Requirements,
                r.Status, r.IsPublished, r.PublishedAt, r.ClosingDate, r.HiringManagerId, mn, r.Priority,
                ac, hc, warning, r.CreatedAt, r.UpdatedAt);
        }).ToList();

        return Result.Success(new PagedRequisitionsResponse(dtos, totalCount, page, pageSize));
    }
}

public record GetRequisitionByIdQuery(Guid Id) : IQuery<RequisitionDto>;

public class GetRequisitionByIdHandler(
    RecruitmentDbContext dbContext,
    OrganizationDbContext orgContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetRequisitionByIdQuery, RequisitionDto>
{
    public async Task<Result<RequisitionDto>> Handle(GetRequisitionByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var r = await dbContext.JobRequisitions.FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == tenantId, cancellationToken);
        if (r == null)
        {
            return Result.Failure<RequisitionDto>(new Error("Requisition.NotFound", $"Requisition with ID '{request.Id}' was not found."));
        }

        string? deptName = null;
        string? posTitle = null;
        string? mgrName = null;
        if (r.DepartmentId.HasValue)
        {
            var dept = await orgContext.Departments.FirstOrDefaultAsync(d => d.Id == r.DepartmentId.Value, cancellationToken);
            deptName = dept?.Name;
        }

        if (r.JobPositionId.HasValue)
        {
            var pos = await orgContext.JobPositions.FirstOrDefaultAsync(p => p.Id == r.JobPositionId.Value, cancellationToken);
            posTitle = pos?.Title;
        }

        if (r.HiringManagerId.HasValue)
        {
            var emp = await orgContext.Employees.FirstOrDefaultAsync(e => e.Id == r.HiringManagerId.Value, cancellationToken);
            mgrName = emp != null ? $"{emp.FirstName} {emp.LastName}".Trim() : null;
        }

        var hiredCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == r.Id && a.Status == ApplicationStatus.Hired, cancellationToken);
        var appCount = await dbContext.Applications.CountAsync(a => a.RequisitionId == r.Id, cancellationToken);
        string? warning = hiredCount >= r.Headcount ? $"Headcount limit reached ({hiredCount}/{r.Headcount})." : null;

        return Result.Success(new RequisitionDto(
            r.Id, r.TenantId, r.Title, r.DepartmentId, deptName, r.JobPositionId, posTitle, r.Headcount,
            r.EmploymentType, r.WorkModel, r.Location, r.MinSalary, r.MaxSalary, r.Currency, r.Description, r.Requirements,
            r.Status, r.IsPublished, r.PublishedAt, r.ClosingDate, r.HiringManagerId, mgrName, r.Priority,
            appCount, hiredCount, warning, r.CreatedAt, r.UpdatedAt));
    }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
public record DeleteRequisitionCommand(Guid Id) : ICommand<bool>;

public class DeleteRequisitionHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteRequisitionCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteRequisitionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var requisition = await dbContext.JobRequisitions
            .FirstOrDefaultAsync(r => r.Id == request.Id && r.TenantId == tenantId, cancellationToken);

        if (requisition == null)
        {
            throw new NotFoundException($"Requisition with ID '{request.Id}' was not found.");
        }

        // Cascade will delete linked applications via FK; safe to delete.
        dbContext.JobRequisitions.Remove(requisition);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

// ---------------------------------------------------------------------------
// Publish / Close
// ---------------------------------------------------------------------------
public record PublishRequisitionCommand(Guid Id) : ICommand<RequisitionDto>;

public class PublishRequisitionHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<PublishRequisitionCommand, RequisitionDto>
{
    public async Task<Result<RequisitionDto>> Handle(PublishRequisitionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var r = await dbContext.JobRequisitions.FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == tenantId, cancellationToken);
        if (r == null)
        {
            throw new NotFoundException($"Requisition with ID '{request.Id}' was not found.");
        }

        if (r.ClosingDate.HasValue && r.ClosingDate.Value < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            throw new BadRequestException("closing_date is in the past; cannot publish.", "CLOSING_DATE_PAST");
        }

        if (r.Status == RequisitionStatus.Closed || r.Status == RequisitionStatus.Cancelled)
        {
            throw new BadRequestException($"Cannot publish requisition with status '{r.Status}'.", "INVALID_STATUS");
        }

        r.IsPublished = true;
        r.PublishedAt = DateTime.UtcNow;
        r.Status = RequisitionStatus.Open;
        r.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new RequisitionDto(
            r.Id, r.TenantId, r.Title, r.DepartmentId, null, r.JobPositionId, null, r.Headcount,
            r.EmploymentType, r.WorkModel, r.Location, r.MinSalary, r.MaxSalary, r.Currency, r.Description, r.Requirements,
            r.Status, r.IsPublished, r.PublishedAt, r.ClosingDate, r.HiringManagerId, null, r.Priority,
            0, 0, null, r.CreatedAt, r.UpdatedAt));
    }
}

public record CloseRequisitionCommand(Guid Id) : ICommand<RequisitionDto>;

public class CloseRequisitionHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CloseRequisitionCommand, RequisitionDto>
{
    public async Task<Result<RequisitionDto>> Handle(CloseRequisitionCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var r = await dbContext.JobRequisitions.FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == tenantId, cancellationToken);
        if (r == null)
        {
            throw new NotFoundException($"Requisition with ID '{request.Id}' was not found.");
        }

        r.Status = RequisitionStatus.Closed;
        r.IsPublished = false;
        r.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new RequisitionDto(
            r.Id, r.TenantId, r.Title, r.DepartmentId, null, r.JobPositionId, null, r.Headcount,
            r.EmploymentType, r.WorkModel, r.Location, r.MinSalary, r.MaxSalary, r.Currency, r.Description, r.Requirements,
            r.Status, r.IsPublished, r.PublishedAt, r.ClosingDate, r.HiringManagerId, null, r.Priority,
            0, 0, null, r.CreatedAt, r.UpdatedAt));
    }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
public class RequisitionEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recruitment/requisitions").WithTags("Recruitment - Requisitions");

        group.MapPost("/", async (CreateRequisitionCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<RequisitionDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<RequisitionDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapGet("/", async (
            string? search,
            string? status,
            Guid? departmentId,
            bool? isPublished,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetRequisitionsQuery(search, status, departmentId, isPublished, page ?? 1, pageSize ?? 20);
            var result = await sender.Send(query, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<PagedRequisitionsResponse>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<PagedRequisitionsResponse>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.View");

        group.MapGet("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetRequisitionByIdQuery(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<RequisitionDto>.Ok(result.Value))
                : Results.NotFound(ApiResponse<RequisitionDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.View");

        group.MapPut("/{id:guid}", async (Guid id, UpdateRequisitionCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<RequisitionDto>.Fail("Validation.Error", "Route id and body id must match."));
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<RequisitionDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<RequisitionDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapDelete("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteRequisitionCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapPost("/{id:guid}/publish", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new PublishRequisitionCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<RequisitionDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<RequisitionDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Publish");

        group.MapPost("/{id:guid}/close", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new CloseRequisitionCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<RequisitionDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<RequisitionDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Publish");
    }
}
