using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CRM.BuildingBlocks.Messaging;

public interface IIntegrationEvent
{
    Guid EventId { get; }
    DateTime OccurredOn { get; }
}

public record RolePermissionsUpdatedIntegrationEvent(
    Guid TenantId,
    Guid RoleId,
    Guid EventId,
    DateTime OccurredOn) : IIntegrationEvent;

public record UserRolesChangedIntegrationEvent(
    Guid TenantId,
    Guid UserId,
    Guid EventId,
    DateTime OccurredOn) : IIntegrationEvent;

public record TenantCreatedIntegrationEvent(
    Guid TenantId,
    string Name,
    string Slug,
    Guid OwnerUserId,
    Guid EventId,
    DateTime OccurredOn) : IIntegrationEvent;

public static class MessagingExtensions
{
    public static IServiceCollection AddMessaging(
        this IServiceCollection services,
        IConfiguration configuration,
        Action<IBusRegistrationConfigurator>? configureConsumers = null)
    {
        services.AddMassTransit(x =>
        {
            x.SetKebabCaseEndpointNameFormatter();

            configureConsumers?.Invoke(x);

            x.UsingRabbitMq((context, cfg) =>
            {
                var host = configuration["RabbitMq:Host"] ?? "localhost";
                var port = ushort.TryParse(configuration["RabbitMq:Port"], out var p) ? p : (ushort)5672;
                var user = configuration["RabbitMq:Username"] ?? "guest";
                var pass = configuration["RabbitMq:Password"] ?? "guest";

                cfg.Host(host, port, "/", h =>
                {
                    h.Username(user);
                    h.Password(pass);
                });

                cfg.ConfigureEndpoints(context);
            });
        });

        return services;
    }
}
