using CRM.BuildingBlocks.Realtime;
using CRM.Modules.Email.Data;
using CRM.Modules.Email.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CRM.Modules.Email.Services;

/// <summary>
/// Background polling service that periodically queries active generic IMAP accounts,
/// fetches new unseen messages, persists them, and triggers SignalR real-time notifications.
/// </summary>
public sealed class EmailSyncJob(
    IServiceScopeFactory scopeFactory,
    ILogger<EmailSyncJob> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("EmailSyncJob background service started (interval: {Interval})", PollInterval);

        // Initial delay to allow application startup
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncAllActiveAccountsAsync(stoppingToken);
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unexpected error in EmailSyncJob execution cycle");
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        logger.LogInformation("EmailSyncJob background service stopped");
    }

    private async Task SyncAllActiveAccountsAsync(CancellationToken cancellationToken)
    {
        using IServiceScope scope = scopeFactory.CreateScope();
        EmailDbContext db = scope.ServiceProvider.GetRequiredService<EmailDbContext>();
        IEmailService emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        ICrmNotificationService notificationService = scope.ServiceProvider.GetRequiredService<ICrmNotificationService>();

        List<EmailAccount> activeAccounts = await db.Accounts
            .IgnoreQueryFilters()
            .Where(a => a.IsActive && a.Provider == "generic_imap" && !string.IsNullOrEmpty(a.ImapHost))
            .ToListAsync(cancellationToken);

        if (activeAccounts.Count == 0)
        {
            return;
        }

        logger.LogDebug("EmailSyncJob checking {Count} active accounts", activeAccounts.Count);

        foreach (EmailAccount account in activeAccounts)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                IReadOnlyList<EmailMessage> fetched = await emailService.FetchInboundAsync(account, cancellationToken);
                if (fetched.Count == 0)
                {
                    continue;
                }

                int newCount = 0;
                foreach (EmailMessage message in fetched)
                {
                    bool exists = await db.Messages
                        .IgnoreQueryFilters()
                        .AnyAsync(m => m.AccountId == account.Id && m.ExternalId == message.ExternalId, cancellationToken);

                    if (exists)
                    {
                        continue;
                    }

                    db.Messages.Add(message);
                    await db.SaveChangesAsync(cancellationToken);
                    newCount++;

                    // Push real-time event to tenant SignalR group
                    await notificationService.SendToTenantAsync(
                        account.TenantId,
                        "ReceiveEmail",
                        new
                        {
                            accountId = account.Id,
                            messageId = message.Id,
                            threadId = message.ThreadId,
                            fromAddress = message.FromAddress,
                            subject = message.Subject,
                            createdAt = message.CreatedAt
                        },
                        cancellationToken);

                    // Push bell notification
                    await notificationService.SendNotificationAsync(
                        account.TenantId,
                        null,
                        $"Yeni E-posta: {message.Subject}",
                        $"{message.FromAddress} adresinden yeni bir e-posta alındı.",
                        $"/email",
                        "info",
                        cancellationToken);
                }

                if (newCount > 0)
                {
                    logger.LogInformation("Saved {Count} new inbound emails for account {AccountId} ({Email})",
                        newCount, account.Id, account.Email);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to sync emails for account {AccountId} ({Email})", account.Id, account.Email);
            }
        }
    }
}
