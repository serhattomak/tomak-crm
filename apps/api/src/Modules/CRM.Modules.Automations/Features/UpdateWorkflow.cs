using System.Text.Json;
using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Automations.Data;
using CRM.Modules.Automations.Entities;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Automations.Features;

public record UpdateWorkflowCommand(
    Guid Id,
    string Name,
    string? Description,
    string Category,
    string? Icon,
    string? Color,
    bool IsActive,
    string TriggerType,
    WorkflowTriggerConfig? TriggerConfig,
    List<WorkflowConditionGroup>? Conditions,
    List<WorkflowActionStep>? Actions
) : ICommand<WorkflowSummaryDto>;

public class UpdateWorkflowValidator : AbstractValidator<UpdateWorkflowCommand>
{
    public UpdateWorkflowValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().WithMessage("Akış adı boş bırakılamaz.").MaximumLength(255);
        RuleFor(x => x.TriggerType).NotEmpty().WithMessage("Tetikleyici tipi seçilmelidir.");
        RuleFor(x => x.Category).NotEmpty().WithMessage("Kategori seçilmelidir.");
    }
}

public class UpdateWorkflowHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateWorkflowCommand, WorkflowSummaryDto>
{
    public async Task<Result<WorkflowSummaryDto>> Handle(UpdateWorkflowCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WorkflowSummaryDto>(Error.Unauthorized);
        }

        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);
        if (workflow == null)
        {
            return Result.Failure<WorkflowSummaryDto>(Error.NotFound);
        }

        workflow.Name = request.Name.Trim();
        workflow.Description = request.Description?.Trim();
        workflow.Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category;
        workflow.Icon = string.IsNullOrWhiteSpace(request.Icon) ? "Zap" : request.Icon;
        workflow.Color = string.IsNullOrWhiteSpace(request.Color) ? "blue" : request.Color;
        workflow.IsActive = request.IsActive;
        workflow.TriggerType = request.TriggerType.Trim();
        workflow.TriggerConfigJson = JsonSerializer.Serialize(request.TriggerConfig ?? new(), JsonDefaults.Options);
        workflow.ConditionsJson = JsonSerializer.Serialize(request.Conditions ?? new(), JsonDefaults.Options);
        workflow.ActionsJson = JsonSerializer.Serialize(request.Actions ?? new(), JsonDefaults.Options);
        workflow.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = new WorkflowSummaryDto
        {
            Id = workflow.Id,
            Name = workflow.Name,
            Description = workflow.Description,
            Category = workflow.Category,
            Icon = workflow.Icon,
            Color = workflow.Color,
            IsActive = workflow.IsActive,
            TriggerType = workflow.TriggerType,
            ConditionsCount = (request.Conditions ?? new()).Sum(g => g.Rules.Count),
            ActionsCount = (request.Actions ?? new()).Count,
            ExecutionCount = workflow.ExecutionCount,
            LastExecutedAt = workflow.LastExecutedAt,
            CreatedAt = workflow.CreatedAt,
            UpdatedAt = workflow.UpdatedAt
        };

        return Result.Success(dto);
    }
}

public class UpdateWorkflowEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/automations/{id:guid}", async (Guid id, UpdateWorkflowCommand command, ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                command = command with { Id = id };
            }

            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Ok(ApiResponse<WorkflowSummaryDto>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<WorkflowSummaryDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("UpdateWorkflow")
        .WithTags("Automations")
        .RequirePermission("Automations.Manage");
    }
}
