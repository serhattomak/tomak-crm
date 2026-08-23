using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Exceptions;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Customers.Data;
using CRM.Modules.Customers.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Customers.Features.Pipelines.GetPipelines;

public record PipelineStageDto(
    Guid Id,
    Guid PipelineId,
    string Name,
    int OrderIndex,
    string? Color,
    int Probability,
    int? SlaHours,
    bool IsWonStage,
    bool IsLostStage,
    string? RoutingRuleOverride,
    int DealsCount,
    decimal DealsTotalValue,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record PipelineDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string Code,
    string? Description,
    string? Color,
    string? Icon,
    bool IsDefault,
    bool IsActive,
    string RoutingStrategy,
    Guid? TargetDepartmentId,
    int TotalDealsCount,
    decimal TotalDealsValue,
    IReadOnlyList<PipelineStageDto> Stages,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GetPipelinesQuery : IQuery<IReadOnlyList<PipelineDto>>;

public class GetPipelinesHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : IQueryHandler<GetPipelinesQuery, IReadOnlyList<PipelineDto>>
{
    public async Task<Result<IReadOnlyList<PipelineDto>>> Handle(GetPipelinesQuery request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;

        // Auto-seed default pipelines if none exist
        var count = await dbContext.Pipelines.CountAsync(p => p.TenantId == tenantId, cancellationToken);
        if (count == 0)
        {
            await SeedDefaultPipelinesAsync(tenantId, cancellationToken);
        }

        var pipelines = await dbContext.Pipelines
            .Where(p => p.TenantId == tenantId)
            .Include(p => p.Stages)
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var pipelineIds = pipelines.Select(p => p.Id).ToList();

        var stageStats = await dbContext.Deals
            .Where(d => d.TenantId == tenantId && pipelineIds.Contains(d.PipelineId) && d.Status == "Open")
            .GroupBy(d => d.StageId)
            .Select(g => new
            {
                StageId = g.Key,
                Count = g.Count(),
                TotalValue = g.Sum(d => d.Value)
            })
            .ToDictionaryAsync(x => x.StageId, x => (x.Count, x.TotalValue), cancellationToken);

        var result = pipelines.Select(p =>
        {
            var orderedStages = p.Stages
                .OrderBy(s => s.OrderIndex)
                .Select(s =>
                {
                    var (dealCount, dealValue) = stageStats.TryGetValue(s.Id, out var stats) ? stats : (0, 0.00m);
                    return new PipelineStageDto(
                        s.Id,
                        s.PipelineId,
                        s.Name,
                        s.OrderIndex,
                        s.Color,
                        s.Probability,
                        s.SlaHours,
                        s.IsWonStage,
                        s.IsLostStage,
                        s.RoutingRuleOverride,
                        dealCount,
                        dealValue,
                        s.CreatedAt,
                        s.UpdatedAt);
                }).ToList();

            var totalCount = orderedStages.Sum(s => s.DealsCount);
            var totalValue = orderedStages.Sum(s => s.DealsTotalValue);

            return new PipelineDto(
                p.Id,
                p.TenantId,
                p.Name,
                p.Code,
                p.Description,
                p.Color,
                p.Icon,
                p.IsDefault,
                p.IsActive,
                p.RoutingStrategy,
                p.TargetDepartmentId,
                totalCount,
                totalValue,
                orderedStages,
                p.CreatedAt,
                p.UpdatedAt);
        }).ToList();

        return Result.Success<IReadOnlyList<PipelineDto>>(result);
    }

    private async Task SeedDefaultPipelinesAsync(Guid tenantId, CancellationToken ct)
    {
        // 1. Sales Pipeline
        var salesPipeline = new Pipeline
        {
            TenantId = tenantId,
            Name = "B2B Satış Hunisi",
            Code = "b2b_sales",
            Description = "Potansiyel müşteri kazanımı, teklif ve satış süreçleri",
            Color = "#3B82F6",
            Icon = "TrendingUp",
            IsDefault = true,
            IsActive = true,
            RoutingStrategy = "RoundRobin",
            Stages =
            [
                new PipelineStage { TenantId = tenantId, Name = "Yeni Lead", OrderIndex = 0, Color = "#94A3B8", Probability = 10, SlaHours = 24 },
                new PipelineStage { TenantId = tenantId, Name = "İletişime Geçildi", OrderIndex = 1, Color = "#38BDF8", Probability = 30, SlaHours = 48 },
                new PipelineStage { TenantId = tenantId, Name = "İhtiyaç Analizi", OrderIndex = 2, Color = "#818CF8", Probability = 50, SlaHours = 72 },
                new PipelineStage { TenantId = tenantId, Name = "Teklif Sunuldu", OrderIndex = 3, Color = "#F59E0B", Probability = 75, SlaHours = 96 },
                new PipelineStage { TenantId = tenantId, Name = "Pazarlık / Karar", OrderIndex = 4, Color = "#EC4899", Probability = 90, SlaHours = 48 },
                new PipelineStage { TenantId = tenantId, Name = "Kazanıldı (Satış)", OrderIndex = 5, Color = "#10B981", Probability = 100, IsWonStage = true },
                new PipelineStage { TenantId = tenantId, Name = "Kaybedildi", OrderIndex = 6, Color = "#EF4444", Probability = 0, IsLostStage = true }
            ]
        };

        // 2. Live Support & Onboarding Pipeline
        var supportPipeline = new Pipeline
        {
            TenantId = tenantId,
            Name = "Canlı Destek & Onboarding",
            Code = "live_support",
            Description = "Canlı destekten gelen talepler ve müşteri adaptasyon süreci",
            Color = "#8B5CF6",
            Icon = "Headset",
            IsDefault = false,
            IsActive = true,
            RoutingStrategy = "LeastLoaded",
            Stages =
            [
                new PipelineStage { TenantId = tenantId, Name = "Gelen Destek Talebi", OrderIndex = 0, Color = "#F97316", Probability = 20, SlaHours = 4 },
                new PipelineStage { TenantId = tenantId, Name = "Temsilci İnceliyor", OrderIndex = 1, Color = "#3B82F6", Probability = 40, SlaHours = 8 },
                new PipelineStage { TenantId = tenantId, Name = "Çözüm / Teklif İletildi", OrderIndex = 2, Color = "#6366F1", Probability = 70, SlaHours = 24 },
                new PipelineStage { TenantId = tenantId, Name = "Başarıyla Çözüldü", OrderIndex = 3, Color = "#10B981", Probability = 100, IsWonStage = true },
                new PipelineStage { TenantId = tenantId, Name = "İptal / Çözülemedi", OrderIndex = 4, Color = "#64748B", Probability = 0, IsLostStage = true }
            ]
        };

        dbContext.Pipelines.AddRange(salesPipeline, supportPipeline);
        await dbContext.SaveChangesAsync(ct);
    }
}

public class GetPipelinesEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/pipelines", async (
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            var query = new GetPipelinesQuery();
            var result = await sender.Send(query, ct);
            return Results.Ok(ApiResponse<IReadOnlyList<PipelineDto>>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Pipelines.View")
        .WithName("GetPipelines")
        .WithTags("Pipelines");
    }
}
