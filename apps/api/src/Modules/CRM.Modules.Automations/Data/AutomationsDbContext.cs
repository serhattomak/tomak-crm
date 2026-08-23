using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Automations.Entities;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Automations.Data;

public class AutomationsDbContext(
    DbContextOptions<AutomationsDbContext> options,
    ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<AutomationWorkflow> Workflows => Set<AutomationWorkflow>();
    public DbSet<AutomationExecution> Executions => Set<AutomationExecution>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. AutomationWorkflow
        modelBuilder.Entity<AutomationWorkflow>(entity =>
        {
            entity.ToTable("automation_workflows");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Icon).HasColumnName("icon").HasMaxLength(50);
            entity.Property(e => e.Color).HasColumnName("color").HasMaxLength(50);
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(e => e.TriggerType).HasColumnName("trigger_type").HasMaxLength(100).IsRequired();
            entity.Property(e => e.TriggerConfigJson).HasColumnName("trigger_config").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.ConditionsJson).HasColumnName("conditions").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.ActionsJson).HasColumnName("actions").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.ExecutionCount).HasColumnName("execution_count");
            entity.Property(e => e.LastExecutedAt).HasColumnName("last_executed_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Executions)
                .WithOne(ex => ex.Workflow)
                .HasForeignKey(ex => ex.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });

        // 2. AutomationExecution
        modelBuilder.Entity<AutomationExecution>(entity =>
        {
            entity.ToTable("automation_executions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id").IsRequired();
            entity.Property(e => e.WorkflowName).HasColumnName("workflow_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.TriggerSource).HasColumnName("trigger_source").HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasColumnName("entity_type").HasMaxLength(50);
            entity.Property(e => e.EntityId).HasColumnName("entity_id").HasMaxLength(100);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.EvaluatedConditionsSummary).HasColumnName("evaluated_conditions_summary");
            entity.Property(e => e.ActionsExecutedCount).HasColumnName("actions_executed_count");
            entity.Property(e => e.ExecutionDurationMs).HasColumnName("execution_duration_ms");
            entity.Property(e => e.StepLogsJson).HasColumnName("step_logs").HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasQueryFilter(e => !currentTenant.Id.HasValue || e.TenantId == currentTenant.Id.Value);
        });
    }
}
