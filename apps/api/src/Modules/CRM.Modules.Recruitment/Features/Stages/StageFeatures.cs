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

namespace CRM.Modules.Recruitment.Features.Stages;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------
public record StageDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string Slug,
    int SortOrder,
    string ColorHex,
    bool IsDefault,
    string StageType,
    bool IsActive,
    int ApplicationCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record ReorderStagesRequest(
    IReadOnlyList<ReorderStageItem> Items);

public record ReorderStageItem(
    Guid Id,
    int SortOrder);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
public record CreateStageCommand(
    string Name,
    string? Slug,
    string ColorHex,
    string StageType,
    bool IsActive) : ICommand<StageDto>;

public class CreateStageValidator : AbstractValidator<CreateStageCommand>
{
    private static readonly string[] ValidTypes = [StageType.Active, StageType.Hired, StageType.Rejected, StageType.Withdrawn];

    public CreateStageValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ColorHex).NotEmpty().Matches("^#[0-9A-Fa-f]{6}$").WithMessage("color_hex must be a valid hex color like #3B82F6.");
        RuleFor(x => x.StageType).NotEmpty().Must(v => ValidTypes.Contains(v)).WithMessage("Invalid stage_type.");
    }
}

public class CreateStageHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateStageCommand, StageDto>
{
    public async Task<Result<StageDto>> Handle(CreateStageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var slug = string.IsNullOrWhiteSpace(request.Slug) ? Slugify(request.Name) : Slugify(request.Slug);
        var exists = await dbContext.RecruitmentStages.AnyAsync(s => s.TenantId == tenantId && s.Slug == slug, cancellationToken);
        if (exists)
        {
            throw new ConflictException($"Stage with slug '{slug}' already exists.", "DUPLICATE_STAGE_SLUG");
        }

        var maxSort = await dbContext.RecruitmentStages
            .Where(s => s.TenantId == tenantId)
            .MaxAsync(s => (int?)s.SortOrder, cancellationToken) ?? 0;

        var stage = new RecruitmentStage
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Slug = slug,
            SortOrder = maxSort + 1,
            ColorHex = request.ColorHex.Trim().ToUpperInvariant(),
            IsDefault = false,
            StageType = request.StageType.Trim().ToLowerInvariant(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.RecruitmentStages.Add(stage);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(new StageDto(
            stage.Id, stage.TenantId, stage.Name, stage.Slug, stage.SortOrder, stage.ColorHex, stage.IsDefault,
            stage.StageType, stage.IsActive, 0, stage.CreatedAt, stage.UpdatedAt));
    }

    private static string Slugify(string input)
    {
        var s = input.Trim().ToLowerInvariant();
        s = System.Text.RegularExpressions.Regex.Replace(s, @"[^a-z0-9]+", "-");
        s = s.Trim('-');
        return string.IsNullOrWhiteSpace(s) ? Guid.NewGuid().ToString("N")[..8] : s;
    }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
public record UpdateStageCommand(
    Guid Id,
    string Name,
    string? Slug,
    string ColorHex,
    string StageType,
    bool IsActive) : ICommand<StageDto>;

public class UpdateStageValidator : AbstractValidator<UpdateStageCommand>
{
    private static readonly string[] ValidTypes = [StageType.Active, StageType.Hired, StageType.Rejected, StageType.Withdrawn];

    public UpdateStageValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ColorHex).NotEmpty().Matches("^#[0-9A-Fa-f]{6}$").WithMessage("color_hex must be a valid hex color.");
        RuleFor(x => x.StageType).Must(v => ValidTypes.Contains(v)).WithMessage("Invalid stage_type.");
    }
}

public class UpdateStageHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateStageCommand, StageDto>
{
    public async Task<Result<StageDto>> Handle(UpdateStageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var stage = await dbContext.RecruitmentStages
            .FirstOrDefaultAsync(s => s.Id == request.Id && s.TenantId == tenantId, cancellationToken);

        if (stage == null)
        {
            throw new NotFoundException($"Stage with ID '{request.Id}' was not found.");
        }

        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            var newSlug = Slugify(request.Slug);
            if (!string.Equals(newSlug, stage.Slug, StringComparison.OrdinalIgnoreCase))
            {
                var slugExists = await dbContext.RecruitmentStages.AnyAsync(s => s.TenantId == tenantId && s.Slug == newSlug && s.Id != stage.Id, cancellationToken);
                if (slugExists)
                {
                    throw new ConflictException($"Stage with slug '{newSlug}' already exists.", "DUPLICATE_STAGE_SLUG");
                }

                stage.Slug = newSlug;
            }
        }

        stage.Name = request.Name.Trim();
        stage.ColorHex = request.ColorHex.Trim().ToUpperInvariant();
        stage.StageType = request.StageType.Trim().ToLowerInvariant();
        stage.IsActive = request.IsActive;
        stage.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var appCount = await dbContext.Applications.CountAsync(a => a.StageId == stage.Id, cancellationToken);

        return Result.Success(new StageDto(
            stage.Id, stage.TenantId, stage.Name, stage.Slug, stage.SortOrder, stage.ColorHex, stage.IsDefault,
            stage.StageType, stage.IsActive, appCount, stage.CreatedAt, stage.UpdatedAt));
    }

    private static string Slugify(string input)
    {
        var s = input.Trim().ToLowerInvariant();
        s = System.Text.RegularExpressions.Regex.Replace(s, @"[^a-z0-9]+", "-");
        s = s.Trim('-');
        return string.IsNullOrWhiteSpace(s) ? Guid.NewGuid().ToString("N")[..8] : s;
    }
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------
public record ReorderStagesCommand(
    IReadOnlyList<ReorderStageItem> Items) : ICommand<IReadOnlyList<StageDto>>;

public class ReorderStagesValidator : AbstractValidator<ReorderStagesCommand>
{
    public ReorderStagesValidator()
    {
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Id).NotEmpty();
            item.RuleFor(i => i.SortOrder).GreaterThanOrEqualTo(0);
        });
    }
}

public class ReorderStagesHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ReorderStagesCommand, IReadOnlyList<StageDto>>
{
    public async Task<Result<IReadOnlyList<StageDto>>> Handle(ReorderStagesCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var ids = request.Items.Select(i => i.Id).ToList();

        var stages = await dbContext.RecruitmentStages
            .Where(s => s.TenantId == tenantId && ids.Contains(s.Id))
            .ToListAsync(cancellationToken);

        if (stages.Count != ids.Count)
        {
            throw new NotFoundException("One or more stages were not found for this tenant.");
        }

        var orderMap = request.Items.ToDictionary(i => i.Id, i => i.SortOrder);

        await using var tx = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            foreach (var stage in stages)
            {
                stage.SortOrder = orderMap[stage.Id];
                stage.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        var allStages = await dbContext.RecruitmentStages
            .Where(s => s.TenantId == tenantId)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(cancellationToken);

        var appCounts = await dbContext.Applications
            .Where(a => a.TenantId == tenantId && a.StageId != null)
            .GroupBy(a => a.StageId!.Value)
            .Select(g => new { StageId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StageId, x => x.Count, cancellationToken);

        var dtos = allStages.Select(s =>
        {
            appCounts.TryGetValue(s.Id, out var cnt);
            return new StageDto(s.Id, s.TenantId, s.Name, s.Slug, s.SortOrder, s.ColorHex, s.IsDefault, s.StageType, s.IsActive, cnt, s.CreatedAt, s.UpdatedAt);
        }).ToList();

        return Result.Success<IReadOnlyList<StageDto>>(dtos);
    }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
public record GetStagesQuery(
    bool? IsActive = null) : IQuery<IReadOnlyList<StageDto>>;

public class GetStagesHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetStagesQuery, IReadOnlyList<StageDto>>
{
    public async Task<Result<IReadOnlyList<StageDto>>> Handle(GetStagesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var query = dbContext.RecruitmentStages.Where(s => s.TenantId == tenantId).AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(s => s.IsActive == request.IsActive.Value);
        }

        var stages = await query.OrderBy(s => s.SortOrder).ToListAsync(cancellationToken);

        var counts = await dbContext.Applications
            .Where(a => a.TenantId == tenantId && a.StageId != null)
            .GroupBy(a => a.StageId!.Value)
            .Select(g => new { StageId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StageId, x => x.Count, cancellationToken);

        var dtos = stages.Select(s =>
        {
            counts.TryGetValue(s.Id, out var cnt);
            return new StageDto(s.Id, s.TenantId, s.Name, s.Slug, s.SortOrder, s.ColorHex, s.IsDefault, s.StageType, s.IsActive, cnt, s.CreatedAt, s.UpdatedAt);
        }).ToList();

        return Result.Success<IReadOnlyList<StageDto>>(dtos);
    }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
public record DeleteStageCommand(Guid Id) : ICommand<bool>;

public class DeleteStageHandler(
    RecruitmentDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<DeleteStageCommand, bool>
{
    public async Task<Result<bool>> Handle(DeleteStageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var stage = await dbContext.RecruitmentStages
            .FirstOrDefaultAsync(s => s.Id == request.Id && s.TenantId == tenantId, cancellationToken);

        if (stage == null)
        {
            throw new NotFoundException($"Stage with ID '{request.Id}' was not found.");
        }

        if (stage.IsDefault)
        {
            throw new BadRequestException("Default stages cannot be deleted.", "IS_DEFAULT_STAGE");
        }

        var hasApplications = await dbContext.Applications.AnyAsync(a => a.StageId == stage.Id, cancellationToken);
        if (hasApplications)
        {
            throw new BadRequestException("Cannot delete stage with linked applications. Move applications first.", "STAGE_HAS_APPLICATIONS");
        }

        dbContext.RecruitmentStages.Remove(stage);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
public class StageEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recruitment/stages").WithTags("Recruitment - Stages");

        group.MapPost("/", async (CreateStageCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<StageDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<StageDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapGet("/", async (bool? isActive, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new GetStagesQuery(isActive), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<IReadOnlyList<StageDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<IReadOnlyList<StageDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.View");

        group.MapPut("/{id:guid}", async (Guid id, UpdateStageCommand command, MediatR.ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<StageDto>.Fail("Validation.Error", "Route id and body id must match."));
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<StageDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<StageDto>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapDelete("/{id:guid}", async (Guid id, MediatR.ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(new DeleteStageCommand(id), ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<bool>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<bool>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");

        group.MapPut("/reorder", async (ReorderStagesRequest request, MediatR.ISender sender, CancellationToken ct) =>
        {
            var command = new ReorderStagesCommand(request.Items);
            var result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<IReadOnlyList<StageDto>>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<IReadOnlyList<StageDto>>.Fail(result.Error.Code, result.Error.Description));
        }).RequireAuthorization().RequirePermission("Recruitment.Manage");
    }
}
