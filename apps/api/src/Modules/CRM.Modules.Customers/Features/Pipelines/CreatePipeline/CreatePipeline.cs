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

namespace CRM.Modules.Customers.Features.Pipelines.CreatePipeline;

public record CreatePipelineStageRequest(
    string Name,
    int OrderIndex,
    string? Color,
    int Probability,
    int? SlaHours,
    bool IsWonStage,
    bool IsLostStage,
    string? RoutingRuleOverride);

public record CreatePipelineCommand(
    string Name,
    string Code,
    string? Description,
    string? Color,
    string? Icon,
    bool IsDefault,
    string RoutingStrategy,
    Guid? TargetDepartmentId,
    List<CreatePipelineStageRequest>? Stages) : ICommand<Guid>;

public class CreatePipelineValidator : AbstractValidator<CreatePipelineCommand>
{
    public CreatePipelineValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(100);
        RuleFor(x => x.RoutingStrategy).NotEmpty().Must(s => new[] { "RoundRobin", "LeastLoaded", "OnlineOnly", "Manual" }.Contains(s))
            .WithMessage("Routing strategy must be RoundRobin, LeastLoaded, OnlineOnly, or Manual.");
    }
}

public class CreatePipelineHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreatePipelineCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreatePipelineCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        if (request.IsDefault)
        {
            // Reset other default pipelines
            var existingDefaults = await dbContext.Pipelines
                .Where(p => p.TenantId == tenantId && p.IsDefault)
                .ToListAsync(cancellationToken);

            foreach (var p in existingDefaults)
            {
                p.IsDefault = false;
                p.UpdatedAt = DateTime.UtcNow;
            }
        }

        var pipeline = new Pipeline
        {
            TenantId = tenantId,
            Name = request.Name,
            Code = request.Code.ToLower().Trim().Replace(" ", "_"),
            Description = request.Description,
            Color = request.Color ?? "#3B82F6",
            Icon = request.Icon ?? "Kanban",
            IsDefault = request.IsDefault,
            IsActive = true,
            RoutingStrategy = request.RoutingStrategy,
            TargetDepartmentId = request.TargetDepartmentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.Stages != null && request.Stages.Count > 0)
        {
            foreach (var s in request.Stages)
            {
                pipeline.Stages.Add(new PipelineStage
                {
                    TenantId = tenantId,
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
        else
        {
            // Default stages
            pipeline.Stages.Add(new PipelineStage { TenantId = tenantId, Name = "Yeni Lead", OrderIndex = 0, Color = "#94A3B8", Probability = 10 });
            pipeline.Stages.Add(new PipelineStage { TenantId = tenantId, Name = "İletişime Geçildi", OrderIndex = 1, Color = "#38BDF8", Probability = 30 });
            pipeline.Stages.Add(new PipelineStage { TenantId = tenantId, Name = "Teklif Verildi", OrderIndex = 2, Color = "#F59E0B", Probability = 70 });
            pipeline.Stages.Add(new PipelineStage { TenantId = tenantId, Name = "Kazanıldı", OrderIndex = 3, Color = "#10B981", Probability = 100, IsWonStage = true });
            pipeline.Stages.Add(new PipelineStage { TenantId = tenantId, Name = "Kaybedildi", OrderIndex = 4, Color = "#EF4444", Probability = 0, IsLostStage = true });
        }

        dbContext.Pipelines.Add(pipeline);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success(pipeline.Id);
    }
}

public class CreatePipelineEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/pipelines", async (
            CreatePipelineCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<Guid>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Pipelines.Manage")
        .WithName("CreatePipeline")
        .WithTags("Pipelines");
    }
}
