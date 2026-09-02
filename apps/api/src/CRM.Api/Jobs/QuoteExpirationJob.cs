using CRM.BuildingBlocks.Realtime;
using CRM.Modules.Orders.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Quartz;

namespace CRM.Api.Jobs;

[DisallowConcurrentExecution]
public class QuoteExpirationJob(
    IServiceScopeFactory scopeFactory,
    ICrmNotificationService notificationService,
    ILogger<QuoteExpirationJob> logger) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        logger.LogInformation("Running QuoteExpirationJob at {Time}", DateTime.UtcNow);

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<OrdersDbContext>();

            var now = DateTime.UtcNow;
            var expiredQuotes = await db.Quotes
                .IgnoreQueryFilters()
                .Where(q => q.Status == "Sent" && q.ValidUntil.HasValue && q.ValidUntil.Value < now)
                .ToListAsync(context.CancellationToken);

            if (expiredQuotes.Count == 0)
            {
                logger.LogInformation("QuoteExpirationJob completed: No expired quotes found.");
                return;
            }

            foreach (var quote in expiredQuotes)
            {
                quote.Status = "Expired";
                quote.UpdatedAt = now;

                await notificationService.SendNotificationAsync(
                    quote.TenantId,
                    quote.AssignedUserId,
                    "Teklif Süresi Doldu",
                    $"{quote.QuoteNumber} ({quote.Title}) numaralı teklifin geçerlilik süresi dolmuştur.",
                    $"/quotes/{quote.Id}",
                    "warning",
                    context.CancellationToken);
            }

            await db.SaveChangesAsync(context.CancellationToken);
            logger.LogInformation("QuoteExpirationJob completed: {Count} quotes marked as Expired.", expiredQuotes.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred during QuoteExpirationJob execution.");
        }
    }
}
