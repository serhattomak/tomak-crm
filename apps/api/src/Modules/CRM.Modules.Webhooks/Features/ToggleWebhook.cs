using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Webhooks.Data;
using CRM.Modules.Webhooks.Dtos;
using CRM.Modules.Webhooks.Entities;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Webhooks.Features;

public record ToggleWebhookCommand(Guid Id, bool? IsActive = null) : ICommand<WebhookEndpointDto>;

public class ToggleWebhookHandler(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<ToggleWebhookCommand, WebhookEndpointDto>
{
    public async Task<Result<WebhookEndpointDto>> Handle(ToggleWebhookCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WebhookEndpointDto>(Error.Unauthorized);
        }

        WebhookEndpoint? endpoint = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);

        if (endpoint == null)
        {
            return Result.Failure<WebhookEndpointDto>(Error.NotFound);
        }

        if (endpoint.TenantId != currentTenant.Id.Value)
        {
            return Result.Failure<WebhookEndpointDto>(Error.NotFound);
        }

        endpoint.IsActive = request.IsActive ?? !endpoint.IsActive;
        endpoint.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        WebhookEndpointDto dto = new WebhookEndpointDto
        {
            Id = endpoint.Id,
            TenantId = endpoint.TenantId,
            Name = endpoint.Name,
            Url = endpoint.Url,
            Events = endpoint.Events ?? [],
            IsActive = endpoint.IsActive,
            Description = endpoint.Description,
            CreatedAt = endpoint.CreatedAt,
            UpdatedAt = endpoint.UpdatedAt,
            Secret = null,
            SecretMasked = GetMaskedSecret(endpoint.SecretEncrypted)
        };

        return Result.Success(dto);
    }

    private static string? GetMaskedSecret(string? encryptedSecret)
    {
        if (string.IsNullOrEmpty(encryptedSecret))
        {
            return null;
        }

        string plaintext = WebhookEndpoint.DecryptSecret(encryptedSecret);
        if (string.IsNullOrEmpty(plaintext))
        {
            return null;
        }

        if (plaintext.Length <= 4)
        {
            return plaintext;
        }

        string lastFour = plaintext[^4..];
        return $"****{lastFour}";
    }
}

public class ToggleWebhookEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/webhooks/{id:guid}/toggle", async (Guid id, ToggleWebhookCommand? body, ISender sender, CancellationToken ct) =>
        {
            ToggleWebhookCommand command = new ToggleWebhookCommand(id, body?.IsActive);
            Result<WebhookEndpointDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<WebhookEndpointDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<WebhookEndpointDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("ToggleWebhook")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.Manage");
    }
}
