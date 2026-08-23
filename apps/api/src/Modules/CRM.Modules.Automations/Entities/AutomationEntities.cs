using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;

namespace CRM.Modules.Automations.Entities;

public class AutomationWorkflow : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "General"; // Sales, Support, Customer, Operations, General
    public string Icon { get; set; } = "Zap";
    public string Color { get; set; } = "blue";
    public bool IsActive { get; set; } = true;
    public string TriggerType { get; set; } = string.Empty; // Customer.Created, Order.Created, Order.StatusChanged, Ticket.Created, Ticket.SlaBreached, Deal.StageChanged, Webhook.Inbound
    public string TriggerConfigJson { get; set; } = "{}";
    public string ConditionsJson { get; set; } = "[]";
    public string ActionsJson { get; set; } = "[]";
    public int ExecutionCount { get; set; } = 0;
    public DateTimeOffset? LastExecutedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<AutomationExecution> Executions { get; set; } = new List<AutomationExecution>();

    // Helper deserializers
    public WorkflowTriggerConfig GetTriggerConfig()
    {
        try { return JsonSerializer.Deserialize<WorkflowTriggerConfig>(TriggerConfigJson, JsonDefaults.Options) ?? new(); }
        catch { return new(); }
    }

    public List<WorkflowConditionGroup> GetConditions()
    {
        try { return JsonSerializer.Deserialize<List<WorkflowConditionGroup>>(ConditionsJson, JsonDefaults.Options) ?? new(); }
        catch { return new(); }
    }

    public List<WorkflowActionStep> GetActions()
    {
        try { return JsonSerializer.Deserialize<List<WorkflowActionStep>>(ActionsJson, JsonDefaults.Options) ?? new(); }
        catch { return new(); }
    }
}

public class AutomationExecution : ITenantScopedEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid WorkflowId { get; set; }
    public string WorkflowName { get; set; } = string.Empty;
    public string TriggerSource { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string Status { get; set; } = "Success"; // Success, Failed, Skipped, Running
    public string? EvaluatedConditionsSummary { get; set; }
    public int ActionsExecutedCount { get; set; } = 0;
    public int ExecutionDurationMs { get; set; } = 0;
    public string StepLogsJson { get; set; } = "[]";
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public AutomationWorkflow? Workflow { get; set; }

    public List<ExecutionStepLog> GetStepLogs()
    {
        try { return JsonSerializer.Deserialize<List<ExecutionStepLog>>(StepLogsJson, JsonDefaults.Options) ?? new(); }
        catch { return new(); }
    }
}

// Models for Workflow Configuration

public class WorkflowTriggerConfig
{
    public string? TargetStatus { get; set; }
    public string? TargetPriority { get; set; }
    public string? TargetCategory { get; set; }
    public string? EntityFilter { get; set; }
    public Dictionary<string, string>? AdditionalSettings { get; set; } = new();
}

public class WorkflowConditionGroup
{
    public string LogicalOperator { get; set; } = "AND"; // AND, OR
    public List<WorkflowConditionRule> Rules { get; set; } = new();
}

public class WorkflowConditionRule
{
    public string Field { get; set; } = string.Empty; // e.g. "totalAmount", "tier", "status", "priority", "city"
    public string Operator { get; set; } = "equals"; // equals, notEquals, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual, contains, in, notContains
    public string Value { get; set; } = string.Empty;
    public string FieldType { get; set; } = "string"; // string, number, boolean
}

public class WorkflowActionStep
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Type { get; set; } = "notification"; // notification, updateRecord, createRecord, webhook, delay
    public string Title { get; set; } = "Yeni Aksiyon";
    public int Order { get; set; } = 0;
    public int DelayMinutes { get; set; } = 0;
    public Dictionary<string, object?> Config { get; set; } = new();
}

public class ExecutionStepLog
{
    public string StepId { get; set; } = string.Empty;
    public string StepType { get; set; } = string.Empty;
    public string StepTitle { get; set; } = string.Empty;
    public string Status { get; set; } = "Success"; // Success, Failed, Skipped
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public int ExecutionDurationMs { get; set; } = 0;
    public Dictionary<string, object?>? OutputData { get; set; }
}

public static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
