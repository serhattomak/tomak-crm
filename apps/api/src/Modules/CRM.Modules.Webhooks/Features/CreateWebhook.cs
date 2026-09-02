using CRM.BuildingBlocks.CQRS;
using CRM.BuildingBlocks.Endpoints;
using CRM.BuildingBlocks.Security;
using CRM.BuildingBlocks.Tenancy;
using CRM.Modules.Webhooks.Data;
using CRM.Modules.Webhooks.Dtos;
using CRM.Modules.Webhooks.Entities;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace CRM.Modules.Webhooks.Features;

public record CreateWebhookCommand(
    string Name,
    string Url,
    string[] Events,
    string? Description = null,
    bool IsActive = true,
    string? Secret = null
) : ICommand<WebhookEndpointDto>;

public class CreateWebhookValidator : AbstractValidator<CreateWebhookCommand>
{
    public CreateWebhookValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Webhook adı boş bırakılamaz.")
            .MaximumLength(255).WithMessage("Webhook adı en fazla 255 karakter olabilir.");

        RuleFor(x => x.Url)
            .NotEmpty().WithMessage("Url boş bırakılamaz.")
            .Must(BeValidHttpsUrl).WithMessage("Url geçerli bir https adresi olmalıdır (örn. https://example.com/hook).");

        RuleFor(x => x.Events)
            .NotEmpty().WithMessage("En az bir event seçilmelidir.")
            .Must(BeValidEvents).WithMessage($"Events izin verilen değerlerin alt kümesi olmalıdır: {string.Join(", ", WebhookEventTypes.All)}");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Açıklama en fazla 1000 karakter olabilir.")
            .When(x => x.Description != null);
    }

    private static bool BeValidHttpsUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        bool isValid = Uri.TryCreate(url.Trim(), UriKind.Absolute, out Uri? uri);
        return isValid && uri != null && uri.Scheme == Uri.UriSchemeHttps;
    }

    private static bool BeValidEvents(string[] events)
    {
        if (events == null || events.Length == 0)
        {
            return false;
        }

        HashSet<string> allowed = new HashSet<string>(WebhookEventTypes.All, StringComparer.Ordinal);
        foreach (string ev in events)
        {
            if (string.IsNullOrWhiteSpace(ev) || !allowed.Contains(ev))
            {
                return false;
            }
        }

        return true;
    }
}

public class CreateWebhookHandler(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<CreateWebhookCommand, WebhookEndpointDto>
{
    public async Task<Result<WebhookEndpointDto>> Handle(CreateWebhookCommand request, CancellationToken cancellationToken)
    {
        if (!currentTenant.Id.HasValue)
        {
            return Result.Failure<WebhookEndpointDto>(Error.Unauthorized);
        }

        // Generate secret if not provided; 32-byte base64 via entity helper
        string plaintextSecret = string.IsNullOrWhiteSpace(request.Secret)
            ? WebhookEndpoint.GenerateSecret(32)
            : request.Secret.Trim();

        string encryptedSecret = WebhookEndpoint.EncryptSecret(plaintextSecret);

        WebhookEndpoint endpoint = new WebhookEndpoint
        {
            TenantId = currentTenant.Id.Value,
            Name = request.Name.Trim(),
            Url = request.Url.Trim(),
            Events = request.Events,
            IsActive = request.IsActive,
            Description = request.Description?.Trim(),
            SecretEncrypted = encryptedSecret,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.WebhookEndpoints.Add(endpoint);
        await dbContext.SaveChangesAsync(cancellationToken);

        WebhookEndpointDto dto = new WebhookEndpointDto
        {
            Id = endpoint.Id,
            TenantId = endpoint.TenantId,
            Name = endpoint.Name,
            Url = endpoint.Url,
            Events = endpoint.Events,
            IsActive = endpoint.IsActive,
            Description = endpoint.Description,
            CreatedAt = endpoint.CreatedAt,
            UpdatedAt = endpoint.UpdatedAt,
            Secret = plaintextSecret,
            SecretMasked = MaskSecret(plaintextSecret)
        };

        return Result.Success(dto);
    }

    private static string? MaskSecret(string secret)
    {
        if (string.IsNullOrEmpty(secret))
        {
            return null;
        }

        if (secret.Length <= 4)
        {
            return secret;
        }

        string lastFour = secret[^4..];
        return $"****{lastFour}";
    }
}

public class CreateWebhookEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/webhooks", async (CreateWebhookCommand command, ISender sender, CancellationToken ct) =>
        {
            Result<WebhookEndpointDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Created($"/api/webhooks/{result.Value.Id}", ApiResponse<WebhookEndpointDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<WebhookEndpointDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("CreateWebhook")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.Create");
    }
}
