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

namespace CRM.Modules.Recruitment.Features.Candidates;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
public record CandidateDto(
    Guid Id,
    Guid TenantId,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? Phone,
    DateOnly? BirthDate,
    string? Address,
    string Source,
    string[]? Tags,
    string? CvFileUrl,
    string? CvFileName,
    bool ConsentGiven,
    DateTime? ConsentGivenAt,
    string? Notes,
    DateTime? DeletedAt,
    Guid? CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int ApplicationCount);

public record PagedCandidatesResponse(
    IReadOnlyList<CandidateDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
public record CreateCandidateCommand(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    DateOnly? BirthDate,
    string? Address,
    string Source,
    string[]? Tags,
    string? CvFileUrl,
    string? CvFileName,
    bool ConsentGiven,
    string? Notes) : ICommand<CandidateDto>;

public class CreateCandidateValidator : AbstractValidator<CreateCandidateCommand>
{
    private static readonly string[] ValidSources = [CandidateSource.Manual, CandidateSource.CsvImport, CandidateSource.PublicForm, CandidateSource.Referral];

    public CreateCandidateValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.Source).NotEmpty().Must(s => ValidSources.Contains(s)).WithMessage("Invalid source.");
        RuleFor(x => x.ConsentGiven).Equal(true).WithMessage("KVKK consent_given is required.");
        RuleFor(x => x.Phone).MaximumLength(50);
        RuleFor(x => x.Address).MaximumLength(2000);
        RuleFor(x => x.Notes).MaximumLength(4000);
        When(x => x.Tags != null, () =>
        {
            RuleForEach(x => x.Tags!).MaximumLength(50);
        });
    }
}

public class CreateCandidateHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateCandidateCommand, CandidateDto>
{
    public async Task<Result<CandidateDto>> Handle(CreateCandidateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // Duplicate email per tenant where DeletedAt IS NULL -> DUPLICATE_CANDIDATE
        var duplicate = await dbContext.Candidates
            .IgnoreQueryFilters()
            .AnyAsync(c => c.TenantId == tenantId && c.Email.ToLower() == normalizedEmail && c.DeletedAt == null, cancellationToken);

        if (duplicate)
        {
            throw new ConflictException($"Candidate with email '{normalizedEmail}' already exists.", "DUPLICATE_CANDIDATE");
        }

        var candidate = new Candidate
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = normalizedEmail,
            Phone = request.Phone?.Trim(),
            BirthDate = request.BirthDate,
            Address = request.Address?.Trim(),
            Source = request.Source.Trim(),
            Tags = request.Tags?.Select(t => t.Trim()).Where(t => !string.IsNullOrWhiteSpace(t)).ToArray(),
            CvFileUrl = request.CvFileUrl?.Trim(),
            CvFileName = request.CvFileName?.Trim(),
            ConsentGiven = request.ConsentGiven,
            ConsentGivenAt = request.ConsentGiven ? DateTime.UtcNow : null,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.Candidates.Add(candidate);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(MapToDto(candidate, 0));
    }

    private static CandidateDto MapToDto(Candidate c, int appCount) => new(
        c.Id, c.TenantId, c.FirstName, c.LastName, c.FullName, c.Email, c.Phone, c.BirthDate, c.Address,
        c.Source, c.Tags, c.CvFileUrl, c.CvFileName, c.ConsentGiven, c.ConsentGivenAt, c.Notes, c.DeletedAt, c.CreatedBy,
        c.CreatedAt, c.UpdatedAt, appCount);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
public record UpdateCandidateCommand(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    DateOnly? BirthDate,
    string? Address,
    string Source,
    string[]? Tags,
    string? CvFileUrl,
    string? CvFileName,
    bool ConsentGiven,
    string? Notes) : ICommand<CandidateDto>;

public class UpdateCandidateValidator : AbstractValidator<UpdateCandidateCommand>
{
    private static readonly string[] ValidSources = [CandidateSource.Manual, CandidateSource.CsvImport, CandidateSource.PublicForm, CandidateSource.Referral];

    public UpdateCandidateValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);
        RuleFor(x => x.Source).Must(s => ValidSources.Contains(s)).WithMessage("Invalid source.");
    }
}

public class UpdateCandidateHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateCandidateCommand, CandidateDto>
{
    public async Task<Result<CandidateDto>> Handle(UpdateCandidateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var candidate = await dbContext.Candidates.FirstOrDefaultAsync(c => c.Id == request.Id && c.TenantId == tenantId, cancellationToken);

        if (candidate == null)
        {
            throw new NotFoundException($"Candidate with ID '{request.Id}' was not found.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // If email changed, check duplicate guard (exclude self)
        if (!string.Equals(candidate.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
        {
            var duplicate = await dbContext.Candidates
                .IgnoreQueryFilters()
                .AnyAsync(c => c.TenantId == tenantId && c.Email.ToLower() == normalizedEmail && c.Id != request.Id && c.DeletedAt == null, cancellationToken);

            if (duplicate)
            {
                throw new ConflictException($"Candidate with email '{normalizedEmail}' already exists.", "DUPLICATE_CANDIDATE");
            }
        }

        candidate.FirstName = request.FirstName.Trim();
        candidate.LastName = request.LastName.Trim();
        candidate.Email = normalizedEmail;
        candidate.Phone = request.Phone?.Trim();
        candidate.BirthDate = request.BirthDate;
        candidate.Address = request.Address?.Trim();
        candidate.Source = request.Source.Trim();
        candidate.Tags = request.Tags?.Select(t => t.Trim()).Where(t => !string.IsNullOrWhiteSpace(t)).ToArray();
        candidate.CvFileUrl = request.CvFileUrl?.Trim();
        candidate.CvFileName = request.CvFileName?.Trim();
        candidate.ConsentGiven = request.ConsentGiven;
        if (request.ConsentGiven && candidate.ConsentGivenAt == null)
        {
            candidate.ConsentGivenAt = DateTime.UtcNow;
        }

        candidate.Notes = request.Notes?.Trim();
        candidate.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var appCount = await dbContext.Applications.CountAsync(a => a.CandidateId == candidate.Id, cancellationToken);

        return Result.Success(new CandidateDto(
            candidate.Id, candidate.TenantId, candidate.FirstName, candidate.LastName, candidate.FullName, candidate.Email,
            candidate.Phone, candidate.BirthDate, candidate.Address, candidate.Source, candidate.Tags, candidate.CvFileUrl,
            candidate.CvFileName, candidate.ConsentGiven, candidate.ConsentGivenAt, candidate.Notes, candidate.DeletedAt, candidate.CreatedBy,
            candidate.CreatedAt, candidate.UpdatedAt, appCount));
    }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
public record GetCandidatesQuery(
    string? Search = null,
    string? Source = null,
    string? Tag = null,
    int Page = 1,
    int PageSize = 20) : IQuery<PagedCandidatesResponse>;

public class GetCandidatesHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCandidatesQuery, PagedCandidatesResponse>
{
    public async Task<Result<PagedCandidatesResponse>> Handle(GetCandidatesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var query = dbContext.Candidates.Where(c => c.TenantId == tenantId).AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(c =>
                c.FirstName.ToLower().Contains(search) ||
                c.LastName.ToLower().Contains(search) ||
                c.Email.ToLower().Contains(search) ||
                (c.Phone != null && c.Phone.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(request.Source))
        {
            query = query.Where(c => c.Source == request.Source);
        }

        if (!string.IsNullOrWhiteSpace(request.Tag))
        {
            var tag = request.Tag.Trim();
            query = query.Where(c => c.Tags != null && c.Tags.Contains(tag));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var page = request.Page > 0 ? request.Page : 1;
        var pageSize = request.PageSize is > 0 and <= 100 ? request.PageSize : 20;

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var candidateIds = items.Select(c => c.Id).ToList();
        var appCounts = candidateIds.Count > 0
            ? await dbContext.Applications.Where(a => candidateIds.Contains(a.CandidateId))
                .GroupBy(a => a.CandidateId)
                .Select(g => new { CandidateId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CandidateId, x => x.Count, cancellationToken)
            : new Dictionary<Guid, int>();

        var dtos = items.Select(c =>
        {
            appCounts.TryGetValue(c.Id, out var cnt);
            return new CandidateDto(
                c.Id, c.TenantId, c.FirstName, c.LastName, c.FullName, c.Email, c.Phone, c.BirthDate, c.Address,
                c.Source, c.Tags, c.CvFileUrl, c.CvFileName, c.ConsentGiven, c.ConsentGivenAt, c.Notes, c.DeletedAt, c.CreatedBy,
                c.CreatedAt, c.UpdatedAt, cnt);
        }).ToList();

        return Result.Success(new PagedCandidatesResponse(dtos, totalCount, page, pageSize));
    }
}

public record GetCandidateByIdQuery(Guid Id) : IQuery<CandidateDto>;

public class GetCandidateByIdHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetCandidateByIdQuery, CandidateDto>
{
    public async Task<Result<CandidateDto>> Handle(GetCandidateByIdQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var c = await dbContext.Candidates.FirstOrDefaultAsync(x => x.Id == request.Id && x.TenantId == tenantId, cancellationToken);

        if (c == null)
        {
            return Result.Failure<CandidateDto>(new Error("Candidate.NotFound", $"Candidate with ID '{request.Id}' was not found."));
        }

        var appCount = await dbContext.Applications.CountAsync(a => a.CandidateId == c.Id, cancellationToken);

        return Result.Success(new CandidateDto(
            c.Id, c.TenantId, c.FirstName, c.LastName, c.FullName, c.Email, c.Phone, c.BirthDate, c.Address,
            c.Source, c.Tags, c.CvFileUrl, c.CvFileName, c.ConsentGiven, c.ConsentGivenAt, c.Notes, c.DeletedAt, c.CreatedBy,
            c.CreatedAt, c.UpdatedAt, appCount));
    }
}

// ---------------------------------------------------------------------------
// Delete (soft + hard)
// ---------------------------------------------------------------------------
public record DeleteCandidateCommand(Guid Id) : ICommand<bool>;

public class DeleteCandidateHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteCandidateCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteCandidateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var candidate = await dbContext.Candidates.FirstOrDefaultAsync(c => c.Id == request.Id && c.TenantId == tenantId, cancellationToken);

        if (candidate == null)
        {
            throw new NotFoundException($"Candidate with ID '{request.Id}' was not found.");
        }

        // Soft delete: set DeletedAt; HasQueryFilter will subsequently hide it.
        // Note: KVKK anonymization after 2 years handled by background job (phase2 todo).
        candidate.DeletedAt = DateTime.UtcNow;
        candidate.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(true);
    }
}

public record HardDeleteCandidateCommand(Guid Id) : ICommand<bool>;

public class HardDeleteCandidateHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<HardDeleteCandidateCommand, bool>
{
    public async Task<Result<bool>> Handle(HardDeleteCandidateCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        // Bypass soft-delete filter to allow hard delete of already soft-deleted rows
        var candidate = await dbContext.Candidates
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.TenantId == tenantId, cancellationToken);

        if (candidate == null)
        {
            throw new NotFoundException($"Candidate with ID '{request.Id}' was not found.");
        }

        dbContext.Candidates.Remove(candidate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
public class CandidateEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recruitment/candidates").WithTags("Recruitment - Candidates");

        group.MapPost("/", async (CreateCandidateCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<CandidateDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<CandidateDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapGet("/", async (
            string? search,
            string? source,
            string? tag,
            int? page,
            int? pageSize,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetCandidatesQuery(search, source, tag, page ?? 1, pageSize ?? 20);
            var result = await sender.Send(query, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<PagedCandidatesResponse>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<PagedCandidatesResponse>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.View");

        group.MapGet("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetCandidateByIdQuery(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<CandidateDto>.Ok(result.Value))
                : Results.NotFound(ApiResponse<CandidateDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.View");

        group.MapPut("/{id:guid}", async (Guid id, UpdateCandidateCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<CandidateDto>.Fail("Validation.Error", "Route id and body id must match."));
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<CandidateDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<CandidateDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        // Soft delete (DeletedAt set)
        group.MapDelete("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteCandidateCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        // Hard delete — requires ManageCandidates (KVKK)
        group.MapDelete("/{id:guid}/hard", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new HardDeleteCandidateCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.ManageCandidates");
    }
}
