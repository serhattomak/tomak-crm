using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.BuildingBlocks.Realtime;

public static class RealtimeExtensions
{
    public static IServiceCollection AddCrmRealtime(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSignalR(options =>
        {
            options.EnableDetailedErrors = true;
            options.KeepAliveInterval = TimeSpan.FromSeconds(15);
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
        });

        services.AddSingleton<ICrmNotificationService, SignalRNotificationService>();

        return services;
    }
}
