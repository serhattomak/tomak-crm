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

namespace CRM.Modules.Customers.Features.Deals.MoveDealStage;

public record MoveDealStageCommand(
    Guid DealId,
    Guid TargetStageId,
    string? WonReason = null,
    string? LostReason = null) : ICommand<bool>;

public class MoveDealStageValidator : AbstractValidator<MoveDealStageCommand>
{
    public MoveDealStageValidator()
    {
        RuleFor(x => x.DealId).NotEmpty();
        RuleFor(x => x.TargetStageId).NotEmpty();
    }
}

public class MoveDealStageHandler(
    CustomersDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<MoveDealStageCommand, bool>
{
    public async Task<Result<bool>> Handle(MoveDealStageCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue || currentTenant.Id.Value == Guid.Empty)
        {
            throw new ForbiddenException("Tenant context is required.");
        }

        var tenantId = currentTenant.Id.Value;
        var now = DateTime.UtcNow;

        var deal = await dbContext.Deals
            .Include(d => d.Stage)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == request.DealId, cancellationToken);

        if (deal == null)
        {
            throw new NotFoundException($"Deal {request.DealId} not found.");
        }

        if (deal.StageId == request.TargetStageId)
        {
            return Result.Success(true);
        }

        var targetStage = await dbContext.PipelineStages
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == request.TargetStageId, cancellationToken);

        if (targetStage == null)
        {
            throw new NotFoundException($"Target stage {request.TargetStageId} not found.");
        }

        var oldStageName = deal.Stage?.Name ?? "Önceki Aşama";
        var newStageName = targetStage.Name;

        deal.StageId = targetStage.Id;
        deal.Stage = targetStage;
        deal.StageEnteredAt = now;
        deal.LastActivityAt = now;
        deal.UpdatedAt = now;

        if (targetStage.IsWonStage)
        {
            deal.Status = "Won";
            deal.WonReason = request.WonReason ?? "Aşama tamamlandı";
            deal.SlaDueDate = null;
        }
        else if (targetStage.IsLostStage)
        {
            deal.Status = "Lost";
            deal.LostReason = request.LostReason ?? "Fırsat kaybedildi";
            deal.SlaDueDate = null;
        }
        else
        {
            deal.Status = "Open";
            deal.SlaDueDate = targetStage.SlaHours.HasValue ? now.AddHours(targetStage.SlaHours.Value) : null;
        }

        dbContext.DealActivities.Add(new DealActivity
        {
            TenantId = tenantId,
            DealId = deal.Id,
            ActivityType = "StageChange",
            Title = "Aşama Değiştirildi",
            Description = $"Fırsat aşaması '{oldStageName}' ➔ '{newStageName}' olarak güncellendi.",
            OldValue = oldStageName,
            NewValue = newStageName,
            CreatedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success(true);
    }
}

public class MoveDealStageEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/deals/{id:guid}/move-stage", async (
            Guid id,
            MoveDealStageCommand command,
            MediatR.ISender sender,
            CancellationToken ct) =>
        {
            if (id != command.DealId)
            {
                return Results.BadRequest(ApiResponse<bool>.Fail("ID mismatch", "BAD_REQUEST"));
            }

            var result = await sender.Send(command, ct);
            return Results.Ok(ApiResponse<bool>.Ok(result.Value));
        })
        .RequireAuthorization()
        .RequirePermission("Deals.Update")
        .WithName("MoveDealStage")
        .WithTags("Deals");
    }
}
