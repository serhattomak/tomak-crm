using System.Text.Json;
using CRM.Modules.Automations.Entities;

namespace CRM.Modules.Automations.Services;

public interface IAutomationEngine
{
    Task<AutomationExecutionResult> ExecuteWorkflowAsync(
        AutomationWorkflow workflow,
        string triggerSource,
        string? entityType,
        string? entityId,
        Dictionary<string, object?> contextData,
        bool isSimulation = false,
        CancellationToken cancellationToken = default);

    Task<List<AutomationExecutionResult>> TriggerWorkflowsAsync(
        string triggerType,
        string? entityType,
        string? entityId,
        Dictionary<string, object?> contextData,
        CancellationToken cancellationToken = default);

    bool EvaluateConditions(
        List<WorkflowConditionGroup> conditionGroups,
        Dictionary<string, object?> contextData,
        out string summary);
}

public class AutomationExecutionResult
{
    public Guid WorkflowId { get; set; }
    public string WorkflowName { get; set; } = string.Empty;
    public string Status { get; set; } = "Success"; // Success, Failed, Skipped
    public string ConditionsSummary { get; set; } = string.Empty;
    public int ActionsExecutedCount { get; set; } = 0;
    public int ExecutionDurationMs { get; set; } = 0;
    public List<ExecutionStepLog> StepLogs { get; set; } = new();
    public string? ErrorMessage { get; set; }
}
