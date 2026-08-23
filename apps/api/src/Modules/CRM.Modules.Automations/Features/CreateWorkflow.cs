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

namespace CRM.Modules.Automations.Features;

public record CreateWorkflowCommand(
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

public class CreateWorkflowValidator : AbstractValidator<CreateWorkflowCommand>
{
    public CreateWorkflowValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Akış adı boş bırakılamaz.").MaximumLength(255);
        RuleFor(x => x.TriggerType).NotEmpty().WithMessage("Tetikleyici tipi seçilmelidir.");
        RuleFor(x => x.Category).NotEmpty().WithMessage("Kategori seçilmelidir.");
    }
}

public class CreateWorkflowHandler(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateWorkflowCommand, WorkflowSummaryDto>
{
    public async Task<Result<WorkflowSummaryDto>> Handle(CreateWorkflowCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WorkflowSummaryDto>(Error.Unauthorized);
        }

        var workflow = new AutomationWorkflow
        {
            TenantId = currentTenant.Id.Value,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category,
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "Zap" : request.Icon,
            Color = string.IsNullOrWhiteSpace(request.Color) ? "blue" : request.Color,
            IsActive = request.IsActive,
            TriggerType = request.TriggerType.Trim(),
            TriggerConfigJson = JsonSerializer.Serialize(request.TriggerConfig ?? new(), JsonDefaults.Options),
            ConditionsJson = JsonSerializer.Serialize(request.Conditions ?? new(), JsonDefaults.Options),
            ActionsJson = JsonSerializer.Serialize(request.Actions ?? new(), JsonDefaults.Options),
            ExecutionCount = 0,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Workflows.Add(workflow);
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
            ExecutionCount = 0,
            CreatedAt = workflow.CreatedAt,
            UpdatedAt = workflow.UpdatedAt
        };

        return Result.Success(dto);
    }
}

public class CreateWorkflowEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/automations", async (CreateWorkflowCommand command, ISender sender, CancellationToken ct) =>
        {
            var result = await sender.Send(command, ct);
            return result.IsSuccess ? Results.Created($"/api/automations/{result.Value.Id}", ApiResponse<WorkflowSummaryDto>.Ok(result.Value))
                                    : Results.BadRequest(ApiResponse<WorkflowSummaryDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("CreateWorkflow")
        .WithTags("Automations")
        .RequirePermission("Automations.Create");
    }
}
