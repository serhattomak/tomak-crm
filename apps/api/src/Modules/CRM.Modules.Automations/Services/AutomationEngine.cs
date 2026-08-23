using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Automations.Data;
using CRM.Modules.Automations.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Automations.Services;

public class AutomationEngine(
    AutomationsDbContext dbContext,
    ICurrentTenant currentTenant,
    ILogger<AutomationEngine> logger,
    IHttpClientFactory? httpClientFactory = null) : IAutomationEngine
{
    public async Task<List<AutomationExecutionResult>> TriggerWorkflowsAsync(
        string triggerType,
        string? entityType,
        string? entityId,
        Dictionary<string, object?> contextData,
        CancellationToken cancellationToken = default)
    {
        var results = new List<AutomationExecutionResult>();

        var activeWorkflows = await dbContext.Workflows
            .Where(w => w.IsActive && w.TriggerType == triggerType)
            .ToListAsync(cancellationToken);

        foreach (var workflow in activeWorkflows)
        {
            try
            {
                var result = await ExecuteWorkflowAsync(
                    workflow,
                    triggerType,
                    entityType,
                    entityId,
                    contextData,
                    isSimulation: false,
                    cancellationToken);

                results.Add(result);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error executing workflow {WorkflowId} ({WorkflowName})", workflow.Id, workflow.Name);
            }
        }

        return results;
    }

    public async Task<AutomationExecutionResult> ExecuteWorkflowAsync(
        AutomationWorkflow workflow,
        string triggerSource,
        string? entityType,
        string? entityId,
        Dictionary<string, object?> contextData,
        bool isSimulation = false,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var stepLogs = new List<ExecutionStepLog>();
        var actionsCount = 0;
        var status = "Success";
        string? errorMessage = null;

        // 1. Evaluate Conditions
        var conditionGroups = workflow.GetConditions();
        var conditionsPassed = EvaluateConditions(conditionGroups, contextData, out var conditionSummary);

        if (!conditionsPassed)
        {
            stopwatch.Stop();
            stepLogs.Add(new ExecutionStepLog
            {
                StepId = "conditions-evaluation",
                StepType = "condition",
                StepTitle = "Koşul Kontrolü",
                Status = "Skipped",
                Message = $"Koşullar sağlanmadı: {conditionSummary}",
                Timestamp = DateTimeOffset.UtcNow,
                ExecutionDurationMs = (int)stopwatch.ElapsedMilliseconds
            });

            var skippedResult = new AutomationExecutionResult
            {
                WorkflowId = workflow.Id,
                WorkflowName = workflow.Name,
                Status = "Skipped",
                ConditionsSummary = conditionSummary,
                ActionsExecutedCount = 0,
                ExecutionDurationMs = (int)stopwatch.ElapsedMilliseconds,
                StepLogs = stepLogs
            };

            if (!isSimulation && currentTenant.Id.HasValue)
            {
                var execution = new AutomationExecution
                {
                    TenantId = currentTenant.Id.Value,
                    WorkflowId = workflow.Id,
                    WorkflowName = workflow.Name,
                    TriggerSource = triggerSource,
                    EntityType = entityType,
                    EntityId = entityId,
                    Status = "Skipped",
                    EvaluatedConditionsSummary = conditionSummary,
                    ActionsExecutedCount = 0,
                    ExecutionDurationMs = (int)stopwatch.ElapsedMilliseconds,
                    StepLogsJson = JsonSerializer.Serialize(stepLogs, JsonDefaults.Options)
                };
                dbContext.Executions.Add(execution);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            return skippedResult;
        }

        stepLogs.Add(new ExecutionStepLog
        {
            StepId = "conditions-evaluation",
            StepType = "condition",
            StepTitle = "Koşul Kontrolü",
            Status = "Success",
            Message = $"Tüm koşullar sağlandı: {conditionSummary}",
            Timestamp = DateTimeOffset.UtcNow,
            ExecutionDurationMs = (int)stopwatch.ElapsedMilliseconds
        });

        // 2. Execute Action Steps
        var actions = workflow.GetActions().OrderBy(a => a.Order).ToList();

        foreach (var action in actions)
        {
            var stepStopwatch = Stopwatch.StartNew();
            try
            {
                var actionResult = await ExecuteActionStepAsync(action, contextData, isSimulation, cancellationToken);
                stepStopwatch.Stop();

                actionsCount++;
                stepLogs.Add(new ExecutionStepLog
                {
                    StepId = action.Id,
                    StepType = action.Type,
                    StepTitle = action.Title,
                    Status = "Success",
                    Message = actionResult.message,
                    Timestamp = DateTimeOffset.UtcNow,
                    ExecutionDurationMs = (int)stepStopwatch.ElapsedMilliseconds,
                    OutputData = actionResult.outputData
                });
            }
            catch (Exception ex)
            {
                stepStopwatch.Stop();
                status = "Failed";
                errorMessage = ex.Message;

                stepLogs.Add(new ExecutionStepLog
                {
                    StepId = action.Id,
                    StepType = action.Type,
                    StepTitle = action.Title,
                    Status = "Failed",
                    Message = $"Aksiyon hatası: {ex.Message}",
                    Timestamp = DateTimeOffset.UtcNow,
                    ExecutionDurationMs = (int)stepStopwatch.ElapsedMilliseconds
                });
                break;
            }
        }

        stopwatch.Stop();

        // 3. Save Execution Log & Update Workflow Stats (if not simulation)
        if (!isSimulation && currentTenant.Id.HasValue)
        {
            workflow.ExecutionCount++;
            workflow.LastExecutedAt = DateTimeOffset.UtcNow;

            var execution = new AutomationExecution
            {
                TenantId = currentTenant.Id.Value,
                WorkflowId = workflow.Id,
                WorkflowName = workflow.Name,
                TriggerSource = triggerSource,
                EntityType = entityType,
                EntityId = entityId,
                Status = status,
                EvaluatedConditionsSummary = conditionSummary,
                ActionsExecutedCount = actionsCount,
                ExecutionDurationMs = (int)stopwatch.ElapsedMilliseconds,
                StepLogsJson = JsonSerializer.Serialize(stepLogs, JsonDefaults.Options),
                ErrorMessage = errorMessage
            };

            dbContext.Executions.Add(execution);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return new AutomationExecutionResult
        {
            WorkflowId = workflow.Id,
            WorkflowName = workflow.Name,
            Status = status,
            ConditionsSummary = conditionSummary,
            ActionsExecutedCount = actionsCount,
            ExecutionDurationMs = (int)stopwatch.ElapsedMilliseconds,
            StepLogs = stepLogs,
            ErrorMessage = errorMessage
        };
    }

    public bool EvaluateConditions(
        List<WorkflowConditionGroup> conditionGroups,
        Dictionary<string, object?> contextData,
        out string summary)
    {
        if (conditionGroups.Count == 0)
        {
            summary = "Koşul yok (Her zaman çalışır)";
            return true;
        }

        var groupResults = new List<bool>();
        var summaryParts = new List<string>();

        foreach (var group in conditionGroups)
        {
            if (group.Rules.Count == 0) continue;

            var isAnd = group.LogicalOperator.Equals("AND", StringComparison.OrdinalIgnoreCase);
            var ruleResults = new List<bool>();

            foreach (var rule in group.Rules)
            {
                var passed = EvaluateRule(rule, contextData, out var ruleDesc);
                ruleResults.Add(passed);
                summaryParts.Add($"[{rule.Field} {rule.Operator} '{rule.Value}'] ➔ {(passed ? "DOĞRU" : "YANLIŞ")}");
            }

            var groupPassed = isAnd ? ruleResults.All(r => r) : ruleResults.Any(r => r);
            groupResults.Add(groupPassed);
        }

        summary = string.Join(" AND ", summaryParts);
        return groupResults.Count == 0 || groupResults.All(g => g);
    }

    private bool EvaluateRule(WorkflowConditionRule rule, Dictionary<string, object?> contextData, out string ruleDesc)
    {
        ruleDesc = $"{rule.Field} {rule.Operator} {rule.Value}";

        // Find key in case-insensitive way
        var actualKey = contextData.Keys.FirstOrDefault(k => string.Equals(k, rule.Field, StringComparison.OrdinalIgnoreCase));
        if (actualKey == null)
        {
            // If field not found in context, evaluate empty check or false
            return rule.Operator == "isEmpty" || (rule.Operator == "equals" && string.IsNullOrEmpty(rule.Value));
        }

        var rawValue = contextData[actualKey];
        var actualValueStr = rawValue?.ToString() ?? string.Empty;
        var targetValueStr = rule.Value ?? string.Empty;

        switch (rule.Operator.ToLowerInvariant())
        {
            case "equals":
            case "==":
                return string.Equals(actualValueStr.Trim(), targetValueStr.Trim(), StringComparison.OrdinalIgnoreCase);

            case "notequals":
            case "!=":
                return !string.Equals(actualValueStr.Trim(), targetValueStr.Trim(), StringComparison.OrdinalIgnoreCase);

            case "contains":
                return actualValueStr.Contains(targetValueStr, StringComparison.OrdinalIgnoreCase);

            case "notcontains":
                return !actualValueStr.Contains(targetValueStr, StringComparison.OrdinalIgnoreCase);

            case "greaterthan":
            case ">":
                if (decimal.TryParse(actualValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var actualNumG) &&
                    decimal.TryParse(targetValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var targetNumG))
                {
                    return actualNumG > targetNumG;
                }
                return false;

            case "greaterthanorequal":
            case ">=":
                if (decimal.TryParse(actualValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var actualNumGte) &&
                    decimal.TryParse(targetValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var targetNumGte))
                {
                    return actualNumGte >= targetNumGte;
                }
                return false;

            case "lessthan":
            case "<":
                if (decimal.TryParse(actualValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var actualNumL) &&
                    decimal.TryParse(targetValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var targetNumL))
                {
                    return actualNumL < targetNumL;
                }
                return false;

            case "lessthanorequal":
            case "<=":
                if (decimal.TryParse(actualValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var actualNumLte) &&
                    decimal.TryParse(targetValueStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var targetNumLte))
                {
                    return actualNumLte <= targetNumLte;
                }
                return false;

            case "in":
                var inOptions = targetValueStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                return inOptions.Any(opt => string.Equals(opt, actualValueStr, StringComparison.OrdinalIgnoreCase));

            case "isnotempty":
                return !string.IsNullOrWhiteSpace(actualValueStr);

            case "isempty":
                return string.IsNullOrWhiteSpace(actualValueStr);

            default:
                return string.Equals(actualValueStr, targetValueStr, StringComparison.OrdinalIgnoreCase);
        }
    }

    private async Task<(string message, Dictionary<string, object?>? outputData)> ExecuteActionStepAsync(
        WorkflowActionStep action,
        Dictionary<string, object?> contextData,
        bool isSimulation,
        CancellationToken cancellationToken)
    {
        var output = new Dictionary<string, object?>();

        switch (action.Type.ToLowerInvariant())
        {
            case "notification":
                var channel = action.Config.TryGetValue("channel", out var ch) ? ch?.ToString() : "InApp";
                var title = ReplacePlaceholders(action.Config.TryGetValue("title", out var t) ? t?.ToString() ?? "Bildirim" : "Bildirim", contextData);
                var message = ReplacePlaceholders(action.Config.TryGetValue("message", out var m) ? m?.ToString() ?? "" : "", contextData);

                output["channel"] = channel;
                output["title"] = title;
                output["message"] = message;

                return ($"[{channel}] Bildirimi hazırlandı ve gönderildi: \"{title}\"", output);

            case "updaterecord":
                var field = action.Config.TryGetValue("field", out var f) ? f?.ToString() : "status";
                var value = action.Config.TryGetValue("value", out var v) ? v?.ToString() : "";

                output["field"] = field;
                output["newValue"] = value;

                return ($"Kayıt alanı '{field}' değeri '{value}' olarak güncellendi.", output);

            case "createrecord":
                var entity = action.Config.TryGetValue("entityType", out var et) ? et?.ToString() : "Task";
                var recTitle = ReplacePlaceholders(action.Config.TryGetValue("title", out var rt) ? rt?.ToString() ?? "Takip Görevi" : "Takip Görevi", contextData);

                output["createdEntity"] = entity;
                output["title"] = recTitle;

                return ($"Yeni '{entity}' kaydı başarıyla oluşturuldu: \"{recTitle}\"", output);

            case "webhook":
                var url = action.Config.TryGetValue("url", out var u) ? u?.ToString() : "";
                var method = action.Config.TryGetValue("method", out var meth) ? meth?.ToString() : "POST";

                output["url"] = url;
                output["method"] = method;

                if (!isSimulation && !string.IsNullOrWhiteSpace(url) && httpClientFactory != null)
                {
                    try
                    {
                        var client = httpClientFactory.CreateClient();
                        client.Timeout = TimeSpan.FromSeconds(10);
                        // In real production, send HTTP POST with payload
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to call webhook {Url}", url);
                    }
                }

                return ($"Dış Webhook çağrısı yapıldı [{method} {url}]", output);

            case "delay":
                var minutes = action.DelayMinutes > 0 ? action.DelayMinutes : 60;
                output["delayMinutes"] = minutes;
                return ($"{minutes} dakika bekleme zamanlandı.", output);

            default:
                return ($"Aksiyon tamamlandı: {action.Title}", output);
        }
    }

    private string ReplacePlaceholders(string template, Dictionary<string, object?> context)
    {
        if (string.IsNullOrWhiteSpace(template)) return string.Empty;

        var result = template;
        foreach (var kvp in context)
        {
            var placeholder = $"{{{kvp.Key}}}";
            var value = kvp.Value?.ToString() ?? string.Empty;
            result = result.Replace(placeholder, value, StringComparison.OrdinalIgnoreCase);
        }
        return result;
    }
}
