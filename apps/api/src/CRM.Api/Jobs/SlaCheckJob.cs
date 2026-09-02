using CRM.BuildingBlocks.Realtime;
using CRM.Modules.Customers.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Quartz;

namespace CRM.Api.Jobs;

[DisallowConcurrentExecution]
public class SlaCheckJob(
    IServiceScopeFactory scopeFactory,
    ICrmNotificationService notificationService,
    ILogger<SlaCheckJob> logger) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        logger.LogInformation("Running SlaCheckJob at {Time}", DateTime.UtcNow);

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CustomersDbContext>();

            var now = DateTime.UtcNow;
            var breachedDeals = await db.Deals
                .IgnoreQueryFilters()
                .Where(d => d.Status == "Open" && d.SlaDueDate.HasValue && d.SlaDueDate.Value < now)
                .ToListAsync(context.CancellationToken);

            if (breachedDeals.Count == 0)
            {
                return;
            }

            foreach (var deal in breachedDeals)
            {
                deal.UpdatedAt = now;

                await notificationService.SendNotificationAsync(
                    deal.TenantId,
                    deal.AssignedUserId,
                    "⚠️ SLA Süresi Aşıldı!",
                    $"'{deal.Title}' fırsatının aşama süresi (SLA) doldu. Lütfen ilgilenin.",
                    $"/pipelines",
                    "error",
                    context.CancellationToken);
            }

            await db.SaveChangesAsync(context.CancellationToken);
            logger.LogWarning("SlaCheckJob completed: {Count} deals flagged for SLA breach.", breachedDeals.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred during SlaCheckJob execution.");
        }
    }
}
