using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Pipelines.UpdatePipeline;

public record UpdatePipelineStageRequest(
    Guid? Id,
    string Name,
    int OrderIndex,
    string? Color,
    int Probability,
    int? SlaHours,
    bool IsWonStage,
    bool IsLostStage,
    string? RoutingRuleOverride);

public record UpdatePipelineCommand(
    Guid Id,
    string Name,
    string? Description,
    string? Color,
    string? Icon,
    bool IsDefault,
    bool IsActive,
    string RoutingStrategy,
    Guid? TargetDepartmentId,
    List<UpdatePipelineStageRequest>? Stages) : ICommand<bool>;

public class UpdatePipelineValidator : AbstractValidator<UpdatePipelineCommand>
{
    public UpdatePipelineValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.RoutingStrategy).NotEmpty().Must(s => new[] { "RoundRobin", "LeastLoaded", "OnlineOnly", "Manual" }.Contains(s));
    }
}

public class UpdatePipelineHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdatePipelineCommand, bool>
{
    public async Task<Result<bool>> Handle(UpdatePipelineCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        var pipeline = await dbContext.Pipelines
            .Include(p => p.Stages)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.Id, cancellationToken);

        if (pipeline == null)
        {
            throw new NotFoundException($"Pipeline {request.Id} not found.");
        }

        if (request.IsDefault && !pipeline.IsDefault)
        {
            var existingDefaults = await dbContext.Pipelines
                .Where(p => p.TenantId == tenantId && p.IsDefault && p.Id != request.Id)
                .ToListAsync(cancellationToken);

            foreach (var p in existingDefaults)
            {
                p.IsDefault = false;
                p.UpdatedAt = DateTime.UtcNow;
            }
        }

        pipeline.Name = request.Name;
        pipeline.Description = request.Description;
        pipeline.Color = request.Color ?? pipeline.Color;
        pipeline.Icon = request.Icon ?? pipeline.Icon;
        pipeline.IsDefault = request.IsDefault;
        pipeline.IsActive = request.IsActive;
        pipeline.RoutingStrategy = request.RoutingStrategy;
        pipeline.TargetDepartmentId = request.TargetDepartmentId;
        pipeline.UpdatedAt = DateTime.UtcNow;

        if (request.Stages != null)
        {
            var requestedStageIds = request.Stages
                .Where(s => s.Id.HasValue && s.Id.Value != Guid.Empty)
                .Select(s => s.Id!.Value)
                .ToHashSet();

            // Remove stages that are not in request and have NO deals attached
            var stagesToRemove = pipeline.Stages
                .Where(s => !requestedStageIds.Contains(s.Id))
                .ToList();

            foreach (var stg in stagesToRemove)
            {
                var hasDeals = await dbContext.Deals.AnyAsync(d => d.StageId == stg.Id, cancellationToken);
                if (!hasDeals)
                {
                    dbContext.PipelineStages.Remove(stg);
                }
            }

            // Update or add stages
            foreach (var s in request.Stages)
            {
                if (s.Id.HasValue && s.Id.Value != Guid.Empty)
                {
                    var existingStage = pipeline.Stages.FirstOrDefault(st => st.Id == s.Id.Value);
                    if (existingStage != null)
                    {
                        existingStage.Name = s.Name;
                        existingStage.OrderIndex = s.OrderIndex;
                        existingStage.Color = s.Color ?? existingStage.Color;
                        existingStage.Probability = s.Probability;
                        existingStage.SlaHours = s.SlaHours;
                        existingStage.IsWonStage = s.IsWonStage;
                        existingStage.IsLostStage = s.IsLostStage;
                        existingStage.RoutingRuleOverride = s.RoutingRuleOverride;
                        existingStage.UpdatedAt = DateTime.UtcNow;
                    }
                }
                else
                {
                    pipeline.Stages.Add(new PipelineStage
                    {
                        TenantId = tenantId,
                        PipelineId = pipeline.Id,
                        Name = s.Name,
                        OrderIndex = s.OrderIndex,
                        Color = s.Color ?? "#6B7280",
                        Probability = s.Probability,
                        SlaHours = s.SlaHours,
                        IsWonStage = s.IsWonStage,
                        IsLostStage = s.IsLostStage,
                        RoutingRuleOverride = s.RoutingRuleOverride,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class UpdatePipelineEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/pipelines/{id:guid}", async (
            Guid id,
            UpdatePipelineCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                return Results.BadRequest(ApiResponse<bool>.Fail("ID mismatch", "BAD_REQUEST"));
            }

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Pipelines.Manage")
        .WithName("UpdatePipeline")
        .WithTags("Pipelines");
    }
}
