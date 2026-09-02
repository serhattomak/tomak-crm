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
using Microsoft.EntityFrameworkCore;

namespace CRM.Modules.Webhooks.Features;

public record UpdateWebhookCommand(
    Guid Id,
    string Name,
    string Url,
    string[] Events,
    string? Description,
    bool IsActive
) : ICommand<WebhookEndpointDto>;

public class UpdateWebhookValidator : AbstractValidator<UpdateWebhookCommand>
{
    public UpdateWebhookValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("Id boş olamaz.");

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

public class UpdateWebhookHandler(
    WebhooksDbContext dbContext,
    ICurrentTenant currentTenant) : ICommandHandler<UpdateWebhookCommand, WebhookEndpointDto>
{
    public async Task<Result<WebhookEndpointDto>> Handle(UpdateWebhookCommand request, CancellationToken cancellationToken)
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

        // Explicit tenant check in addition to HasQueryFilter for safety
        if (endpoint.TenantId != currentTenant.Id.Value)
        {
            return Result.Failure<WebhookEndpointDto>(Error.NotFound);
        }

        endpoint.Name = request.Name.Trim();
        endpoint.Url = request.Url.Trim();
        endpoint.Events = request.Events;
        endpoint.Description = request.Description?.Trim();
        endpoint.IsActive = request.IsActive;
        endpoint.UpdatedAt = DateTime.UtcNow;

        // Do not rotate secret — SecretEncrypted stays as-is

        await dbContext.SaveChangesAsync(cancellationToken);

        string? masked = GetMaskedSecret(endpoint.SecretEncrypted);

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
            Secret = null,
            SecretMasked = masked
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

public class UpdateWebhookEndpoint : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/webhooks/{id:guid}", async (Guid id, UpdateWebhookCommand command, ISender sender, CancellationToken ct) =>
        {
            if (id != command.Id)
            {
                command = command with { Id = id };
            }

            Result<WebhookEndpointDto> result = await sender.Send(command, ct);
            return result.IsSuccess
                ? Results.Ok(ApiResponse<WebhookEndpointDto>.Ok(result.Value))
                : Results.BadRequest(ApiResponse<WebhookEndpointDto>.Fail(result.Error.Code, result.Error.Description));
        })
        .WithName("UpdateWebhook")
        .WithTags("Webhooks")
        .RequirePermission("Webhooks.Manage");
    }
}
